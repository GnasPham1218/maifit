#!/usr/bin/env python3
"""Pick USDA SR Legacy rows for the Vietnamese wishlist and write review.csv.

Usage (from this folder):  python3 resolve.py
Reads : data/sr_legacy/*/ (food, food_category, food_nutrient), wishlist.csv, ../../backend/.../V5__seed_foods.sql
Writes: review.csv  (open in Excel, fix "use" / "viet_name", save as UTF-8)

Nothing here invents nutrition numbers: every value is copied from the USDA files.
"""
import csv
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
SR_DIR = next((HERE / "data" / "sr_legacy").glob("FoodData_Central_sr_legacy_food_csv_*"))
V5 = HERE / "../../backend/src/main/resources/db/migration/V5__seed_foods.sql"

# USDA nutrient ids (checked against nutrient.csv: names and units printed by explore step)
KCAL, PROTEIN, FAT, CARB, FIBER = "1008", "1003", "1004", "1005", "1079"
NEEDED = {KCAL, PROTEIN, FAT, CARB, FIBER}

# Categories that do not describe plain foods: skipped for matching
SKIP_CATEGORIES = {
    "Baby Foods", "Fast Foods", "Restaurant Foods", "American Indian/Alaska Native Foods",
    "Meals, Entrees, and Side Dishes", "Snacks", "Breakfast Cereals",
}

GROUP_PREPS = {
    "veg": ["RAW", "BOILED"], "herb": ["RAW"], "fruit": ["RAW"],
    "meat": ["RAW", "BOILED", "GRILLED", "FRIED", "BRAISED"],
    "organ": ["RAW", "BOILED", "FRIED", "BRAISED"],
    "egg": ["RAW", "BOILED", "FRIED"],
    "fish": ["RAW", "GRILLED", "STEAMED", "FRIED"],
    "shell": ["RAW", "STEAMED", "FRIED"],
    "legume": ["RAW", "BOILED"], "grain": ["RAW", "BOILED"],
    "dairy": ["RAW"], "fat": ["RAW"], "nut": ["RAW"], "cond": ["RAW"], "drink": ["RAW"], "single": ["RAW"],
}

# Never a good pick for a Vietnamese kitchen, whatever the wishlist says
GLOBAL_MUST_NOT = ["new zealand", "australian", "imported", "loaf", "breaded", "battered", "babyfood"]

# Only for these groups a bare "cooked" (no method) means boiled; for meat it is too vague ("pan-browned", "baked")
GENERIC_COOKED_IS_BOILED = {"veg", "grain", "legume"}

# Words that make a description a worse pick unless the wishlist asks for them
PENALTY_WORDS = ["canned", "frozen", "dehydrated", "freeze-dried", "dried", "pickled", "salted",
                 "smoked", "cured", "sweetened", "with salt", "breaded", "battered", "stuffed",
                 "microwave", "imitation", "low sodium", "reduced", "fat free", "light "]


def prep_of(desc: str, group: str = ""):
    """Cooking state from the USDA description. Same mapping as V5: roasted/broiled/dry heat -> GRILLED."""
    d = desc.lower()
    if re.search(r"\braw\b|\bunprepared\b|\buncooked\b", d):
        return "RAW"
    if re.search(r"boiled|simmered|stewed", d):
        return "BOILED"
    if re.search(r"steamed|moist heat", d):
        return "STEAMED"
    if re.search(r"braised|pot-roasted", d):
        return "BRAISED"
    if re.search(r"fried|stir-fr", d):
        return "FRIED"
    if re.search(r"broiled|grilled|roasted|dry heat|baked", d):
        return "GRILLED"
    if "cooked" in d and group in GENERIC_COOKED_IS_BOILED:
        return "BOILED"  # "Rice, white, ..., cooked": no method given, same choice V5 made for cooked rice
    return "OTHER" if "cooked" in d else None


def tokens(s: str):
    return [t.strip().lower() for t in s.split(";") if t.strip()]


def load_sr():
    cats = {r["id"]: r["description"] for r in csv.DictReader(open(SR_DIR / "food_category.csv", encoding="utf-8"))}
    foods = {}
    for r in csv.DictReader(open(SR_DIR / "food.csv", encoding="utf-8")):
        cat = cats.get(r["food_category_id"], "")
        if cat in SKIP_CATEGORIES:
            continue
        foods[r["fdc_id"]] = {"id": r["fdc_id"], "desc": r["description"], "cat": cat, "n": {}}
    for r in csv.DictReader(open(SR_DIR / "food_nutrient.csv", encoding="utf-8")):
        f = foods.get(r["fdc_id"])
        if f and r["nutrient_id"] in NEEDED and r["amount"] != "":
            f["n"][r["nutrient_id"]] = float(r["amount"])
    return foods


def existing_v5():
    """(name, preparation) pairs and fdc ids already seeded in V5."""
    text = V5.read_text(encoding="utf-8")
    pairs = set(re.findall(r"^\('([^']+)',\s*'([A-Z]+)'", text, flags=re.M))
    ids = set(re.findall(r"USDA FDC (\d+)", text))
    return pairs, ids


def score(desc: str, prep: str, must: list, forced_words: list):
    """Lower is better: fewer commas = simpler description."""
    d = desc.lower()
    s = desc.count(",") * 10 + len(desc) / 100
    if must and d.startswith(must[0]):
        s -= 30  # "Beans, adzuki..." beats "Yokan, prepared from adzuki beans"; "Spinach" beats "Malabar spinach"
    for w in PENALTY_WORDS:
        if w in d and not any(w in m for m in must):
            s += 50
    if prep in ("BOILED", "STEAMED") and "without salt" in d:
        s -= 5
    if "all commercial varieties" in d or "all varieties" in d:
        s -= 3
    return s


def pick(foods, prep, must, must_not, group):
    cands = []
    for f in foods.values():
        d = f["desc"].lower()
        if not all(t in d for t in must) or any(t in d for t in must_not + GLOBAL_MUST_NOT):
            continue
        found = prep_of(f["desc"], group)
        # No cooking word at all (milk, oil, honey, flour, spices...) = "as bought" = RAW, but an
        # explicit "raw" description still wins over it
        as_bought = found is None and prep == "RAW"
        if found != prep and not as_bought:
            continue
        if KCAL not in f["n"]:
            continue
        cands.append((score(f["desc"], prep, must, []) + (15 if as_bought else 0), f))
    cands.sort(key=lambda x: (x[0], x[1]["desc"]))
    return [f for _, f in cands]


def fmt(v, nd):
    return "" if v is None else f"{v:.{nd}f}"


def main():
    foods = load_sr()
    v5_pairs, v5_ids = existing_v5()
    rows, seen_fdc = [], {}
    wish = list(csv.DictReader(open(HERE / "wishlist.csv", encoding="utf-8")))
    for w in wish:
        if None in w or None in w.values():
            sys.exit(f"wishlist.csv: wrong number of columns in row {w}")
        must, must_not = tokens(w["must"]), tokens(w["must_not"])
        forced = dict(p.split(":") for p in w["force"].split("|") if p)
        preps = w["preps"].split("|") if w["preps"] else GROUP_PREPS[w["group"]]
        for prep in preps:
            if forced.get(prep):
                cands = [foods[forced[prep]]] if forced[prep] in foods else []
            else:
                cands = pick(foods, prep, must, must_not, w["group"])
            row = {"use": "0", "viet_name": w["viet_name"], "preparation": prep, "fdc_id": "", "usda_description": "",
                   "kcal": "", "protein_g": "", "carb_g": "", "fat_g": "", "fiber_g": "",
                   "aliases": w["aliases"], "status": "NO_MATCH", "alt1": "", "alt2": "", "note": "", "group": w["group"]}
            if cands:
                f = cands[0]
                n = f["n"]
                clean = re.sub(r"\s*\(Includes foods for USDA's Food Distribution Program\)", "", f["desc"])
                row.update(fdc_id=f["id"], usda_description=clean, kcal=fmt(n.get(KCAL), 1),
                           protein_g=fmt(n.get(PROTEIN), 2), carb_g=fmt(n.get(CARB), 2),
                           fat_g=fmt(n.get(FAT), 2), fiber_g=fmt(n.get(FIBER), 2), status="OK", use="1",
                           alt1=f"{cands[1]['id']}: {cands[1]['desc']}" if len(cands) > 1 else "",
                           alt2=f"{cands[2]['id']}: {cands[2]['desc']}" if len(cands) > 2 else "")
                # Same limits as the foods table (V4): kcal 0..900, macros 0..100
                if n.get(KCAL, 0) > 900 or any(n.get(k, 0) > 100 for k in (PROTEIN, FAT, CARB)):
                    row.update(status="OUT_OF_RANGE", use="0")
                elif (w["viet_name"], prep) in v5_pairs:
                    row.update(status="EXISTS", use="0")
                elif f["id"] in v5_ids:
                    row.update(status="FDC_IN_V5", use="0")
                elif f["id"] in seen_fdc:
                    row.update(status=f"DUP_FDC({seen_fdc[f['id']]})", use="0")
                else:
                    seen_fdc[f["id"]] = w["viet_name"]
            rows.append(row)

    raw_kcal = {(r["viet_name"]): float(r["kcal"]) for r in rows if r["preparation"] == "RAW" and r["kcal"]}
    for r in rows:
        notes = []
        if r["group"] == "veg" and r["preparation"] == "BOILED" and r["kcal"] and r["viet_name"] in raw_kcal:
            ratio = float(r["kcal"]) / raw_kcal[r["viet_name"]] if raw_kcal[r["viet_name"]] else 1
            if ratio > 1.8 or ratio < 0.5:
                notes.append(f"cooked/raw kcal = {ratio:.1f}x, check USDA data")
        for word in ("canned", "frozen", "dried", "with salt", "sweetened"):
            if word in r["usda_description"].lower():
                notes.append(f"description has '{word}'")
        r["note"] = "; ".join(notes)

    cols = ["use", "viet_name", "preparation", "fdc_id", "usda_description", "kcal", "protein_g", "carb_g",
            "fat_g", "fiber_g", "aliases", "status", "note", "alt1", "alt2", "group"]
    # review.csv: only rows with a USDA match. no_match.csv: what USDA does not have (not an error:
    # e.g. no "boiled" row for fruit), kept to know which wishlist keywords may need a fix.
    for fname, subset in (("review.csv", [r for r in rows if r["status"] != "NO_MATCH"]),
                          ("no_match.csv", [r for r in rows if r["status"] == "NO_MATCH"])):
        with open(HERE / fname, "w", encoding="utf-8-sig", newline="") as fh:  # BOM: Excel reads UTF-8 correctly
            wr = csv.DictWriter(fh, fieldnames=cols)
            wr.writeheader()
            wr.writerows(subset)

    from collections import Counter
    c = Counter(r["status"].split("(")[0] for r in rows)
    print(f"{len(wish)} wishlist items -> {len(rows)} rows:", dict(c))
    print("rows with use=1:", sum(r["use"] == "1" for r in rows))


if __name__ == "__main__":
    main()
