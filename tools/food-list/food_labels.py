#!/usr/bin/env python3
"""Diet labels (vegetarian / vegan) and allergen groups for every food name.

Two steps, like the other food tools:

1. Propose labels for review (from tools/food-list):
       python food_labels.py
   -> food_labels.csv, one line per food name. Open it in Excel, check every line
      (allergen mistakes are dangerous), fix the columns, save as CSV UTF-8.
      An existing food_labels.csv is never overwritten: new foods are appended, reviewed lines are kept.
      --fresh proposes every line again (discards the review).

2. Generate the migration from the reviewed CSV:
       python food_labels.py --sql
   -> backend/src/main/resources/db/migration/R__food_labels.sql (repeatable: Flyway re-runs it
      whenever the file changes, so editing a label = edit the CSV, regenerate, deploy).

CSV columns:
  vegetarian, vegan  1 = yes, 0 = no, ? = depends on the manufacturer (cheese rennet, wine fining...)
  allergens          codes separated by spaces; a trailing ? means "may contain, depends on the product"
                     e.g. Nước tương: "SOY WHEAT? GLUTEN?"
  note               why, for the reviewer
Allergen codes: MILK EGG PEANUT TREE_NUT SOY WHEAT GLUTEN FISH CRUSTACEAN MOLLUSC SESAME CELERY SULPHITES.
WHEAT = wheat allergy; GLUTEN = coeliac (wheat, barley, rye): every wheat food is also GLUTEN.

Labels describe the main ingredient only. Rules used for the proposal:
- vegetarian = no meat, fish or seafood (eggs and milk allowed: lacto-ovo); vegan = no animal product at all
- an allergen that only some products contain is "may contain" (?), never left out: a false warning only
  hides a food, a missed one can hurt someone
"""
import argparse
import csv
import json
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FOODS = HERE / "food_data_reviewed.json"
CSV_PATH = HERE / "food_labels.csv"
SQL_PATH = ROOT / "backend" / "src" / "main" / "resources" / "db" / "migration" / "R__food_labels.sql"

# Must match the codes in the allergens table (V24): the migration fails on an unknown code anyway (FK)
ALLERGENS = ("MILK", "EGG", "PEANUT", "TREE_NUT", "SOY", "WHEAT", "GLUTEN", "FISH", "CRUSTACEAN", "MOLLUSC",
             "SESAME", "CELERY", "SULPHITES")
MAY = "?"                                         # suffix of a "may contain" allergen code
DIET = {"1": "YES", "0": "NO", "?": "DEPENDS"}     # CSV value -> foods.vegetarian / foods.vegan
COLUMNS = ["name", "category_code", "vegetarian", "vegan", "allergens", "note"]

# Default per category: (vegetarian, vegan)
CATEGORY_DIET = {
    "MEAT": ("0", "0"), "SEAFOOD": ("0", "0"), "EGG_DAIRY": ("1", "0"),
    "LEGUME_NUT": ("1", "1"), "STARCH": ("1", "1"), "VEGETABLE": ("1", "1"), "FRUIT": ("1", "1"), "OTHER": ("1", "1"),
}

# Exceptions to the category default: name -> (vegetarian, vegan, note)
DIET_OVERRIDES = {
    "Mì trứng": ("1", "0", "có trứng"),
    "Mật ong": ("1", "0", "sản phẩm từ ong: người ăn thuần chay thường không dùng"),
    "Nước mắm": ("0", "0", "làm từ cá"),
    "Dầu hào": ("0", "0", "làm từ hàu"),
    "Mỡ lợn": ("0", "0", "mỡ động vật"),
    "Sốt mayonnaise": ("1", "0", "có lòng đỏ trứng"),
    "Phô mai Cheddar": ("?", "0", "nhiều loại phô mai dùng men dịch vị (rennet) từ dạ dày bê"),
    "Phô mai mozzarella": ("?", "0", "nhiều loại phô mai dùng men dịch vị (rennet) từ dạ dày bê"),
    "Sữa chua": ("?", "0", "một số loại có gelatin"),
    "Socola đen": ("1", "?", "tùy công thức: có loại có sữa"),
    "Bánh mì sandwich": ("1", "?", "tùy nhà sản xuất: có loại có sữa"),
    "Bia": ("?", "?", "một số loại được lọc bằng bong bóng cá"),
    "Rượu vang đỏ": ("?", "?", "một số loại được lọc bằng lòng trắng trứng hoặc bong bóng cá"),
}

# Allergens by name; "X?" = may contain. Seafood is handled by keyword below.
ALLERGEN_BY_NAME = {
    # milk
    "Bơ nhạt": ["MILK"], "Kem whipping": ["MILK"], "Phô mai Cheddar": ["MILK"], "Phô mai mozzarella": ["MILK"],
    "Sữa bột nguyên kem": ["MILK"], "Sữa chua": ["MILK"], "Sữa đặc có đường": ["MILK"], "Sữa tách béo": ["MILK"],
    "Sữa tươi": ["MILK"],
    # egg
    "Lòng đỏ trứng gà": ["EGG"], "Lòng trắng trứng": ["EGG"], "Trứng cút": ["EGG"], "Trứng gà": ["EGG"],
    "Trứng vịt": ["EGG"], "Sốt mayonnaise": ["EGG"],
    # peanut / tree nuts / sesame / soy
    "Đậu phộng": ["PEANUT"], "Bơ đậu phộng": ["PEANUT"],
    "Hạnh nhân": ["TREE_NUT"], "Hạt điều": ["TREE_NUT"], "Óc chó": ["TREE_NUT"],
    "Mè": ["SESAME"],
    "Đậu nành": ["SOY"], "Đậu phụ": ["SOY"], "Sữa đậu nành": ["SOY"], "Dầu đậu nành": ["SOY?"],
    # wheat (allergy) and gluten (coeliac): every wheat food also has GLUTEN
    "Bánh mì": ["WHEAT", "GLUTEN"], "Bánh mì nguyên cám": ["WHEAT", "GLUTEN"],
    "Bánh mì sandwich": ["WHEAT", "GLUTEN", "MILK?"], "Bột mì": ["WHEAT", "GLUTEN"], "Mì ống": ["WHEAT", "GLUTEN"],
    "Mì trứng": ["WHEAT", "GLUTEN", "EGG"], "Yến mạch": ["GLUTEN?"],
    # celery / sulphites
    "Cần tây": ["CELERY"], "Rượu vang đỏ": ["SULPHITES"], "Nho khô": ["SULPHITES?"],
    "Bia": ["GLUTEN", "SULPHITES?"],
    # mixed products
    "Nước tương": ["SOY", "WHEAT?", "GLUTEN?"], "Tương hoisin": ["SOY", "WHEAT?", "GLUTEN?"],
    "Socola đen": ["MILK?", "SOY?"],
    "Nước mắm": ["FISH"], "Dầu hào": ["MOLLUSC"],
}

ALLERGEN_NOTES = {
    "Dầu đậu nành": "dầu tinh luyện gần như không còn đạm đậu nành, dầu ép lạnh thì còn",
    "Bia": "làm từ lúa mạch nên luôn có gluten (trừ loại ghi gluten-free); sulfite tùy loại",
    "Nho khô": "nho khô vàng thường xử lý sulfite, nho khô đen thường không",
    "Rượu vang đỏ": "lên men tự sinh ra sulfite: gần như mọi chai đều có",
    "Socola đen": "tùy công thức: có loại có sữa, lecithin đậu nành",
    "Bánh mì sandwich": "sữa tùy nhà sản xuất",
    "Nước tương": "có loại không dùng lúa mì (tamari)",
    "Tương hoisin": "lúa mì tùy công thức",
    "Yến mạch": "yến mạch nguyên chất không có gluten nhưng rất hay lẫn khi chế biến",
    "Cơm dừa": "dừa: phần lớn người dị ứng hạt không dị ứng dừa; không gắn nhãn",
    "Nước dừa": "xem Cơm dừa", "Dầu dừa": "xem Cơm dừa",
}

CRUSTACEAN = ("Tôm", "Cua", "Ghẹ")
MOLLUSC = ("Mực", "Bạch tuộc", "Hàu", "Nghêu", "Sò", "Ốc", "Hến")


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip()


def propose(food: dict) -> dict:
    name, cat = food["name"], food["category_code"]
    veg, vegan = CATEGORY_DIET.get(cat, ("1", "1"))
    notes = []
    if name in DIET_OVERRIDES:
        veg, vegan, why = DIET_OVERRIDES[name]
        notes.append(why)

    allergens = list(ALLERGEN_BY_NAME.get(name, []))
    if cat == "SEAFOOD":
        if name.startswith(CRUSTACEAN):
            allergens.append("CRUSTACEAN")
        elif name.startswith(MOLLUSC):
            allergens.append("MOLLUSC")
        elif name.startswith("Cá"):
            allergens.append("FISH")
        else:
            notes.append("hải sản chưa xếp nhóm dị ứng: cần kiểm tra")
    if name in ALLERGEN_NOTES:
        notes.append(ALLERGEN_NOTES[name])
    if cat == "OTHER" and not allergens and name not in DIET_OVERRIDES:
        notes.append("gia vị/khác: kiểm tra thành phần")

    return {"name": name, "category_code": cat, "vegetarian": veg, "vegan": vegan,
            "allergens": " ".join(dict.fromkeys(allergens)), "note": "; ".join(notes)}


def load_foods() -> list[dict]:
    return json.loads(FOODS.read_text(encoding="utf-8"))


def write_review_csv(fresh: bool) -> None:
    foods = load_foods()
    kept = {}
    if CSV_PATH.exists() and not fresh:
        with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
            kept = {nfc(r["name"]): r for r in csv.DictReader(fh)}
    rows = [kept.get(nfc(f["name"])) or propose(f) for f in foods]
    added = sum(1 for f in foods if nfc(f["name"]) not in kept)
    gone = sorted(set(kept) - {nfc(f["name"]) for f in foods})
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as fh:   # BOM: Excel opens UTF-8 correctly
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {CSV_PATH.name}: {len(rows)} foods ({added} new proposals, {len(rows) - added} kept).")
    if gone:
        print("Dropped (no longer in food_data_reviewed.json):", ", ".join(gone))


def parse_allergens(text: str, name: str, errors: list) -> dict[str, str]:
    """'SOY WHEAT? GLUTEN?' -> {'SOY': 'CONTAINS', 'WHEAT': 'MAY_CONTAIN', 'GLUTEN': 'MAY_CONTAIN'}"""
    levels = {}
    for token in text.split():
        code = token.rstrip(MAY)
        if code not in ALLERGENS or token.count(MAY) > 1:
            errors.append(f"{name}: unknown allergen {token!r}")
            continue
        if code in levels:
            errors.append(f"{name}: {code} listed twice")
        levels[code] = "MAY_CONTAIN" if token.endswith(MAY) else "CONTAINS"
    wheat, gluten = levels.get("WHEAT"), levels.get("GLUTEN")
    if wheat and (gluten is None or (wheat == "CONTAINS" and gluten != "CONTAINS")):
        errors.append(f"{name}: WHEAT needs GLUTEN at the same level or stronger (wheat contains gluten)")
    return levels


def sql(value) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def write_sql() -> None:
    if not CSV_PATH.exists():
        sys.exit(f"{CSV_PATH.name} not found: run without --sql first and review it.")
    names = {nfc(f["name"]) for f in load_foods()}
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    errors, seed, seen = [], [], set()
    for r in rows:
        name = nfc(r["name"])
        if name in seen:
            errors.append(f"{name}: listed twice")
            continue
        seen.add(name)
        if name not in names:
            errors.append(f"{name}: not in food_data_reviewed.json")
        veg, vegan = DIET.get(r["vegetarian"].strip()), DIET.get(r["vegan"].strip())
        if veg is None or vegan is None:
            errors.append(f"{name}: vegetarian / vegan must be 1, 0 or ?")
        elif (vegan == "YES" and veg != "YES") or (veg == "NO" and vegan != "NO"):
            errors.append(f"{name}: vegan={r['vegan']} does not fit vegetarian={r['vegetarian']}")
        seed.append((name, veg, vegan, parse_allergens(r["allergens"], name, errors)))
    missing = sorted(names - seen)
    if missing:
        errors.append("not labelled: " + ", ".join(missing))
    if errors:
        print("Not written, fix food_labels.csv first:", *errors, sep="\n  ", file=sys.stderr)
        sys.exit(1)

    food_values = ",\n".join(f"    ({sql(n)}, {sql(v)}, {sql(vg)})" for n, v, vg, _ in seed)
    allergen_rows = [(n, code, level) for n, _, _, levels in seed for code, level in sorted(levels.items())]
    allergen_values = ",\n".join(f"    ({sql(n)}, {sql(c)}, {sql(l)})" for n, c, l in allergen_rows)
    may = sum(1 for *_, l in allergen_rows if l == "MAY_CONTAIN")
    out = f"""-- Generated by tools/food-list/food_labels.py from tools/food-list/food_labels.csv.
-- Do not hand-edit: edit the CSV, regenerate, deploy (repeatable migration, re-run when it changes).
-- {len(seed)} food names, {len(allergen_rows)} allergen labels ({may} "may contain").

CREATE TEMP TABLE food_label_seed (name TEXT, vegetarian TEXT, vegan TEXT) ON COMMIT DROP;
CREATE TEMP TABLE food_allergen_seed (name TEXT, allergen TEXT, level TEXT) ON COMMIT DROP;

INSERT INTO food_label_seed VALUES
{food_values};
"""
    if allergen_rows:
        out += f"\nINSERT INTO food_allergen_seed VALUES\n{allergen_values};\n"
    out += """
-- Every label must belong to a food, and every food must be labelled (allergy filtering must not
-- silently skip a food), otherwise nothing is applied.
DO $$
DECLARE
    problem TEXT;
BEGIN
    SELECT string_agg(s.name, ', ') INTO problem
    FROM food_label_seed s
    WHERE NOT EXISTS (SELECT 1 FROM foods f WHERE f.name = s.name);
    IF problem IS NOT NULL THEN
        RAISE EXCEPTION 'food labels: no foods row named %', problem;
    END IF;

    SELECT string_agg(DISTINCT f.name, ', ') INTO problem
    FROM foods f
    WHERE NOT EXISTS (SELECT 1 FROM food_label_seed s WHERE s.name = f.name);
    IF problem IS NOT NULL THEN
        RAISE EXCEPTION 'food labels: not labelled: %', problem;
    END IF;
END $$;

UPDATE foods f
SET vegetarian = s.vegetarian, vegan = s.vegan
FROM food_label_seed s
WHERE f.name = s.name;

DELETE FROM food_allergens;

INSERT INTO food_allergens (food_id, allergen, level)
SELECT f.id, s.allergen, s.level
FROM food_allergen_seed s
JOIN foods f ON f.name = s.name;
"""
    SQL_PATH.write_text(out, encoding="utf-8", newline="\n")
    print(f"Wrote {SQL_PATH.relative_to(ROOT)}: {len(seed)} foods, "
          f"{len(allergen_rows)} allergen labels ({may} may contain).")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sql", action="store_true", help="generate R__food_labels.sql from the reviewed CSV")
    ap.add_argument("--fresh", action="store_true", help="propose every food again (discards the reviewed CSV)")
    args = ap.parse_args()
    write_sql() if args.sql else write_review_csv(args.fresh)


if __name__ == "__main__":
    main()
