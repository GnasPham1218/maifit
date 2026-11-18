#!/usr/bin/env python3
"""
collect_image.py - fetch N images per preparation via icrawler (Bing engine).

Key features:
  * Resume-safe: counts files already on disk and only fetches what's missing.
  * Deduplication: MD5 of each file, so re-runs never add duplicates even
    when Bing reorders results between runs.
  * Human-like pacing: --delay is jittered +/-30% between queries.
  * Built-in log file: --log crawl_log.txt writes UTF-8 output without
    needing Tee-Object or PowerShell encoding hacks.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import random
import re
import shutil
import sys
import tempfile
import time
from pathlib import Path

try:
    from icrawler.builtin import BingImageCrawler
except ImportError:
    print("error: icrawler is not installed. Run:  pip install icrawler")
    sys.exit(1)

# Silence icrawler's chatty logger.
logging.getLogger("icrawler").setLevel(logging.WARNING)

PREP_VI_KEYWORDS = {
    "RAW":     ["sống", "khô", "hạt"],
    "BOILED":  ["luộc", "chín"],
    "STEAMED": ["hấp"],
    "FRIED":   ["chiên", "rán"],
    "BRAISED": ["kho", "rim"],
    "GRILLED": ["nướng"],
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in [
        ("àáạảãâầấậẩẫăằắặẳẵ", "a"),
        ("èéẹẻẽêềếệểễ", "e"),
        ("ìíịỉĩ", "i"),
        ("òóọỏõôồốộổỗơờớợởỡ", "o"),
        ("ùúụủũưừứựửữ", "u"),
        ("ỳýỵỷỹ", "y"),
        ("đ", "d"),
    ]:
        for ch in src:
            text = text.replace(ch, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def build_queries(food: dict, prep: dict) -> list[str]:
    """Ordered, deduped queries. Plain aliases first, English last."""
    name = food["name"]
    kws = PREP_VI_KEYWORDS.get(prep["preparation"], [])
    qs: list[str] = []
    qs.extend(prep.get("aliases", [])[:2])
    qs.extend(prep.get("locking_aliases", [])[:1])
    if not qs:
        qs.append(name)
    for kw in kws[:1]:
        qs.append(f"{name} {kw}")
    if prep.get("source_description"):
        qs.append(prep["source_description"])

    seen, out = set(), []
    for q in qs:
        q = q.strip()
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out


def _human_sleep(base: float, jitter: float = 0.3) -> None:
    if base <= 0:
        return
    lo = max(0.1, base * (1.0 - jitter))
    hi = base * (1.0 + jitter)
    time.sleep(random.uniform(lo, hi))


def _file_hash(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _existing_hashes(prep_dir: Path) -> set[str]:
    hashes: set[str] = set()
    for p in prep_dir.iterdir():
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        try:
            hashes.add(_file_hash(p))
        except OSError:
            continue
    return hashes


def make_bing_crawler(root_dir: str, download_threads: int):
    return BingImageCrawler(
        storage={"root_dir": root_dir},
        feeder_threads=1,
        parser_threads=1,
        downloader_threads=max(1, download_threads),
    )


# --------------------------------------------------------------------------- #
# Log file setup
# --------------------------------------------------------------------------- #

class _TeeStream:
    """Write to multiple streams at once (console + file)."""

    def __init__(self, *streams):
        self.streams = streams

    def write(self, data):
        for s in self.streams:
            try:
                s.write(data)
            except Exception:
                pass
        return len(data) if data else 0

    def flush(self):
        for s in self.streams:
            try:
                s.flush()
            except Exception:
                pass

    def isatty(self):
        return any(getattr(s, "isatty", lambda: False)() for s in self.streams)


def setup_log_file(path: str) -> None:
    """Mirror stdout/stderr to a UTF-8 log file, and force UTF-8 on console.

    This replaces `python ... | Tee-Object`, which breaks on Windows because
    PowerShell encodes the pipe using cp1252 instead of UTF-8.
    """
    # Force UTF-8 on the real console streams before wrapping them.
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name)
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    log_fh = open(path, "w", encoding="utf-8", buffering=1)  # line-buffered
    sys.stdout = _TeeStream(sys.stdout, log_fh)
    sys.stderr = _TeeStream(sys.stderr, log_fh)


# --------------------------------------------------------------------------- #
# Core collection
# --------------------------------------------------------------------------- #

def collect_prep(food, prep, prep_dir, limit, delay, min_size,
                 download_threads) -> tuple[int, int]:
    """Return (newly_downloaded, total_after_run)."""
    code = prep["preparation"]

    existing_files = [
        p for p in prep_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]
    existing = len(existing_files)

    if existing >= limit:
        print(f"    {code}: {existing}/{limit} already on disk, skip")
        return 0, existing

    print(f"    {code}: {existing}/{limit} on disk, "
          f"need {limit - existing} more")

    existing_hashes = _existing_hashes(prep_dir)
    queries = build_queries(food, prep)
    collected = 0

    for qi, query in enumerate(queries, 1):
        if existing + collected >= limit:
            break

        want = limit - existing - collected
        print(f"      query {qi}/{len(queries)}: {query!r} (need {want})")

        with tempfile.TemporaryDirectory(prefix="icrawler_") as tmp:
            try:
                crawler = make_bing_crawler(tmp, download_threads)
                kwargs = {"keyword": query, "max_num": want}
                if min_size:
                    kwargs["min_size"] = min_size
                crawler.crawl(**kwargs)
            except Exception as exc:
                print(f"      icrawler error: {type(exc).__name__}: {exc}")
                _human_sleep(delay)
                continue

            files = sorted(p for p in Path(tmp).iterdir() if p.is_file())
            moved = 0
            for img in files:
                if existing + collected >= limit:
                    break
                if img.suffix.lower() not in IMAGE_EXTS:
                    continue
                if img.stat().st_size < 2048:
                    continue

                h = _file_hash(img)
                if h in existing_hashes:
                    continue

                idx = existing + collected + 1
                dest = prep_dir / f"{idx:06d}{img.suffix.lower()}"
                shutil.copy2(img, dest)
                existing_hashes.add(h)
                collected += 1
                moved += 1
                size_kb = img.stat().st_size // 1024
                print(f"        saved {dest.name} ({size_kb} KB)")

            if moved == 0:
                print(f"      no new unique images from this query")

        _human_sleep(delay)

    total = existing + collected
    if total < limit:
        print(f"    {code}: WARNING {total}/{limit} "
              f"(run the same command again to fetch more)")
    else:
        print(f"    {code}: OK {total}/{limit}")
    return collected, total


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #

def summarize(out_root: Path, limit: int) -> list[tuple[str, str, int]]:
    short: list[tuple[str, str, int]] = []
    if not out_root.exists():
        return short
    print("\n=== Summary ===")
    for food_dir in sorted(out_root.iterdir()):
        if not food_dir.is_dir():
            continue
        for prep_dir in sorted(food_dir.iterdir()):
            if not prep_dir.is_dir():
                continue
            n = sum(1 for p in prep_dir.iterdir()
                    if p.suffix.lower() in IMAGE_EXTS)
            status = "OK" if n >= limit else "SHORT"
            print(f"  {food_dir.name}/{prep_dir.name}: {n}/{limit} [{status}]")
            if n < limit:
                short.append((food_dir.name, prep_dir.name, n))
    return short


def print_shortfall(short: list[tuple[str, str, int]], limit: int) -> None:
    if not short:
        return
    print(f"\n=== {len(short)} preparations short of {limit} ===")
    for slug, code, n in short:
        print(f"  {slug}/{code}: {n}/{limit}")
    print("\nTip: run the same command again - the script resumes and "
          "only fetches what's missing. Add --delay 6 if you got blocked.")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--input", default="food_data_reviewed.json")
    ap.add_argument("--out", default="images")
    ap.add_argument("--limit", type=int, default=15,
                    help="target images per preparation (default 15)")
    ap.add_argument("--only", default=None,
                    help="only process foods whose name contains this substring")
    ap.add_argument("--delay", type=float, default=3.0,
                    help="seconds between queries, jittered +/-30%% "
                         "(default 3.0, raise to 6-10 if you get blocked)")
    ap.add_argument("--download-threads", type=int, default=2,
                    help="parallel HTTP connections per crawl "
                         "(default 2; use 1 for maximum caution)")
    ap.add_argument("--min-size", type=int, default=0,
                    help="reject images smaller than MINxMIN pixels "
                         "(0 = no filter; try 400 to avoid low-res results)")
    ap.add_argument("--log", default=None,
                    help="also write a UTF-8 log file to this path "
                         "(e.g. --log crawl_log.txt)")
    args = ap.parse_args()

    # Set up logging BEFORE any print(), so the very first line is captured.
    if args.log:
        setup_log_file(args.log)
        print(f"[log] writing to {args.log}")

    foods = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)
    only = args.only.lower() if args.only else None
    min_size = (args.min_size, args.min_size) if args.min_size else None

    started = time.time()
    interrupted = False
    try:
        total = len(foods)
        for fi, food in enumerate(foods, 1):
            if only and only not in food["name"].lower():
                continue
            slug = f"{fi:03d}-{slugify(food['name'])}"
            food_dir = out_root / slug
            print(f"\n[{fi}/{total}] {food['name']} "
                  f"({food.get('category', '')})")
            for prep in food["preparations"]:
                prep_dir = food_dir / prep["preparation"]
                prep_dir.mkdir(parents=True, exist_ok=True)
                collect_prep(food, prep, prep_dir,
                             args.limit, args.delay,
                             min_size, args.download_threads)
    except KeyboardInterrupt:
        interrupted = True
        print("\ninterrupted by user")

    short = summarize(out_root, args.limit)
    print_shortfall(short, args.limit)

    elapsed = time.time() - started
    print(f"\nElapsed: {elapsed:.1f}s")

    if interrupted:
        return 130
    return 0 if not short else 1


if __name__ == "__main__":
    sys.exit(main())