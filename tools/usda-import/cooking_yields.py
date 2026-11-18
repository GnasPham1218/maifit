#!/usr/bin/env python3
"""Cooking yields: how much a food weighs after cooking, per gram of raw food.

yield = cooked weight / raw weight, for every cooked foods row against the RAW row of the same name.
Below 1: meat and fish lose water and fat. Above 1: rice, pasta, dry beans absorb water.
The app uses it to say "buy / weigh 200 g raw -> about 150 g after boiling", and to convert a
meal logged by raw weight.

Two steps (from tools/usda-import):

1. Propose yields for review:
       python cooking_yields.py
   -> cooking_yields.csv. Check the lines with a note, set use=0 to drop a yield you don't trust.
      An existing cooking_yields.csv is never overwritten: new rows are appended, reviewed rows kept.

2. Generate the migration from the reviewed CSV:
       python cooking_yields.py --sql
   -> backend/src/main/resources/db/migration/R__food_cooking_yields.sql (repeatable migration).

Where each number comes from, best first:
  a) USDA Table of Cooking Yields for Meat and Poultry, Release 2 (2014): measured yields, matched by
     the NDB number of the cooked USDA item (data/cooking-yields/USDA_CookingYields_MeatPoultry02_0.csv).
  b) Estimate by protein mass balance: cooking barely changes the total protein of a piece of food,
     so  raw grams x protein per 100 g raw = cooked grams x protein per 100 g cooked
     ->  yield = protein per 100 g raw / protein per 100 g cooked  (both from USDA SR Legacy).
     Marked "ƯỚC TÍNH" like the other estimated food data. Not used when a coating adds protein
     (breaded, floured) or the raw and cooked USDA items are different products.
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FOODS = ROOT / "tools" / "food-list" / "food_data_reviewed.json"
SR_DIR = next((HERE / "data" / "sr_legacy").glob("FoodData_Central_sr_legacy_food_csv_*"), None)
YIELDS_CSV = HERE / "data" / "cooking-yields" / "USDA_CookingYields_MeatPoultry02_0.csv"
CSV_PATH = HERE / "cooking_yields.csv"
SQL_PATH = ROOT / "backend" / "src" / "main" / "resources" / "db" / "migration" / "R__food_cooking_yields.sql"

PROTEIN = "1003"            # USDA nutrient id: Protein (g per 100 g)
MIN_PROTEIN = 1.5           # below this the protein ratio is too noisy to estimate a yield
YIELD_RANGE = (0.2, 5.0)    # same bounds as ck_foods_cooking_yield (V24)
COLUMNS = ["name", "preparation", "yield", "use", "method", "source", "raw_usda", "cooked_usda", "note"]

# Which USDA yield-table methods correspond to each preparation
METHODS = {
    "BOILED": ("poached", "simmered", "stewed"),
    "STEAMED": ("steam",),
    "FRIED": ("fried", "pan-browned", "saute"),
    "BRAISED": ("braised",),
    "GRILLED": ("roasted", "broiled", "grilled", "baked"),
}
# Words that only describe the cooking state, removed before comparing the raw and cooked items
STATE_WORDS = re.compile(
    r"\b(raw|uncooked|cooked|boiled|hard-boiled|drained|without added salt|without salt|with salt|"
    r"unenriched|enriched|roasted|broiled|braised|stewed|simmered|steamed|fried|pan-fried|moist heat|"
    r"dry heat|baked|grilled|cooked-roasted|patty|microwaved|bone-in|dry|fresh|unprepared|"
    r"skinless|boneless)\b", re.I)
# Vegetables lose part of their protein into the cooking water, so the protein ratio overstates the yield
NO_ESTIMATE_CATEGORIES = {"VEGETABLE": "rau: đạm tan vào nước luộc nên ước tính theo đạm bị lệch cao; không dùng"}


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip()


def read(path: Path, encoding="utf-8") -> list[dict]:
    with path.open(encoding=encoding, newline="") as fh:
        return list(csv.DictReader(fh))


def load_usda():
    if SR_DIR is None:
        sys.exit("USDA SR Legacy CSVs not found under data/sr_legacy/.")
    fdc_by_desc = {r["description"]: r["fdc_id"] for r in read(SR_DIR / "food.csv")}
    ndb_by_fdc = {r["fdc_id"]: r["NDB_number"] for r in read(SR_DIR / "sr_legacy_food.csv")}
    protein = {}
    with (SR_DIR / "food_nutrient.csv").open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["nutrient_id"] == PROTEIN:
                protein[r["fdc_id"]] = float(r["amount"])
    measured = {}
    if YIELDS_CSV.exists():
        with YIELDS_CSV.open(encoding="latin-1", newline="") as fh:
            rows = list(csv.reader(fh))
        for r in rows[1:]:
            if len(r) > 4 and r[4].strip():
                measured.setdefault(r[1].strip(), []).append((r[3].strip(), float(r[4])))
    else:
        print(f"Note: {YIELDS_CSV.name} not found, every yield will be an estimate.", file=sys.stderr)
    return fdc_by_desc, ndb_by_fdc, protein, measured


def core(desc: str) -> frozenset:
    """The product without its cooking state, as a set of words (order and plurals ignored):
    'Fish, tuna, yellowfin, fresh, cooked, dry heat' == 'Fish, tuna, fresh, yellowfin, raw'."""
    text = re.sub(r"\([^)]*\)", " ", desc.lower())          # "(Includes foods for ...)"
    text = STATE_WORDS.sub(" ", text)
    words = re.findall(r"[a-z0-9%/]+", text)
    return frozenset(w[:-1] if len(w) > 3 and w.endswith("s") else w for w in words)


def propose_row(name, category, prep, raw_desc, cooked_desc, usda) -> dict:
    fdc_by_desc, ndb_by_fdc, protein, measured = usda
    row = {"name": name, "preparation": prep, "yield": "", "use": "0", "method": "", "source": "",
           "raw_usda": raw_desc or "", "cooked_usda": cooked_desc or "", "note": ""}
    if not cooked_desc:
        row["note"] = "dòng ước tính, không có món USDA đã nấu: bỏ qua"
        return row
    cooked_fdc, raw_fdc = fdc_by_desc.get(cooked_desc), fdc_by_desc.get(raw_desc or "")
    if cooked_fdc is None:
        row["note"] = "không tìm thấy món đã nấu trong USDA SR Legacy"
        return row

    # a) measured yield from the USDA table
    ndb = ndb_by_fdc.get(cooked_fdc)
    options = measured.get(ndb, [])
    wanted = METHODS.get(prep, ())
    matching = [o for o in options if any(w in o[0].lower() for w in wanted)] or options
    if matching:
        method, pct = matching[0]
        row["yield"] = f"{pct / 100:.3f}"
        row["use"] = "1"
        row["method"] = "USDA"
        row["source"] = f"USDA Cooking Yields R2 (2014), NDB {ndb}, {method}"
        if len(options) > 1:
            row["note"] = "USDA có nhiều cách nấu cho món này: " + "; ".join(f"{m} {p:g}%" for m, p in options)
        return row

    # b) estimate by protein mass balance
    p_raw, p_cooked = protein.get(raw_fdc), protein.get(cooked_fdc)
    notes = []
    if p_raw is None or p_cooked is None or p_cooked == 0:
        row["note"] = "thiếu số đạm USDA của món sống hoặc chín"
        return row
    estimate = p_raw / p_cooked
    row["yield"] = f"{estimate:.3f}"
    row["method"] = "ƯỚC TÍNH"
    row["source"] = f"ƯỚC TÍNH: đạm/100 g sống FDC {raw_fdc} ÷ chín FDC {cooked_fdc}"
    use = True
    if re.search(r"\b(flour|batter|breaded|coated)\b", cooked_desc, re.I):
        notes.append("có bột áo: bột thêm đạm nên tỉ lệ đạm không dùng được")
        use = False
    if core(raw_desc or "") != core(cooked_desc):
        notes.append("món sống và chín trong USDA không cùng loại: kiểm tra")
        use = False
    if category in NO_ESTIMATE_CATEGORIES:
        notes.append(NO_ESTIMATE_CATEGORIES[category])
        use = False
    elif p_raw < MIN_PROTEIN:
        notes.append(f"ít đạm ({p_raw:g} g/100 g): ước tính kém tin cậy")
        use = False
    if not YIELD_RANGE[0] <= estimate <= YIELD_RANGE[1]:
        notes.append("ngoài khoảng hợp lệ 0,2–5")
        use = False
    row["use"] = "1" if use else "0"
    row["note"] = "; ".join(notes)
    return row


def write_review_csv(fresh: bool) -> None:
    foods = json.loads(FOODS.read_text(encoding="utf-8"))
    usda = load_usda()
    kept = {}
    if CSV_PATH.exists() and not fresh:
        with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
            kept = {(nfc(r["name"]), r["preparation"]): r for r in csv.DictReader(fh)}

    rows, added = [], 0
    for food in foods:
        preps = {p["preparation"]: p for p in food["preparations"]}
        raw = preps.get("RAW")
        for prep, p in preps.items():
            if prep == "RAW":
                continue
            key = (nfc(food["name"]), prep)
            if key in kept:
                rows.append(kept[key])
                continue
            added += 1
            rows.append(propose_row(food["name"], food["category_code"], prep, raw and raw.get("source_description"),
                                    p.get("source_description"), usda))
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    used = sum(1 for r in rows if r["use"] == "1")
    usda_rows = sum(1 for r in rows if r["use"] == "1" and r["method"] == "USDA")
    print(f"Wrote {CSV_PATH.name}: {len(rows)} cooked rows ({added} new), "
          f"{used} proposed for use ({usda_rows} measured by USDA, {used - usda_rows} estimated).")


def sql(value) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def write_sql() -> None:
    if not CSV_PATH.exists():
        sys.exit(f"{CSV_PATH.name} not found: run without --sql first and review it.")
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if r["use"].strip() == "1"]
    errors, seen = [], set()
    for r in rows:
        key = (nfc(r["name"]), r["preparation"])
        if key in seen:
            errors.append(f"{key}: listed twice")
        seen.add(key)
        try:
            y = float(r["yield"])
            if not YIELD_RANGE[0] <= y <= YIELD_RANGE[1]:
                errors.append(f"{key}: yield {y} outside {YIELD_RANGE}")
        except ValueError:
            errors.append(f"{key}: yield {r['yield']!r} is not a number")
        if r["preparation"] == "RAW" or not r["source"].strip():
            errors.append(f"{key}: needs a cooked preparation and a source")
        if len(r["source"]) > 200:
            errors.append(f"{key}: source longer than 200 characters")
    if errors:
        print("Not written, fix cooking_yields.csv first:", *errors, sep="\n  ", file=sys.stderr)
        sys.exit(1)

    values = ",\n".join(
        f"    ({sql(nfc(r['name']))}, {sql(r['preparation'])}, {float(r['yield']):.3f}, {sql(r['source'])})"
        for r in rows)
    out = f"""-- Generated by tools/usda-import/cooking_yields.py from tools/usda-import/cooking_yields.csv.
-- Do not hand-edit: edit the CSV, regenerate, deploy (repeatable migration, re-run when it changes).
-- {len(rows)} cooking yields (cooked weight / raw weight).

CREATE TEMP TABLE cooking_yield_seed (
    name TEXT, preparation TEXT, cooking_yield NUMERIC(4, 3), source TEXT
) ON COMMIT DROP;
"""
    if rows:
        out += f"\nINSERT INTO cooking_yield_seed VALUES\n{values};\n"
    out += """
-- Every yield must belong to an existing cooked row whose food also has a RAW row
DO $$
DECLARE
    missing TEXT;
BEGIN
    SELECT string_agg(s.name || ' (' || s.preparation || ')', ', ') INTO missing
    FROM cooking_yield_seed s
    WHERE NOT EXISTS (SELECT 1 FROM foods f WHERE f.name = s.name AND f.preparation = s.preparation)
       OR NOT EXISTS (SELECT 1 FROM foods r WHERE r.name = s.name AND r.preparation = 'RAW');
    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'cooking yields: no cooked row or no RAW row for %', missing;
    END IF;
END $$;

UPDATE foods SET cooking_yield = NULL, cooking_yield_source = NULL WHERE cooking_yield IS NOT NULL;

UPDATE foods f
SET cooking_yield = s.cooking_yield, cooking_yield_source = s.source
FROM cooking_yield_seed s
WHERE f.name = s.name AND f.preparation = s.preparation;
"""
    SQL_PATH.write_text(out, encoding="utf-8", newline="\n")
    print(f"Wrote {SQL_PATH.relative_to(ROOT)}: {len(rows)} cooking yields.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sql", action="store_true", help="generate R__food_cooking_yields.sql from the reviewed CSV")
    ap.add_argument("--fresh", action="store_true", help="propose every row again (discards the reviewed CSV)")
    args = ap.parse_args()
    write_sql() if args.sql else write_review_csv(args.fresh)


if __name__ == "__main__":
    main()
