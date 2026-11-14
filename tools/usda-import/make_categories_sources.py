#!/usr/bin/env python3
"""Generate V18__food_categories_sources_images.sql: food groups, data sources and food images.

Usage (from tools/usda-import):  python3 make_categories_sources.py

What it does:
  - food_categories: 8 groups for the food library filter. Each food row gets one, from the section
    header it sits under in V5/V7 ("===== meat =====") plus a few fixes by name (see NAME_CATEGORY).
  - food_sources: one row per dataset (USDA SR Legacy, USDA Foundation). The free-text foods.source
    ("USDA FDC 168878 (SR Legacy)") is split into source_id + source_ref, so the app links to the
    source item from a template instead of parsing text. Estimates (ƯỚC TÍNH) keep their text in source_note.
  - The 2 rows written as "USDA SR Legacy NDB 11503" get their FDC id from USDA's sr_legacy_food.csv,
    and their source_description from food.csv, like every other SR Legacy row (V17).
  - food_images: empty table; images are added by later migrations, with credit and license per image.

The old foods.source column is dropped later (V19), once the code no longer reads it.
"""
import csv
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MIG_DIR = HERE.parent.parent / "backend" / "src" / "main" / "resources" / "db" / "migration"
SR_DIR = next((HERE / "data" / "sr_legacy").glob("*/"), None)
FILES = ["V5__seed_foods.sql", "V7__more_foods.sql", "V10__pork_rib_cuts.sql"]
OUT = MIG_DIR / "V18__food_categories_sources_images.sql"

CATEGORIES = [  # code, name, sort order = list order
    ("STARCH", "Tinh bột"), ("MEAT", "Thịt"), ("SEAFOOD", "Cá & hải sản"), ("EGG_DAIRY", "Trứng & sữa"),
    ("LEGUME_NUT", "Đậu & hạt"), ("VEGETABLE", "Rau"), ("FRUIT", "Trái cây"), ("OTHER", "Gia vị & khác"),
]
# Section header in the migration files -> category. None = decided by name (NAME_CATEGORY).
SECTION_CATEGORY = {
    "Tinh bột": "STARCH", "grain": "STARCH", "single": "STARCH",
    "Rau": "VEGETABLE", "veg": "VEGETABLE", "herb": "VEGETABLE",
    "meat": "MEAT", "organ": "MEAT",
    "fish": "SEAFOOD", "shell": "SEAFOOD",
    "egg": "EGG_DAIRY", "dairy": "EGG_DAIRY",
    "legume": "LEGUME_NUT", "nut": "LEGUME_NUT",
    "Trái cây": "FRUIT", "fruit": "FRUIT",
    "cond": "OTHER", "fat": "OTHER", "drink": "OTHER",
    "Đạm": None, "Gia vị, sữa, khác": None,
}
# Mixed V5 sections, and starchy roots that USDA files under vegetables but Vietnamese meals count as starch
NAME_CATEGORY = {
    "Ức gà": "MEAT", "Đùi gà": "MEAT", "Thịt heo nạc": "MEAT", "Thịt ba chỉ": "MEAT", "Sườn heo": "MEAT", "Thịt bò": "MEAT",
    "Trứng gà": "EGG_DAIRY", "Đậu phụ": "LEGUME_NUT", "Cá basa": "SEAFOOD", "Cá hồi": "SEAFOOD", "Tôm": "SEAFOOD",
    "Sữa tươi không đường": "EGG_DAIRY", "Sữa chua không đường": "EGG_DAIRY",
    "Dầu ăn": "OTHER", "Nước mắm": "OTHER", "Đường": "OTHER",
    "Khoai tây": "STARCH", "Khoai môn": "STARCH", "Khoai mì": "STARCH", "Ngô": "STARCH",
}
FILE_CATEGORY = {"V10__pork_rib_cuts.sql": "MEAT"}  # no section headers in that file

SOURCES = [  # code, name, publisher, url, license, item url template ({ref} = the item id)
    ("USDA_SR_LEGACY", "USDA FoodData Central – SR Legacy", "U.S. Department of Agriculture, Agricultural Research Service",
     "https://fdc.nal.usda.gov", "CC0 1.0 (public domain)", "https://fdc.nal.usda.gov/food-details/{ref}/nutrients"),
    ("USDA_FOUNDATION", "USDA FoodData Central – Foundation Foods", "U.S. Department of Agriculture, Agricultural Research Service",
     "https://fdc.nal.usda.gov", "CC0 1.0 (public domain)", "https://fdc.nal.usda.gov/food-details/{ref}/nutrients"),
]
DATASET_SOURCE = {"SR Legacy": "USDA_SR_LEGACY", "Foundation": "USDA_FOUNDATION"}

ROW = re.compile(r"^\('((?:[^']|'')+)',\s*'([A-Z]+)',.*,\s*'((?:[^']|'')+)'\)[,;]")
SECTION = re.compile(r"^-- =====\s*(.+?)\s*=====")
FDC = re.compile(r"^USDA FDC (\d+) \((SR Legacy|Foundation)\)$")
NDB = re.compile(r"^USDA SR Legacy NDB (\d+)$")
ESTIMATE = "ƯỚC TÍNH"


def sql(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    return "'" + str(v).replace("'", "''") + "'"


def read_csv(name: str, key: str, value: str) -> dict[str, str]:
    with (SR_DIR / name).open(encoding="utf-8", newline="") as f:
        return {r[key]: r[value].strip() for r in csv.DictReader(f)}


def main() -> None:
    if SR_DIR is None:
        sys.exit("SR Legacy download not found under data/sr_legacy/")
    ndb_to_fdc = {v: k for k, v in read_csv("sr_legacy_food.csv", "fdc_id", "NDB_number").items()}
    descriptions = read_csv("food.csv", "fdc_id", "description")

    rows, problems = [], []
    for file in FILES:
        section = None
        for line_no, line in enumerate((MIG_DIR / file).read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if m := SECTION.match(line):
                section = m.group(1)
                continue
            m = ROW.match(line)
            if not m:
                continue
            name, prep, source = m.group(1), m.group(2), m.group(3).replace("''", "'")
            where = f"{file}:{line_no} {name} {prep}"

            category = NAME_CATEGORY.get(name) or FILE_CATEGORY.get(file) or SECTION_CATEGORY.get(section)
            if category is None:
                problems.append(f"{where}: no category (section {section!r})")

            ref, note, estimated, ndb_description = None, None, False, None
            if f := FDC.match(source):
                ref, code = f.group(1), DATASET_SOURCE[f.group(2)]
            elif n := NDB.match(source):
                code, ref = "USDA_SR_LEGACY", ndb_to_fdc.get(n.group(1))
                ndb_description = descriptions.get(ref or "")
                if ref is None or ndb_description is None:
                    problems.append(f"{where}: NDB {n.group(1)} not in SR Legacy")
            elif source.startswith(ESTIMATE):
                code, estimated, note = "USDA_SR_LEGACY", True, source
            else:
                problems.append(f"{where}: unknown source format {source!r}")
                continue
            rows.append((name, prep, category, code, ref, estimated, note, ndb_description))

    if problems:
        sys.exit("Fix these first:\n  " + "\n  ".join(problems))

    cats = ",\n".join(f"    ({sql(c)}, {sql(n)}, {i + 1})" for i, (c, n) in enumerate(CATEGORIES))
    srcs = ",\n".join("    (" + ", ".join(sql(v) for v in s) + ")" for s in SOURCES)
    seed = ",\n".join("    (" + ", ".join(sql(v) for v in r) + ")" for r in rows)
    counts = {c: sum(1 for r in rows if r[2] == c) for c, _ in CATEGORIES}

    OUT.write_text(f"""-- Food groups, data sources and food images (food library page: filter by group and by source).
-- Generated by tools/usda-import/make_categories_sources.py. Do not hand-edit; regenerate.
-- Rows per group: {", ".join(f"{c} {n}" for c, n in counts.items())}

CREATE TABLE food_categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       VARCHAR(32)  NOT NULL UNIQUE,
    name       VARCHAR(60)  NOT NULL,
    sort_order SMALLINT     NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One row per dataset. A new source (e.g. the Vietnamese food composition table) is a new row, not new code.
CREATE TABLE food_sources (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code              VARCHAR(32)  NOT NULL UNIQUE,
    name              VARCHAR(120) NOT NULL,
    publisher         VARCHAR(160) NOT NULL,
    url               TEXT         NOT NULL,
    license           VARCHAR(120) NOT NULL,
    item_url_template TEXT CHECK (item_url_template LIKE '%{{ref}}%'), -- link to one item; NULL = no item pages
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Several photos per food row (raw rice and cooked rice look different). Files live in frontend/public/,
-- so path is relative to it. Every image keeps its own credit and license: only own, CC0 or reusable photos.
CREATE TABLE food_images (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    food_id    BIGINT       NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    path       VARCHAR(200) NOT NULL UNIQUE CHECK (path ~ '^foods/[a-z0-9-]+\\.webp$'),
    alt        VARCHAR(200) NOT NULL,
    credit     VARCHAR(200) NOT NULL,
    license    VARCHAR(60)  NOT NULL,
    source_url TEXT,
    sort_order SMALLINT     NOT NULL DEFAULT 0, -- smallest = the main photo
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (food_id, sort_order)
);

ALTER TABLE foods
    ADD COLUMN category_id BIGINT REFERENCES food_categories (id),
    ADD COLUMN source_id   BIGINT REFERENCES food_sources (id),
    ADD COLUMN source_ref  VARCHAR(40),          -- the item id at the source, e.g. the FDC id
    ADD COLUMN estimated   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN source_note TEXT;                 -- how an estimated row was computed

INSERT INTO food_categories (code, name, sort_order) VALUES
{cats};

INSERT INTO food_sources (code, name, publisher, url, license, item_url_template) VALUES
{srcs};

CREATE TEMP TABLE food_seed (
    name TEXT, preparation TEXT, category TEXT, source TEXT, source_ref TEXT, estimated BOOLEAN, note TEXT,
    description TEXT -- only for the NDB rows that V17 could not describe
) ON COMMIT DROP;
INSERT INTO food_seed VALUES
{seed};

-- Fail rather than half-fill: every seed row must match exactly one food, and every food must be seeded
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM food_seed s
               WHERE NOT EXISTS (SELECT 1 FROM foods f WHERE f.name = s.name AND f.preparation = s.preparation)) THEN
        RAISE EXCEPTION 'food_seed has a (name, preparation) that does not exist';
    END IF;
    IF EXISTS (SELECT 1 FROM foods f
               WHERE NOT EXISTS (SELECT 1 FROM food_seed s WHERE s.name = f.name AND s.preparation = f.preparation)) THEN
        RAISE EXCEPTION 'a food row is missing from food_seed: regenerate V18';
    END IF;
END $$;

UPDATE foods f
SET category_id        = c.id,
    source_id          = src.id,
    source_ref         = s.source_ref,
    estimated          = s.estimated,
    source_note        = s.note,
    source_description = COALESCE(f.source_description, s.description)
FROM food_seed s
JOIN food_categories c ON c.code = s.category
JOIN food_sources src ON src.code = s.source
WHERE f.name = s.name AND f.preparation = s.preparation;

ALTER TABLE foods
    ALTER COLUMN category_id SET NOT NULL,
    ALTER COLUMN source_id SET NOT NULL,
    -- an estimate has no single item to point at; every other row must say which item it is
    ADD CONSTRAINT ck_foods_source_ref CHECK (estimated OR source_ref IS NOT NULL),
    ADD CONSTRAINT ck_foods_estimate_note CHECK (NOT estimated OR source_note IS NOT NULL);

CREATE INDEX idx_foods_category ON foods (category_id);
CREATE INDEX idx_foods_source ON foods (source_id);
""", encoding="utf-8", newline="\r\n")  # CRLF like the other migrations
    print(f"Wrote {OUT.name}: {len(rows)} foods; " + ", ".join(f"{c} {n}" for c, n in counts.items()))


if __name__ == "__main__":
    main()
