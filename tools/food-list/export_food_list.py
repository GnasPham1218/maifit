#!/usr/bin/env python3
"""List every food in the LOCAL database with its group and its aliases (everyday names).

Usage (from tools/food-list, with `docker compose up -d db` running):
    python export_food_list.py            -> food_list.csv  (opens in Excel)
    python export_food_list.py --json     -> food_list.json (grouped by food name, for scripts)

One CSV line per foods row (food + preparation): its id (only valid in THIS database: ids differ between
your machine and production, so migrations match foods by name + preparation), with the original name at the data source
(source_description, e.g. the USDA description; empty for estimated rows) and source_approximate
(t = USDA has no exact match for this Vietnamese food, the closest item is used).
Aliases are split in two columns:
  - aliases:          everyday names that say nothing about cooking ("Gà" -> Ức gà)
  - locking_aliases:  names that already say how it is cooked ("Cơm" -> Gạo tẻ, boiled)
Reads POSTGRES_USER / POSTGRES_DB from the repo's .env and runs psql inside the maifit-db container,
so nothing extra is installed.
"""
import argparse
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent

SQL = """
COPY (
    SELECT f.id,
           f.name,
           f.preparation,
           c.code AS category_code,
           c.name AS category,
           coalesce(f.source_description, '') AS source_description,
           f.source_approximate,
           coalesce(string_agg(a.alias, '; ' ORDER BY a.alias) FILTER (WHERE NOT a.locks_preparation), '') AS aliases,
           coalesce(string_agg(a.alias, '; ' ORDER BY a.alias) FILTER (WHERE a.locks_preparation), '') AS locking_aliases
    FROM foods f
    JOIN food_categories c ON c.id = f.category_id
    LEFT JOIN food_aliases a ON a.food_id = f.id
    GROUP BY f.id, c.id
    ORDER BY c.sort_order, f.name, f.preparation
) TO STDOUT WITH CSV HEADER
"""


def read_env() -> dict[str, str]:
    env = {}
    for line in (REPO / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"')
    return env


def query() -> list[dict[str, str]]:
    env = read_env()
    result = subprocess.run(
        ["docker", "exec", "maifit-db", "psql", "-U", env["POSTGRES_USER"], "-d", env["POSTGRES_DB"], "-c", SQL],
        capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        sys.exit(f"psql failed (is the db container running? docker compose up -d db):\n{result.stderr}")
    return list(csv.DictReader(io.StringIO(result.stdout)))


def split(text: str) -> list[str]:
    return [part for part in text.split("; ") if part]


def write_csv(rows: list[dict[str, str]]) -> Path:
    out = HERE / "food_list.csv"
    # utf-8-sig: Excel on Windows then shows Vietnamese accents correctly
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return out


def write_json(rows: list[dict[str, str]]) -> Path:
    # One entry per food name: its group, then each preparation with that row's aliases
    foods: dict[str, dict] = {}
    for row in rows:
        food = foods.setdefault(row["name"], {
            "name": row["name"], "category_code": row["category_code"], "category": row["category"],
            "preparations": []})
        food["preparations"].append({
            "id": int(row["id"]),
            "preparation": row["preparation"],
            "source_description": row["source_description"] or None,
            "source_approximate": row["source_approximate"] == "t",
            "aliases": split(row["aliases"]),
            "locking_aliases": split(row["locking_aliases"])})
    out = HERE / "food_list.json"
    out.write_text(json.dumps(list(foods.values()), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="write food_list.json instead of food_list.csv")
    args = parser.parse_args()

    rows = query()
    if not rows:
        sys.exit("The foods table is empty.")
    out = write_json(rows) if args.json else write_csv(rows)
    names = len({r["name"] for r in rows})
    with_alias = sum(1 for r in rows if r["aliases"] or r["locking_aliases"])
    print(f"{len(rows)} rows ({names} food names, {with_alias} rows with aliases) -> {out.name}")


if __name__ == "__main__":
    main()
