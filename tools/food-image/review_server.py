#!/usr/bin/env python3
"""
review_server.py - a small Flask UI to review downloaded food images,
pick the final set per preparation, choose one main image per food,
reject bad images and add new ones by drag and drop.

Usage:
    python review_server.py                          # http://127.0.0.1:5000
    python review_server.py --target 6               # max picks per preparation
    python review_server.py --out ../../frontend/public/foods

Data files (next to this script):
    food_data_reviewed.json   foods and their preparations (input, read-only)
    images/<NNN-slug>/<PREP>/ downloaded images
    images/_rejected/...      rejected images (moved here, never deleted)
    selections.json           {food_slug: {PREP: [image, ...]}}  (click order)
    main_images.json          {food_slug: "PREP/image"}
    rejected.json             {food_slug: {PREP: [image, ...]}}  (for the downloader)
    sources.json              {"food_slug/PREP/image": {...}}     (origin of added images)
    .thumbs/                  thumbnail cache, safe to delete

Finalize writes, for each food:
    <out>/<name-slug>/<prep>-NN.webp   resized images, main image first
    <out>/<name-slug>/manifest.json    file list, preparation, primary flag, source
    <out>/manifest.json                all foods combined
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import tempfile
import threading
from pathlib import Path

from flask import (Flask, abort, jsonify, render_template_string, request,
                   send_file)
from PIL import Image, ImageOps, UnidentifiedImageError

BASE = Path(__file__).resolve().parent
IMAGES = BASE / "images"
REJECTED_DIR = IMAGES / "_rejected"
THUMBS = BASE / ".thumbs"
FOODS_JSON = BASE / "food_data_reviewed.json"
SEL_JSON = BASE / "selections.json"
MAIN_JSON = BASE / "main_images.json"
REJ_JSON = BASE / "rejected.json"
SRC_JSON = BASE / "sources.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
PREPS = ("RAW", "BOILED", "STEAMED", "FRIED", "BRAISED", "GRILLED")
PREP_LABELS = {
    "RAW": "Sống / tươi", "BOILED": "Luộc / hầm", "STEAMED": "Hấp",
    "FRIED": "Chiên", "BRAISED": "Kho", "GRILLED": "Nướng",
}
SLUG_RE = re.compile(r"\d{3}-[a-z0-9-]+")

THUMB_SIZE = 320          # px, longest side of grid thumbnails
OUT_MAX_SIDE = 1024       # px, longest side of finalized images
OUT_QUALITY = 82          # WebP quality of finalized images
UPLOAD_MAX_BYTES = 25 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 60_000_000   # refuse decompression bombs

app = Flask(__name__)
app.config.update(
    TARGET_PER_PREP=6,
    OUT_DIR=BASE / "selected",
    MAX_CONTENT_LENGTH=200 * 1024 * 1024,
)

# One lock for every read-modify-write of the JSON state files, so two fast
# clicks can't overwrite each other.
_state_lock = threading.Lock()


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


@app.errorhandler(ApiError)
def _api_error(e: ApiError):
    return jsonify({"error": e.message}), e.status


# --------------------------------------------------------------------------- #
# Request guard
# --------------------------------------------------------------------------- #

@app.before_request
def _guard_post():
    """Block cross-site POSTs (CSRF) from other pages open in the browser.

    A custom header can't be sent cross-origin without a CORS preflight,
    and this server never answers preflights, so only our own page passes.
    """
    if request.method != "POST":
        return None
    if request.headers.get("X-Review-UI") != "1":
        return jsonify({"error": "missing X-Review-UI header"}), 403
    origin = request.headers.get("Origin")
    if origin and origin.rstrip("/") != request.host_url.rstrip("/"):
        return jsonify({"error": "cross-origin request refused"}), 403
    return None


# --------------------------------------------------------------------------- #
# JSON state helpers
# --------------------------------------------------------------------------- #

def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    """Write atomically: a crash mid-write never leaves a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2, sort_keys=True)
    os.replace(tmp, path)


# --------------------------------------------------------------------------- #
# Foods
# --------------------------------------------------------------------------- #

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[àáạảãâầấậẩẫăằắặẳẵ]", "a", text)
    text = re.sub(r"[èéẹẻẽêềếệểễ]", "e", text)
    text = re.sub(r"[ìíịỉĩ]", "i", text)
    text = re.sub(r"[òóọỏõôồốộổỗơờớợởỡ]", "o", text)
    text = re.sub(r"[ùúụủũưừứựửữ]", "u", text)
    text = re.sub(r"[ỳýỵỷỹ]", "y", text)
    text = re.sub(r"đ", "d", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


_foods_cache: dict = {"mtime": None, "foods": []}


def foods_index() -> list[dict]:
    """Foods with their folder slug (NNN-name) and output slug (name only).

    Cached until food_data_reviewed.json changes on disk.
    """
    mtime = FOODS_JSON.stat().st_mtime_ns
    if _foods_cache["mtime"] == mtime:
        return _foods_cache["foods"]
    raw = json.loads(FOODS_JSON.read_text(encoding="utf-8"))
    foods, seen = [], set()
    for i, food in enumerate(raw, 1):
        base = slugify(food["name"])
        name_slug, n = base, 2
        while name_slug in seen:          # never let two foods share an output folder
            name_slug, n = f"{base}-{n}", n + 1
        seen.add(name_slug)
        foods.append({
            "slug": f"{i:03d}-{base}",
            "name_slug": name_slug,
            "name": food["name"],
            "category": food.get("category", ""),
            "preps": [p["preparation"] for p in food.get("preparations", [])
                      if p.get("preparation") in PREPS],
        })
    _foods_cache.update(mtime=mtime, foods=foods)
    return foods


def get_food(slug) -> dict:
    if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
        raise ApiError("bad food slug")
    for food in foods_index():
        if food["slug"] == slug:
            return food
    raise ApiError("unknown food", 404)


def check_prep(food: dict, prep) -> str:
    if prep not in food["preps"]:
        raise ApiError("bad preparation")
    return prep


def check_name(img) -> str:
    """A bare image file name: no folders, no hidden files, known extension."""
    if (not isinstance(img, str) or not img or img != Path(img).name
            or img.startswith(".") or "\\" in img
            or Path(img).suffix.lower() not in IMAGE_EXTS):
        raise ApiError("bad image name")
    return img


def list_images(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    return sorted(
        p.name for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
        and not p.name.startswith(".") and p.stat().st_size > 0
    )


def food_state(food: dict, sel: dict, main: dict) -> dict:
    """Everything the page needs to draw one food."""
    slug = food["slug"]
    preps = []
    for code in food["preps"]:
        images = list_images(IMAGES / slug / code)
        present = set(images)
        preps.append({
            "code": code,
            "images": images,
            "selected": [i for i in sel.get(slug, {}).get(code, []) if i in present],
            "rejected": list_images(REJECTED_DIR / slug / code),
        })

    main_obj = None
    prep, _, img = main.get(slug, "").partition("/")
    for p in preps:
        if p["code"] == prep and img in p["selected"]:
            main_obj = {"prep": prep, "img": img}

    return {
        "slug": slug,
        "name": food["name"],
        "category": food["category"],
        "preps": preps,
        "main": main_obj,
        "exported": (app.config["OUT_DIR"] / food["name_slug"] / "manifest.json").exists(),
    }


def current_state(food: dict) -> dict:
    return food_state(food, read_json(SEL_JSON, {}), read_json(MAIN_JSON, {}))


# --------------------------------------------------------------------------- #
# Image helpers
# --------------------------------------------------------------------------- #

def open_image(src) -> Image.Image:
    """Open, apply EXIF rotation, and convert to RGB/RGBA (drops metadata)."""
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    return im.convert("RGBA" if has_alpha else "RGB")


def flatten(im: Image.Image) -> Image.Image:
    if im.mode != "RGBA":
        return im
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3])
    return bg


def save_atomic(im: Image.Image, dst: Path, fmt: str, **kw) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=dst.parent, suffix=".tmp")
    os.close(fd)
    im.save(tmp, fmt, **kw)
    os.replace(tmp, dst)


def image_path(kind: str, food_slug: str, prep: str, img: str) -> Path:
    """Path of an active ("img") or rejected ("rej") image, after validation."""
    if kind not in ("img", "rej") or not SLUG_RE.fullmatch(food_slug) or prep not in PREPS:
        abort(404)
    try:
        check_name(img)
    except ApiError:
        abort(404)
    root = IMAGES if kind == "img" else REJECTED_DIR
    return root / food_slug / prep / img


# --------------------------------------------------------------------------- #
# Page
# --------------------------------------------------------------------------- #

PAGE = r"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Duyệt ảnh món ăn</title>
<style>
  :root {
    --bg:#0e1014; --panel:#161a21; --panel2:#1d222b; --line:#2a303c;
    --text:#e7e9ee; --muted:#8a92a6; --accent:#3b82f6; --accent-soft:rgba(59,130,246,.15);
    --ok:#22c55e; --ok-soft:rgba(34,197,94,.14); --warn:#f59e0b; --warn-soft:rgba(245,158,11,.14);
    --danger:#ef4444; --gold:#facc15; --radius:14px;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  button { font:inherit; color:inherit; cursor:pointer; border:1px solid var(--line);
           background:var(--panel2); border-radius:9px; padding:.42rem .8rem; transition:background .15s,border-color .15s; }
  button:hover { border-color:#3a4252; background:#232935; }
  button.primary { background:var(--accent); border-color:var(--accent); color:#fff; font-weight:600; }
  button.primary:hover { background:#2f6fe0; }
  button.danger:hover { background:rgba(239,68,68,.15); border-color:var(--danger); color:#fca5a5; }
  button.ghost { background:transparent; border-color:transparent; color:var(--muted); }
  button.ghost:hover { color:var(--text); background:var(--panel2); }
  input, select { font:inherit; color:var(--text); background:var(--panel2); border:1px solid var(--line);
                  border-radius:9px; padding:.42rem .7rem; }
  input:focus, select:focus { outline:2px solid var(--accent); outline-offset:-1px; }

  /* top bar */
  .topbar { position:sticky; top:0; z-index:20; background:rgba(14,16,20,.88); backdrop-filter:blur(10px);
            border-bottom:1px solid var(--line); }
  .topbar-inner { max-width:1500px; margin:0 auto; padding:.8rem 1.5rem; display:flex; gap:.75rem;
                  align-items:center; flex-wrap:wrap; }
  .brand { font-weight:700; font-size:1.05rem; margin-right:.5rem; }
  .brand span { color:var(--accent); }
  .stats { color:var(--muted); margin-left:auto; display:flex; gap:1rem; align-items:center; }
  .stats b { color:var(--text); }
  .bar { width:140px; height:6px; border-radius:99px; background:var(--panel2); overflow:hidden; }
  .bar i { display:block; height:100%; background:var(--ok); width:0; transition:width .3s; }
  label.chk { display:flex; gap:.4rem; align-items:center; color:var(--muted); cursor:pointer; user-select:none; }

  main { max-width:1500px; margin:0 auto; padding:1.25rem 1.5rem 4rem; }
  .hint { color:var(--muted); font-size:.85rem; margin:0 0 1rem; }
  .hint kbd { background:var(--panel2); border:1px solid var(--line); border-radius:5px; padding:0 .35rem; font-size:.8rem; }

  /* food card */
  .food { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius);
          margin-bottom:1rem; content-visibility:auto; contain-intrinsic-size:auto 520px; }
  .food.done { border-color:rgba(34,197,94,.35); }
  .food-head { display:flex; align-items:center; gap:.9rem; padding:.85rem 1rem; cursor:pointer; }
  .food-main { width:52px; height:52px; border-radius:10px; overflow:hidden; flex:none;
               background:var(--panel2); border:2px dashed var(--line); display:grid; place-items:center;
               color:var(--muted); font-size:.65rem; text-align:center; }
  .food-main.has { border:2px solid var(--gold); }
  .food-main img { width:100%; height:100%; object-fit:cover; display:block; }
  .food-title { min-width:0; }
  .food-title h2 { margin:0; font-size:1.05rem; display:flex; gap:.5rem; align-items:center; }
  .food-title .cat { color:var(--muted); font-size:.8rem; }
  .badge { font-size:.7rem; font-weight:600; padding:.1rem .45rem; border-radius:99px; }
  .badge.ok { background:var(--ok-soft); color:var(--ok); }
  .badge.out { background:var(--accent-soft); color:#93b8fb; }
  .chips { display:flex; gap:.35rem; flex-wrap:wrap; margin-left:auto; justify-content:flex-end; }
  .chip { font-size:.75rem; padding:.15rem .5rem; border-radius:99px; background:var(--panel2); color:var(--muted); }
  .chip.ok { background:var(--ok-soft); color:var(--ok); }
  .chip.empty { background:var(--warn-soft); color:var(--warn); }
  .food-actions { display:flex; gap:.4rem; flex:none; }
  .caret { transition:transform .2s; color:var(--muted); }
  .food.collapsed .caret { transform:rotate(-90deg); }
  .food.collapsed .food-body { display:none; }
  .food-body { padding:0 1rem 1rem; }

  /* preparation block */
  .prep { border-top:1px solid var(--line); padding:.8rem 0 .2rem; border-radius:10px; transition:background .15s, outline-color .15s;
          outline:2px dashed transparent; outline-offset:4px; }
  .prep.drag { outline-color:var(--accent); background:var(--accent-soft); }
  .prep-head { display:flex; align-items:center; gap:.6rem; margin-bottom:.55rem; }
  .prep-head h3 { margin:0; font-size:.9rem; font-weight:600; }
  .prep-head .code { color:var(--muted); font-weight:500; font-size:.75rem; letter-spacing:.04em; }
  .count { font-size:.8rem; color:var(--muted); font-variant-numeric:tabular-nums; }
  .count.ok { color:var(--ok); font-weight:600; }
  .prep-head .spacer { flex:1; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(128px,1fr)); gap:.5rem; }
  .card { position:relative; aspect-ratio:1; border-radius:10px; overflow:hidden; background:var(--panel2);
          cursor:pointer; outline:3px solid transparent; outline-offset:-3px; transition:outline-color .12s, opacity .15s, transform .12s; }
  .card:active { transform:scale(.98); }
  .card img { width:100%; height:100%; object-fit:cover; display:block; }
  .card.sel { outline-color:var(--accent); }
  .card.main { outline-color:var(--gold); }
  .grid.full .card:not(.sel) { opacity:.45; }
  .grid.full .card:not(.sel):hover { opacity:.85; }
  .card .tick { position:absolute; top:.35rem; left:.35rem; width:1.4rem; height:1.4rem; border-radius:50%;
                background:var(--accent); color:#fff; font-size:.8rem; font-weight:700; display:none; place-items:center; }
  .card.sel .tick { display:grid; }
  .card.main .tick { background:var(--gold); color:#1a1a1a; }
  .card .star { position:absolute; top:.35rem; right:.35rem; background:var(--gold); color:#1a1a1a; font-size:.65rem;
                font-weight:700; padding:.1rem .4rem; border-radius:99px; display:none; }
  .card.main .star { display:block; }
  .card .tools { position:absolute; inset:auto 0 0 0; display:flex; justify-content:center; gap:.3rem; padding:.35rem;
                 background:linear-gradient(transparent, rgba(0,0,0,.75)); opacity:0; transition:opacity .15s; }
  .card:hover .tools { opacity:1; }
  .tools button { padding:.2rem .45rem; font-size:.8rem; background:rgba(20,22,28,.85); border-color:rgba(255,255,255,.12); }
  .tools button[data-act="reject"]:hover { background:var(--danger); border-color:var(--danger); }
  .tools button[data-act="main"]:hover { background:var(--gold); color:#1a1a1a; }
  .card.broken::after { content:"Lỗi ảnh"; position:absolute; inset:0; display:grid; place-items:center;
                        color:var(--danger); font-size:.8rem; background:var(--panel2); }

  .drop { aspect-ratio:1; border:2px dashed var(--line); border-radius:10px; display:grid; place-items:center;
          text-align:center; color:var(--muted); font-size:.78rem; padding:.5rem; cursor:pointer; transition:border-color .15s,color .15s; }
  .drop:hover { border-color:var(--accent); color:var(--text); }
  .drop b { display:block; font-size:1.4rem; font-weight:400; }
  .empty { color:var(--warn); font-size:.85rem; margin:.2rem 0 .5rem; }

  details.rej { margin:.5rem 0 .3rem; }
  details.rej summary { color:var(--muted); font-size:.8rem; cursor:pointer; width:max-content; }
  details.rej .grid { margin-top:.5rem; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); }
  details.rej .card { cursor:default; opacity:.55; }
  details.rej .card:hover { opacity:1; }

  /* lightbox */
  .lb { position:fixed; inset:0; z-index:50; background:rgba(5,6,8,.92); display:none; flex-direction:column; }
  .lb.open { display:flex; }
  .lb-img { flex:1; display:grid; place-items:center; min-height:0; padding:1rem; }
  .lb-img img { max-width:100%; max-height:calc(100vh - 120px); object-fit:contain; border-radius:8px; outline:3px solid transparent; }
  .lb-img img.sel { outline-color:var(--accent); }
  .lb-img img.main { outline-color:var(--gold); }
  .lb-bar { display:flex; gap:.6rem; align-items:center; justify-content:center; padding:.8rem 1rem 1.2rem; flex-wrap:wrap; }
  .lb-info { color:var(--muted); margin-right:1rem; }
  .lb-info b { color:var(--text); }

  .progress { position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%); z-index:60; width:min(460px, 90vw);
              background:#1f2430; border:1px solid var(--accent); border-radius:12px; padding:.8rem 1rem;
              box-shadow:0 10px 30px rgba(0,0,0,.4); }
  .progress[hidden] { display:none; }
  .progress #progText { margin-bottom:.5rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bar.wide { width:100%; }
  .bar.wide i { background:var(--accent); }
  button:disabled { opacity:.5; cursor:wait; }
  .toast { position:fixed; bottom:1.5rem; right:1.5rem; z-index:60; background:#1f2430; border:1px solid var(--line);
           color:var(--text); padding:.65rem 1rem; border-radius:10px; opacity:0; transform:translateY(6px);
           transition:opacity .2s, transform .2s; pointer-events:none; max-width:420px; }
  .toast.show { opacity:1; transform:none; }
  .toast.err { border-color:var(--danger); }
  .none { color:var(--muted); text-align:center; padding:3rem 0; }
</style>
</head>
<body>
<div class="topbar"><div class="topbar-inner">
  <div class="brand">MAI<span>Fit</span> · Ảnh món ăn</div>
  <input id="q" type="search" placeholder="Tìm món…" autocomplete="off">
  <select id="cat"><option value="">Tất cả nhóm</option></select>
  <label class="chk"><input type="checkbox" id="todo"> Chỉ món chưa xong</label>
  <button class="ghost" id="collapseAll">Thu gọn tất cả</button>
  <div class="stats">
    <span><b id="doneCount">0</b>/<span id="foodCount">0</span> món xong</span>
    <div class="bar"><i id="doneBar"></i></div>
    <button class="danger" id="refinalizeAll" title="Xóa ảnh đã xuất của mọi món rồi xuất lại">Xuất lại từ đầu</button>
    <button class="primary" id="finalizeAll" title="Chỉ xuất các món đã thay đổi">Xuất tất cả</button>
  </div>
</div></div>

<main>
  <p class="hint">
    Bấm ảnh để chọn/bỏ chọn (tối đa {{ target }} ảnh mỗi cách chế biến). ★ đặt ảnh chính của món, ✕ loại ảnh, ⤢ xem lớn.
    Kéo thả file ảnh vào một cách chế biến để thêm ảnh. Trong khung xem lớn: <kbd>←</kbd><kbd>→</kbd> chuyển ảnh,
    <kbd>Space</kbd> chọn, <kbd>M</kbd> ảnh chính, <kbd>X</kbd> loại, <kbd>Esc</kbd> đóng.
    Xuất ra: <code>{{ out_dir }}</code>
  </p>
  <div id="foods"></div>
  <p class="none" id="none" hidden>Không có món nào khớp bộ lọc.</p>
</main>

<div class="lb" id="lb">
  <div class="lb-img"><img id="lbImg" alt=""></div>
  <div class="lb-bar">
    <span class="lb-info" id="lbInfo"></span>
    <button data-lb="prev">← Trước</button>
    <button data-lb="toggle">Chọn / Bỏ chọn</button>
    <button data-lb="main">★ Ảnh chính</button>
    <button data-lb="reject">✕ Loại</button>
    <button data-lb="next">Sau →</button>
    <button data-lb="close" class="ghost">Đóng</button>
  </div>
</div>

<input type="file" id="filePick" accept="image/*" multiple hidden>
<div id="progress" class="progress" hidden>
  <div id="progText">Đang xuất…</div>
  <div class="bar wide"><i id="progBar"></i></div>
</div>
<div id="toast" class="toast"></div>
<script id="data" type="application/json">{{ data | tojson }}</script>

<script>
const DATA = JSON.parse(document.getElementById('data').textContent);
const TARGET = DATA.target;
const LABELS = DATA.labels;
const foods = new Map(DATA.foods.map(f => [f.slug, f]));
const order = DATA.foods.map(f => f.slug);
const collapsed = new Set();
const root = document.getElementById('foods');

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seg = (...p) => p.map(encodeURIComponent).join('/');
const thumbUrl = (kind, slug, prep, img) => '/thumb/' + seg(kind, slug, prep, img);
const fullUrl = (kind, slug, prep, img) => '/full/' + seg(kind, slug, prep, img);
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function toast(msg, isErr) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
  el.classList.add('show');
  clearTimeout(window.__t);
  window.__t = setTimeout(() => el.classList.remove('show'), isErr ? 3500 : 1800);
}

async function api(path, body, isForm) {
  const opts = { method: 'POST', headers: { 'X-Review-UI': '1' } };
  if (isForm) { opts.body = body; }
  else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body || {}); }
  const r = await fetch(path, opts);
  let j = {};
  try { j = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

function prepOk(p) {
  const need = Math.min(TARGET, p.images.length);
  return p.images.length > 0 && p.selected.length >= need;
}
const foodDone = f => !!f.main && f.preps.every(p => p.images.length === 0 || prepOk(p));

// ---------- rendering ----------
function cardHtml(f, p, img) {
  const isSel = p.selected.includes(img);
  const isMain = f.main && f.main.prep === p.code && f.main.img === img;
  const n = isSel ? p.selected.indexOf(img) + 1 : '';
  return `<div class="card${isSel ? ' sel' : ''}${isMain ? ' main' : ''}" data-prep="${esc(p.code)}" data-img="${esc(img)}">
    <img src="${thumbUrl('img', f.slug, p.code, img)}" loading="lazy" alt="" onerror="this.parentNode.classList.add('broken')">
    <span class="tick">${isMain ? '★' : n}</span><span class="star">CHÍNH</span>
    <div class="tools">
      <button data-act="main" title="Ảnh chính">★</button>
      <button data-act="zoom" title="Xem lớn">⤢</button>
      <button data-act="reject" title="Loại ảnh">✕</button>
    </div></div>`;
}

function prepHtml(f, p) {
  const full = p.selected.length >= TARGET;
  const rej = p.rejected.length ? `<details class="rej"><summary>Đã loại (${p.rejected.length})</summary><div class="grid">
      ${p.rejected.map(img => `<div class="card" data-prep="${esc(p.code)}" data-img="${esc(img)}">
        <img src="${thumbUrl('rej', f.slug, p.code, img)}" loading="lazy" alt="">
        <div class="tools"><button data-act="restore" title="Khôi phục">↺ Khôi phục</button></div></div>`).join('')}
      </div></details>` : '';
  return `<section class="prep" data-prep="${esc(p.code)}">
    <div class="prep-head">
      <h3>${esc(LABELS[p.code] || p.code)} <span class="code">${esc(p.code)}</span></h3>
      <span class="count${prepOk(p) ? ' ok' : ''}">${p.selected.length} / ${TARGET} · ${p.images.length} ảnh</span>
      <span class="spacer"></span>
      ${p.selected.length ? `<button class="ghost" data-act="clear">Bỏ chọn hết</button>` : ''}
    </div>
    ${p.images.length ? '' : '<p class="empty">Chưa có ảnh — kéo thả ảnh vào đây.</p>'}
    <div class="grid${full ? ' full' : ''}">
      ${p.images.map(img => cardHtml(f, p, img)).join('')}
      <div class="drop" data-act="pick"><div><b>+</b>Kéo thả ảnh<br>hoặc bấm để chọn</div></div>
    </div>${rej}</section>`;
}

function foodHtml(f) {
  const done = foodDone(f);
  const mainImg = f.main
    ? `<div class="food-main has"><img src="${thumbUrl('img', f.slug, f.main.prep, f.main.img)}" alt=""></div>`
    : `<div class="food-main">chưa có<br>ảnh chính</div>`;
  const chips = f.preps.map(p => {
    const cls = p.images.length === 0 ? 'empty' : (prepOk(p) ? 'ok' : '');
    return `<span class="chip ${cls}">${esc(p.code)} ${p.selected.length}/${Math.min(TARGET, p.images.length) || 0}</span>`;
  }).join('');
  return `<div class="food-head" data-act="collapse">
      ${mainImg}
      <div class="food-title">
        <h2>${esc(f.name)} ${done ? '<span class="badge ok">Xong</span>' : ''} ${f.exported ? '<span class="badge out">Đã xuất</span>' : ''}</h2>
        <div class="cat">${esc(f.category)}</div>
      </div>
      <div class="chips">${chips}</div>
      <div class="food-actions"><button data-act="rejectRest" class="danger" title="Chỉ áp dụng cho cách chế biến đã chọn ít nhất 1 ảnh">Loại ảnh không chọn</button><button data-act="finalize">Xuất món này</button><span class="caret">▾</span></div>
    </div>
    <div class="food-body">${f.preps.map(p => prepHtml(f, p)).join('')}</div>`;
}

function renderFood(slug) {
  const f = foods.get(slug);
  let el = document.getElementById('f-' + slug);
  if (!el) {
    el = document.createElement('article');
    el.id = 'f-' + slug;
    el.className = 'food';
    el.dataset.slug = slug;
    root.appendChild(el);
  }
  const openRej = [...el.querySelectorAll('details.rej[open]')].map(d => d.closest('.prep').dataset.prep);
  el.innerHTML = foodHtml(f);
  openRej.forEach(code => { const d = el.querySelector(`.prep[data-prep="${code}"] details.rej`); if (d) d.open = true; });
  el.classList.toggle('done', foodDone(f));
  el.classList.toggle('collapsed', collapsed.has(slug));
}

function applyFilters() {
  const q = fold(document.getElementById('q').value.trim());
  const cat = document.getElementById('cat').value;
  const todo = document.getElementById('todo').checked;
  let shown = 0, done = 0;
  for (const slug of order) {
    const f = foods.get(slug);
    const isDone = foodDone(f);
    if (isDone) done++;
    const visible = (!q || fold(f.name).includes(q)) && (!cat || f.category === cat) && (!todo || !isDone);
    document.getElementById('f-' + slug).hidden = !visible;
    if (visible) shown++;
  }
  document.getElementById('none').hidden = shown > 0;
  document.getElementById('doneCount').textContent = done;
  document.getElementById('foodCount').textContent = order.length;
  document.getElementById('doneBar').style.width = (order.length ? 100 * done / order.length : 0) + '%';
}

function update(state) {
  foods.set(state.slug, state);
  renderFood(state.slug);
  applyFilters();
  if (lb.open && lb.slug === state.slug) lbShow();
}

// ---------- actions ----------
async function run(promise) {
  try { const j = await promise; if (j.food) update(j.food); return j; }
  catch (e) { toast(e.message, true); }
}
const act = {
  toggle: (slug, prep, img) => run(api('/api/toggle', { food: slug, prep, img })),
  main: (slug, prep, img) => run(api('/api/main', { food: slug, prep, img })),
  reject: (slug, prep, img) => run(api('/api/reject', { food: slug, prep, img })),
  restore: (slug, prep, img) => run(api('/api/restore', { food: slug, prep, img })),
  clear: (slug, prep) => run(api('/api/clear', { food: slug, prep })),
};

async function upload(slug, prep, files) {
  files = [...files].filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
  if (!files.length) { toast('Không có file ảnh nào', true); return; }
  const fd = new FormData();
  fd.append('food', slug); fd.append('prep', prep);
  files.forEach(f => fd.append('files', f));
  toast('Đang thêm ' + files.length + ' ảnh…');
  const j = await run(api('/api/upload', fd, true));
  if (j) toast(`Đã thêm ${j.added} ảnh` + (j.errors.length ? ` · ${j.errors.length} lỗi: ${j.errors.join('; ')}` : ''), j.errors.length > 0);
}

async function rejectRest(slug) {
  const f = foods.get(slug);
  const reviewed = f.preps.filter(p => p.selected.length > 0);
  const count = reviewed.reduce((n, p) => n + p.images.length - p.selected.length, 0);
  const skipped = f.preps.filter(p => p.selected.length === 0 && p.images.length > 0).map(p => p.code);
  if (!count) { toast('Không có ảnh nào để loại' + (skipped.length ? ' (bỏ qua ' + skipped.join(', ') + ' vì chưa chọn ảnh nào)' : ''), true); return; }
  const note = skipped.length ? `\n\nBỏ qua ${skipped.join(', ')} vì chưa chọn ảnh nào.` : '';
  if (!confirm(`Loại ${count} ảnh không chọn của "${f.name}"?\nẢnh chuyển vào mục "Đã loại", khôi phục được.${note}`)) return;
  const j = await run(api('/api/reject_unselected', { food: slug }));
  if (j) toast(`Đã loại ${j.moved} ảnh`);
}

async function finalize(slug) {
  const f = foods.get(slug);
  toast(`Đang xuất "${f.name}"…`);
  const j = await run(api('/api/finalize', { food: slug }));
  if (!j) return;
  toast(`Đã xuất ${j.copied} ảnh` + (j.warnings.length ? ' · ' + j.warnings.join('; ') : ''), j.warnings.length > 0);
}

// Export food by food so the progress panel can count; unchanged foods are skipped.
let exporting = false;
async function finalizeAll(force) {
  if (exporting) return;
  const list = order.filter(s => { const f = foods.get(s); return f.exported || f.preps.some(p => p.selected.length); });
  if (!list.length) { toast('Chưa có món nào được chọn ảnh để xuất', true); return; }
  if (force && !confirm(`Xóa ảnh đã xuất của ${list.length} món rồi xuất lại toàn bộ?`)) return;
  exporting = true;
  const btn = document.getElementById('finalizeAll');
  const box = document.getElementById('progress');
  const btn2 = document.getElementById('refinalizeAll');
  btn.disabled = btn2.disabled = true;
  box.hidden = false;
  let copied = 0, done = 0, skipped = 0, changed = 0;
  const warnings = [], errors = [];
  for (const slug of list) {
    const f = foods.get(slug);
    document.getElementById('progText').textContent = `Đang xuất ${done + 1}/${list.length}: ${f.name}`;
    try {
      const j = await api('/api/finalize', { food: slug, force: !!force });
      update(j.food);
      copied += j.copied; warnings.push(...j.warnings);
      j.skipped ? skipped++ : changed++;
    } catch (e) { errors.push(`${f.name}: ${e.message}`); }
    done++;
    document.getElementById('progBar').style.width = (100 * done / list.length) + '%';
  }
  box.hidden = true;
  btn.disabled = btn2.disabled = false;
  exporting = false;
  if (warnings.length || errors.length) console.warn('Export warnings:', warnings, errors);
  const extra = [...errors, ...warnings];
  toast(`Xuất xong ${list.length} món: ${changed} món xuất mới (${copied} ảnh), ${skipped} món không đổi` +
        (extra.length ? ` · ${extra.length} cảnh báo: ${extra.slice(0, 3).join('; ')}${extra.length > 3 ? '…' : ''}` : ''),
        extra.length > 0);
}

root.addEventListener('click', e => {
  const foodEl = e.target.closest('.food'); if (!foodEl) return;
  const slug = foodEl.dataset.slug;
  const btn = e.target.closest('[data-act]');
  const card = e.target.closest('.card');
  const prepEl = e.target.closest('.prep');
  const prep = prepEl && prepEl.dataset.prep;
  const name = btn ? btn.dataset.act : null;

  if (name === 'collapse' && !e.target.closest('button')) {
    collapsed.has(slug) ? collapsed.delete(slug) : collapsed.add(slug);
    foodEl.classList.toggle('collapsed');
    return;
  }
  if (name === 'finalize') return finalize(slug);
  if (name === 'rejectRest') return rejectRest(slug);
  if (name === 'clear') return act.clear(slug, prep);
  if (name === 'pick') { pickTarget = { slug, prep }; document.getElementById('filePick').click(); return; }
  if (!card) return;
  const img = card.dataset.img;
  if (name === 'main') return act.main(slug, prep, img);
  if (name === 'reject') return act.reject(slug, prep, img);
  if (name === 'restore') return act.restore(slug, prep, img);
  if (name === 'zoom') return lbOpen(slug, prep, img);
  if (!card.closest('details.rej')) act.toggle(slug, prep, img);
});

// drag & drop
let pickTarget = null;
document.getElementById('filePick').addEventListener('change', e => {
  if (pickTarget && e.target.files.length) upload(pickTarget.slug, pickTarget.prep, e.target.files);
  e.target.value = '';
});
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
root.addEventListener('dragover', e => {
  const p = e.target.closest('.prep'); if (!p) return;
  e.preventDefault();
  document.querySelectorAll('.prep.drag').forEach(x => x !== p && x.classList.remove('drag'));
  p.classList.add('drag');
});
root.addEventListener('dragleave', e => {
  const p = e.target.closest('.prep');
  if (p && !p.contains(e.relatedTarget)) p.classList.remove('drag');
});
root.addEventListener('drop', e => {
  const p = e.target.closest('.prep'); if (!p) return;
  e.preventDefault();
  p.classList.remove('drag');
  upload(p.closest('.food').dataset.slug, p.dataset.prep, e.dataTransfer.files);
});

// ---------- lightbox ----------
const lb = { open: false, slug: null, prep: null, idx: 0 };
function lbOpen(slug, prep, img) {
  const p = foods.get(slug).preps.find(x => x.code === prep);
  Object.assign(lb, { open: true, slug, prep, idx: Math.max(0, p.images.indexOf(img)) });
  document.getElementById('lb').classList.add('open');
  lbShow();
}
function lbClose() { lb.open = false; document.getElementById('lb').classList.remove('open'); }
function lbCurrent() {
  const f = foods.get(lb.slug); const p = f.preps.find(x => x.code === lb.prep);
  if (!p.images.length) return null;
  lb.idx = Math.min(Math.max(lb.idx, 0), p.images.length - 1);
  return { f, p, img: p.images[lb.idx] };
}
function lbShow() {
  const c = lbCurrent(); if (!c) return lbClose();
  const isSel = c.p.selected.includes(c.img);
  const isMain = c.f.main && c.f.main.prep === c.p.code && c.f.main.img === c.img;
  const el = document.getElementById('lbImg');
  el.src = fullUrl('img', c.f.slug, c.p.code, c.img);
  el.className = isMain ? 'main' : (isSel ? 'sel' : '');
  document.getElementById('lbInfo').innerHTML =
    `<b>${esc(c.f.name)}</b> · ${esc(LABELS[c.p.code] || c.p.code)} · ${lb.idx + 1}/${c.p.images.length}` +
    ` · ${c.p.selected.length}/${TARGET} đã chọn` + (isMain ? ' · <b style="color:var(--gold)">ẢNH CHÍNH</b>' : (isSel ? ' · <b style="color:#93b8fb">ĐÃ CHỌN</b>' : ''));
}
function lbDo(a) {
  const c = lbCurrent(); if (!c && a !== 'close') return lbClose();
  if (a === 'prev') { lb.idx--; lbShow(); }
  else if (a === 'next') { lb.idx++; lbShow(); }
  else if (a === 'toggle') act.toggle(c.f.slug, c.p.code, c.img);
  else if (a === 'main') act.main(c.f.slug, c.p.code, c.img);
  else if (a === 'reject') act.reject(c.f.slug, c.p.code, c.img);
  else if (a === 'close') lbClose();
}
document.querySelector('.lb-bar').addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (b) lbDo(b.dataset.lb); });
document.getElementById('lb').addEventListener('click', e => { if (e.target.classList.contains('lb-img')) lbClose(); });
document.addEventListener('keydown', e => {
  if (!lb.open || e.target.matches('input, select')) return;
  const map = { ArrowLeft: 'prev', ArrowRight: 'next', ' ': 'toggle', Enter: 'toggle',
                m: 'main', M: 'main', x: 'reject', X: 'reject', Delete: 'reject', Escape: 'close' };
  if (map[e.key]) { e.preventDefault(); lbDo(map[e.key]); }
});

// ---------- top bar ----------
const cats = [...new Set(DATA.foods.map(f => f.category).filter(Boolean))].sort();
document.getElementById('cat').insertAdjacentHTML('beforeend', cats.map(c => `<option>${esc(c)}</option>`).join(''));
['q', 'cat', 'todo'].forEach(id => document.getElementById(id).addEventListener('input', applyFilters));
document.getElementById('finalizeAll').addEventListener('click', () => finalizeAll(false));
document.getElementById('refinalizeAll').addEventListener('click', () => finalizeAll(true));
window.addEventListener('beforeunload', e => { if (exporting) e.preventDefault(); });
document.getElementById('collapseAll').addEventListener('click', e => {
  const collapse = collapsed.size < order.length;
  order.forEach(s => { collapse ? collapsed.add(s) : collapsed.delete(s);
                       document.getElementById('f-' + s).classList.toggle('collapsed', collapse); });
  e.target.textContent = collapse ? 'Mở tất cả' : 'Thu gọn tất cả';
});

order.forEach(renderFood);
applyFilters();
</script>
</body>
</html>
"""


@app.route("/")
def index():
    with _state_lock:
        sel, main = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {})
    data = {
        "target": app.config["TARGET_PER_PREP"],
        "labels": PREP_LABELS,
        "foods": [food_state(f, sel, main) for f in foods_index()],
    }
    return render_template_string(
        PAGE, data=data, target=app.config["TARGET_PER_PREP"],
        out_dir=str(app.config["OUT_DIR"]),
    )


@app.route("/full/<kind>/<food_slug>/<prep>/<img>")
def serve_full(kind: str, food_slug: str, prep: str, img: str):
    path = image_path(kind, food_slug, prep, img)
    if not path.is_file():
        abort(404)
    return send_file(path, max_age=3600)


@app.route("/thumb/<kind>/<food_slug>/<prep>/<img>")
def serve_thumb(kind: str, food_slug: str, prep: str, img: str):
    src = image_path(kind, food_slug, prep, img)
    if not src.is_file():
        abort(404)
    thumb = THUMBS / kind / food_slug / prep / (img + ".webp")
    if not thumb.exists() or thumb.stat().st_mtime < src.stat().st_mtime:
        try:
            with Image.open(src):
                pass
            im = open_image(src)
            im.thumbnail((THUMB_SIZE, THUMB_SIZE))
            save_atomic(im, thumb, "WEBP", quality=72, method=4)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            abort(415)
    return send_file(thumb, mimetype="image/webp", max_age=3600)


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #

def _body() -> dict:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError("expected a JSON object")
    return body


def _target(body: dict) -> tuple[dict, str, str]:
    food = get_food(body.get("food"))
    prep = check_prep(food, body.get("prep"))
    img = check_name(body.get("img"))
    return food, prep, img


@app.route("/api/toggle", methods=["POST"])
def api_toggle():
    food, prep, img = _target(_body())
    slug = food["slug"]
    with _state_lock:
        if img not in list_images(IMAGES / slug / prep):
            raise ApiError("image not found", 404)
        sel, main = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {})
        current = sel.setdefault(slug, {}).setdefault(prep, [])
        if img in current:
            current.remove(img)
            if main.get(slug) == f"{prep}/{img}":       # unselecting the main image clears it
                main.pop(slug)
                write_json(MAIN_JSON, main)
        else:
            if len(current) >= app.config["TARGET_PER_PREP"]:
                raise ApiError(f"Tối đa {app.config['TARGET_PER_PREP']} ảnh mỗi cách chế biến")
            current.append(img)
        write_json(SEL_JSON, sel)
        return jsonify({"food": food_state(food, sel, main)})


@app.route("/api/main", methods=["POST"])
def api_main():
    """Set (or unset, if already main) the single main image of a food."""
    food, prep, img = _target(_body())
    slug = food["slug"]
    with _state_lock:
        if img not in list_images(IMAGES / slug / prep):
            raise ApiError("image not found", 404)
        sel, main = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {})
        key = f"{prep}/{img}"
        if main.get(slug) == key:
            main.pop(slug)
        else:
            current = sel.setdefault(slug, {}).setdefault(prep, [])
            if img not in current:                       # the main image is always a picked image
                if len(current) >= app.config["TARGET_PER_PREP"]:
                    raise ApiError("Phần này đã đủ ảnh — bỏ chọn bớt một ảnh rồi đặt ảnh chính")
                current.append(img)
                write_json(SEL_JSON, sel)
            main[slug] = key
        write_json(MAIN_JSON, main)
        return jsonify({"food": food_state(food, sel, main)})


@app.route("/api/reject", methods=["POST"])
def api_reject():
    """Move an image to images/_rejected/ and record it for the downloader."""
    food, prep, img = _target(_body())
    slug = food["slug"]
    with _state_lock:
        src = IMAGES / slug / prep / img
        if not src.is_file():
            raise ApiError("image not found", 404)
        dst = REJECTED_DIR / slug / prep / img
        dst.parent.mkdir(parents=True, exist_ok=True)
        os.replace(src, dst)

        sel, main, rej = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {}), read_json(REJ_JSON, {})
        picked = sel.get(slug, {}).get(prep, [])
        if img in picked:
            picked.remove(img)
            write_json(SEL_JSON, sel)
        if main.get(slug) == f"{prep}/{img}":
            main.pop(slug)
            write_json(MAIN_JSON, main)
        names = rej.setdefault(slug, {}).setdefault(prep, [])
        if img not in names:
            names.append(img)
        write_json(REJ_JSON, rej)
        return jsonify({"food": food_state(food, sel, main)})


@app.route("/api/reject_unselected", methods=["POST"])
def api_reject_unselected():
    """Reject every unpicked image of a food.

    Preparations with no picks at all are skipped: an empty selection usually
    means "not reviewed yet", and rejecting them would empty the whole folder.
    """
    food = get_food(_body().get("food"))
    slug = food["slug"]
    with _state_lock:
        sel, main, rej = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {}), read_json(REJ_JSON, {})
        state = food_state(food, sel, main)
        moved, skipped = 0, []
        for p in state["preps"]:
            if not p["selected"]:
                if p["images"]:
                    skipped.append(p["code"])
                continue
            for img in p["images"]:
                if img in p["selected"]:
                    continue
                dst = REJECTED_DIR / slug / p["code"] / img
                dst.parent.mkdir(parents=True, exist_ok=True)
                os.replace(IMAGES / slug / p["code"] / img, dst)
                names = rej.setdefault(slug, {}).setdefault(p["code"], [])
                if img not in names:
                    names.append(img)
                moved += 1
        write_json(REJ_JSON, rej)
        return jsonify({"moved": moved, "skipped": skipped, "food": food_state(food, sel, main)})


@app.route("/api/restore", methods=["POST"])
def api_restore():
    food, prep, img = _target(_body())
    slug = food["slug"]
    with _state_lock:
        src = REJECTED_DIR / slug / prep / img
        if not src.is_file():
            raise ApiError("image not found", 404)
        dst = IMAGES / slug / prep / img
        dst.parent.mkdir(parents=True, exist_ok=True)
        os.replace(src, dst)

        rej = read_json(REJ_JSON, {})
        names = rej.get(slug, {}).get(prep, [])
        if img in names:
            names.remove(img)
            write_json(REJ_JSON, rej)
        return jsonify({"food": current_state(food)})


@app.route("/api/clear", methods=["POST"])
def api_clear():
    body = _body()
    food = get_food(body.get("food"))
    prep = check_prep(food, body.get("prep"))
    slug = food["slug"]
    with _state_lock:
        sel, main = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {})
        sel.get(slug, {}).pop(prep, None)
        write_json(SEL_JSON, sel)
        if main.get(slug, "").startswith(prep + "/"):
            main.pop(slug)
            write_json(MAIN_JSON, main)
        return jsonify({"food": food_state(food, sel, main)})


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Add dropped image files to one preparation.

    Every file is decoded with Pillow (so only real images get in),
    rotated per EXIF, re-encoded as JPEG without metadata, and named by
    content hash so dropping the same file twice is a no-op.
    """
    food = get_food(request.form.get("food"))
    prep = check_prep(food, request.form.get("prep"))
    slug = food["slug"]
    folder = IMAGES / slug / prep
    added, errors = 0, []

    for f in request.files.getlist("files"):
        label = f.filename or "file"
        data = f.read(UPLOAD_MAX_BYTES + 1)
        if len(data) > UPLOAD_MAX_BYTES:
            errors.append(f"{label}: lớn hơn {UPLOAD_MAX_BYTES // (1024 * 1024)} MB")
            continue
        try:
            with Image.open(io.BytesIO(data)) as probe:
                probe.verify()
            im = flatten(open_image(io.BytesIO(data)))
        except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
            errors.append(f"{label}: không phải file ảnh hợp lệ")
            continue

        name = f"added-{hashlib.sha1(data).hexdigest()[:12]}.jpg"
        if (folder / name).exists() or (REJECTED_DIR / slug / prep / name).exists():
            errors.append(f"{label}: đã có ảnh này")
            continue
        save_atomic(im, folder / name, "JPEG", quality=92, optimize=True)
        with _state_lock:
            sources = read_json(SRC_JSON, {})
            sources[f"{slug}/{prep}/{name}"] = {"type": "upload", "original_name": label}
            write_json(SRC_JSON, sources)
        added += 1

    with _state_lock:
        return jsonify({"added": added, "errors": errors, "food": current_state(food)})


# --------------------------------------------------------------------------- #
# Finalize
# --------------------------------------------------------------------------- #

def _finalize_one(food: dict, sel: dict, main: dict, sources: dict,
                  force: bool = True) -> dict:
    """Export one food's picks as WebP + manifest.json.

    With force=False the food is skipped when its picks, main image and
    output settings are unchanged since the last export (same signature).
    """
    out_root = app.config["OUT_DIR"].resolve()
    out = (out_root / food["name_slug"]).resolve()
    if out.parent != out_root or not food["name_slug"]:
        raise ApiError("refusing to write outside the output folder", 500)

    slug = food["slug"]
    state = food_state(food, sel, main)
    warnings = []

    # Main image first, then each preparation in the food's order, in pick order.
    ordered = []
    if state["main"]:
        ordered.append((state["main"]["prep"], state["main"]["img"]))
    for p in state["preps"]:
        ordered += [(p["code"], img) for img in p["selected"] if (p["code"], img) not in ordered]
    signature = hashlib.sha1(json.dumps(
        [ordered, OUT_MAX_SIDE, OUT_QUALITY]).encode("utf-8")).hexdigest()

    if not force and ordered:
        old = read_json(out / "manifest.json", None)
        if (old and old.get("signature") == signature
                and all((out_root / e["file"]).exists() for e in old.get("images", []))):
            return {"copied": 0, "warnings": [], "skipped": True}

    if out.exists():
        shutil.rmtree(out)
    if not ordered:
        return {"copied": 0, "warnings": warnings, "skipped": False}
    if not state["main"]:
        warnings.append(f"{food['name']}: chưa có ảnh chính")
    out.mkdir(parents=True)

    entries = []

    counters: dict[str, int] = {}
    for prep, img in ordered:
        counters[prep] = counters.get(prep, 0) + 1
        fname = f"{prep.lower()}-{counters[prep]:02d}.webp"
        try:
            im = open_image(IMAGES / slug / prep / img)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            warnings.append(f"{food['name']}: không đọc được {img}")
            counters[prep] -= 1
            continue
        im.thumbnail((OUT_MAX_SIDE, OUT_MAX_SIDE))
        save_atomic(im, out / fname, "WEBP", quality=OUT_QUALITY, method=4)
        entries.append({
            "file": f"{food['name_slug']}/{fname}",
            "preparation": prep,
            "primary": state["main"] == {"prep": prep, "img": img},
            "original": img,
            "source": sources.get(f"{slug}/{prep}/{img}"),
        })

    write_json(out / "manifest.json", {
        "food": food["name"],
        "slug": food["name_slug"],
        "category": food["category"],
        "primary": next((e["file"] for e in entries if e["primary"]), None),
        "images": entries,
        "signature": signature,
    })
    return {"copied": len(entries), "warnings": warnings, "skipped": False}


def _rebuild_global_manifest() -> None:
    out_root = app.config["OUT_DIR"]
    foods = [read_json(m, None) for m in sorted(out_root.glob("*/manifest.json"))]
    write_json(out_root / "manifest.json", {"foods": [f for f in foods if f]})


@app.route("/api/finalize", methods=["POST"])
def api_finalize():
    """Export one food. "Xuất tất cả" calls this once per food from the page,
    so the page can show progress; it passes force=false to skip unchanged foods."""
    body = _body()
    food = get_food(body.get("food"))
    force = body.get("force", True) is not False
    with _state_lock:
        sel, main, sources = read_json(SEL_JSON, {}), read_json(MAIN_JSON, {}), read_json(SRC_JSON, {})
        result = _finalize_one(food, sel, main, sources, force=force)
        if not result["skipped"]:
            _rebuild_global_manifest()
        return jsonify({**result, "food": food_state(food, sel, main)})


# --------------------------------------------------------------------------- #
# Entrypoint
# --------------------------------------------------------------------------- #

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5000)
    ap.add_argument("--target", type=int, default=6,
                    help="max picks per preparation (default 6)")
    ap.add_argument("--out", type=Path, default=BASE / "selected",
                    help="output folder for finalized images (default ./selected)")
    args = ap.parse_args()
    app.config["TARGET_PER_PREP"] = args.target
    app.config["OUT_DIR"] = args.out.resolve()
    app.config["OUT_DIR"].mkdir(parents=True, exist_ok=True)
    if args.host not in ("127.0.0.1", "localhost"):
        print("WARNING: no login on this tool - anyone on your network can edit/reject images.")
    print(f"Review UI: http://{args.host}:{args.port}")
    print(f"Output:    {app.config['OUT_DIR']}")
    app.run(host=args.host, port=args.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()