#!/usr/bin/env python3
"""Generate the Flyway migration that applies the reviewed food data to the foods table.

Usage (from tools/food-list):
    python export_food_list.py --json      # snapshot of the CURRENT local database -> food_list.json
    python make_migration.py               # -> backend/.../db/migration/V<next>__food_data_cleanup.sql

Inputs:
  food_list.json            the database before the change (export_food_list.py --json)
  food_data_reviewed.json   the reviewed data: names, groups, aliases (rules: claude/food-data-rules.md)
  merges.json               rows that duplicate another row and are folded into it

The migration, in one transaction (Flyway):
  1. merges: meal_items, food_requests, lean_version_id and chat calculation cards move to the kept row,
     then the duplicate row is deleted (its aliases and images go with it: ON DELETE CASCADE)
  2. renames, in two passes through a temporary name, so swaps ("Chanh" <-> "Chanh vàng") never hit
     UNIQUE (name, preparation) halfway
  3. food group changes
  4. every alias is replaced by the reviewed list
  5. chat calculation cards get the new food names (matched by foodId)
  6. source_approximate flags (the USDA item is only the closest match for the Vietnamese food)
Sections with nothing to do are left out. merges.json lists merges for THIS run only: empty it ([])
once the migration that used it is generated.

Options:
  --before PATH   snapshot of the database before the change (default food_list.json from
                  export_food_list.py). When the database is exactly the committed food_data_reviewed.json
                  (the last migration was generated from it), that committed file works too:
                      git show HEAD:tools/food-list/food_data_reviewed.json > before.json
  --name NAME     migration file name after V<n>__ (default food_data_cleanup)
Rows are always found by (name, preparation), never by id: ids differ between databases.
Each step fails the whole migration if a row it expects is missing, so a typo cannot half-apply.
"""
import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MIGRATION_DIR = HERE.parent.parent / "backend" / "src" / "main" / "resources" / "db" / "migration"


def load_rows(path: Path) -> dict[int, dict]:
    rows = {}
    for food in json.loads(path.read_text(encoding="utf-8")):
        for p in food["preparations"]:
            rows[p["id"]] = {**p, "name": food["name"], "category_code": food["category_code"]}
    return rows


def sql(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    return "'" + str(value).replace("'", "''") + "'"


def values(rows: list[tuple]) -> str:
    return ",\n".join("    (" + ", ".join(sql(v) for v in row) + ")" for row in rows)


def check(table: str, expected: int, what: str) -> str:
    return f"""DO $$
BEGIN
    IF (SELECT count(*) FROM {table}) <> {expected} THEN
        RAISE EXCEPTION '{what}: expected {expected} rows, found %', (SELECT count(*) FROM {table});
    END IF;
END $$;"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--before", type=Path, default=HERE / "food_list.json")
    ap.add_argument("--name", default="food_data_cleanup")
    args = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9_]+", args.name):
        sys.exit("--name: lowercase letters, digits and _ only")
    before_path = args.before
    if not before_path.exists():
        sys.exit(f"{before_path} missing: run  python export_food_list.py --json  first (or pass --before)")
    before = load_rows(before_path)
    after = load_rows(HERE / "food_data_reviewed.json")
    merges = json.loads((HERE / "merges.json").read_text(encoding="utf-8"))

    merged_ids = {m["from_id"] for m in merges}
    missing = set(before) - set(after) - merged_ids
    if missing or set(after) - set(before):
        sys.exit(f"ids do not line up: missing {sorted(missing)}, unknown {sorted(set(after) - set(before))}")
    for i in after:
        for field in ("preparation", "source_description"):
            if before[i][field] != after[i][field]:
                sys.exit(f"id {i}: {field} changed; this migration only handles names, groups, aliases "
                         f"and approximate flags")

    merge_rows = [(before[m["from_id"]]["name"], before[m["from_id"]]["preparation"],
                   before[m["into_id"]]["name"], before[m["into_id"]]["preparation"]) for m in merges]
    renames = sorted((before[i]["name"], before[i]["preparation"], after[i]["name"])
                     for i in after if before[i]["name"] != after[i]["name"])
    groups = sorted({(after[i]["name"], after[i]["category_code"])
                     for i in after if before[i]["category_code"] != after[i]["category_code"]})
    aliases = sorted((after[i]["name"], after[i]["preparation"], a, locks)
                     for i in after
                     for locks, key in ((False, "aliases"), (True, "locking_aliases"))
                     for a in after[i][key])

    approx = sorted((after[i]["name"], after[i]["preparation"], bool(after[i]["source_approximate"]))
                    for i in after if bool(before[i]["source_approximate"]) != bool(after[i]["source_approximate"]))

    versions = [int(m.group(1)) for f in MIGRATION_DIR.glob("V*__*.sql") if (m := re.match(r"V(\d+)__", f.name))]
    out = MIGRATION_DIR / f"V{max(versions) + 1}__{args.name}.sql"
    sections = [f"""-- Generated by tools/food-list/make_migration.py from food_data_reviewed.json and merges.json.
-- Do not hand-edit: fix the JSON and regenerate. Rules: docs in the project, food-data-rules.
-- {len(merge_rows)} merges, {len(renames)} renames, {len(groups)} group changes, {len(aliases)} aliases,
-- {len(approx)} approximate flag changes.
"""]
    if merge_rows:
        sections.append(f"""
-- 1. Merge duplicate rows into the row that stays ---------------------------------------------------
CREATE TEMP TABLE merge_seed (from_name TEXT, from_prep TEXT, into_name TEXT, into_prep TEXT) ON COMMIT DROP;
INSERT INTO merge_seed VALUES
{values(merge_rows)};

CREATE TEMP TABLE merge_map ON COMMIT DROP AS
SELECT f.id AS from_id, t.id AS into_id
FROM merge_seed s
JOIN foods f ON f.name = s.from_name AND f.preparation = s.from_prep
JOIN foods t ON t.name = s.into_name AND t.preparation = s.into_prep;
{check('merge_map', len(merge_rows), 'merge: rows not found')}

UPDATE meal_items m SET food_id = mm.into_id FROM merge_map mm WHERE m.food_id = mm.from_id;
UPDATE food_requests r SET food_id = mm.into_id FROM merge_map mm WHERE r.food_id = mm.from_id;
UPDATE foods f SET lean_version_id = mm.into_id FROM merge_map mm WHERE f.lean_version_id = mm.from_id;
-- chat calculation cards point at foods by foodId too
UPDATE chat_messages c
SET calculation = jsonb_set(c.calculation, '{{items}}', (
    SELECT jsonb_agg(CASE WHEN mm.into_id IS NULL THEN e.item
                          ELSE jsonb_set(e.item, '{{foodId}}', to_jsonb(mm.into_id)) END ORDER BY e.ord)
    FROM jsonb_array_elements(c.calculation -> 'items') WITH ORDINALITY AS e(item, ord)
    LEFT JOIN merge_map mm ON mm.from_id = (e.item ->> 'foodId')::bigint))
WHERE jsonb_typeof(c.calculation -> 'items') = 'array' AND jsonb_array_length(c.calculation -> 'items') > 0;
DELETE FROM foods f USING merge_map mm WHERE f.id = mm.from_id;
""")
    if renames:
        sections.append(f"""
-- 2. Rename (two passes: a temporary unique name first, so name swaps never collide) -------------------
CREATE TEMP TABLE rename_seed (old_name TEXT, preparation TEXT, new_name TEXT) ON COMMIT DROP;
INSERT INTO rename_seed VALUES
{values(renames)};

CREATE TEMP TABLE rename_map ON COMMIT DROP AS
SELECT f.id, s.new_name FROM rename_seed s JOIN foods f ON f.name = s.old_name AND f.preparation = s.preparation;
{check('rename_map', len(renames), 'rename: rows not found')}

UPDATE foods f SET name = '~renaming~' || f.id FROM rename_map r WHERE f.id = r.id;
UPDATE foods f SET name = r.new_name FROM rename_map r WHERE f.id = r.id;
""")
    if groups:
        sections.append(f"""
-- 3. Food groups -------------------------------------------------------------------------------------------
CREATE TEMP TABLE group_seed (name TEXT, category_code TEXT) ON COMMIT DROP;
INSERT INTO group_seed VALUES
{values(groups)};

UPDATE foods f SET category_id = c.id
FROM group_seed s JOIN food_categories c ON c.code = s.category_code
WHERE f.name = s.name;
""")
    sections.append(f"""
-- 4. Aliases: the reviewed list replaces every alias ---------------------------------------------------------
CREATE TEMP TABLE alias_seed (name TEXT, preparation TEXT, alias TEXT, locks BOOLEAN) ON COMMIT DROP;
INSERT INTO alias_seed VALUES
{values(aliases)};

DO $$
DECLARE missing TEXT;
BEGIN
    SELECT string_agg(DISTINCT s.name || ' ' || s.preparation, ', ') INTO missing
    FROM alias_seed s LEFT JOIN foods f ON f.name = s.name AND f.preparation = s.preparation
    WHERE f.id IS NULL;
    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'alias seed: no foods row for %', missing;
    END IF;
END $$;

DELETE FROM food_aliases;
INSERT INTO food_aliases (food_id, alias, locks_preparation)
SELECT f.id, s.alias, s.locks
FROM alias_seed s JOIN foods f ON f.name = s.name AND f.preparation = s.preparation;

-- 5. Chat calculation cards show the current food names ------------------------------------------------------
UPDATE chat_messages c
SET calculation = jsonb_set(c.calculation, '{{items}}', (
    SELECT jsonb_agg(CASE WHEN f.id IS NULL THEN e.item
                          ELSE jsonb_set(e.item, '{{food}}', to_jsonb(f.name)) END ORDER BY e.ord)
    FROM jsonb_array_elements(c.calculation -> 'items') WITH ORDINALITY AS e(item, ord)
    LEFT JOIN foods f ON f.id = (e.item ->> 'foodId')::bigint))
WHERE jsonb_typeof(c.calculation -> 'items') = 'array' AND jsonb_array_length(c.calculation -> 'items') > 0;
""")
    if approx:
        sections.append(f"""
-- 6. Approximate flags: the USDA item is only the closest match for the Vietnamese food ------------------------
CREATE TEMP TABLE approx_seed (name TEXT, preparation TEXT, approximate BOOLEAN) ON COMMIT DROP;
INSERT INTO approx_seed VALUES
{values(approx)};

CREATE TEMP TABLE approx_map ON COMMIT DROP AS
SELECT f.id, s.approximate FROM approx_seed s JOIN foods f ON f.name = s.name AND f.preparation = s.preparation;
{check('approx_map', len(approx), 'approximate flags: rows not found')}

UPDATE foods f SET source_approximate = a.approximate FROM approx_map a WHERE f.id = a.id;
""")
    text = "".join(sections)
    out.write_text(text, encoding="utf-8", newline="\n")
    print(f"{out.name}: {len(merge_rows)} merges, {len(renames)} renames, {len(groups)} group changes, "
          f"{len(aliases)} aliases, {len(approx)} approximate flag changes")


if __name__ == "__main__":
    main()
