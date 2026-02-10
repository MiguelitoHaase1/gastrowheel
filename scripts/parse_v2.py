#!/usr/bin/env python3
"""
Parse IngredientTagsV2.csv (3-row hierarchical header) and merge with
Gastrowheel_tags .csv (wheel assignments).

Outputs:
  - v2_parsed.json   : full ingredient data with all tags + wheels
  - v2_columns.json  : column hierarchy (top -> mid -> column name)
"""

import csv
import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
V2_PATH = BASE_DIR / "IngredientTagsV2.csv"
GW_PATH = BASE_DIR / "Gastrowheel_tags .csv"
OUT_PARSED = Path(__file__).resolve().parent / "v2_parsed.json"
OUT_COLUMNS = Path(__file__).resolve().parent / "v2_columns.json"

WHEEL_COLS = [
    "Sour_wheel", "Umami_wheel", "Oil_wheel", "Crunch_wheel",
    "Sweet_wheel", "Aroma_wheel", "Fresh_wheel", "Soft_wheel",
    "Bitter_wheel", "Spicy_wheel",
]


# ---------------------------------------------------------------------------
# 1. Parse V2 headers (rows 0-2) and build column structure
# ---------------------------------------------------------------------------

def is_numeric(s: str) -> bool:
    """Check if a string is purely numeric (used to detect wheel count labels)."""
    try:
        int(s)
        return True
    except ValueError:
        return False


def build_column_structure(raw_top, raw_mid, raw_col, n_cols):
    """
    Build resolved top/mid/name for each data column (index >= 2).

    Rules:
    - Forward-fill top-level across empty cells, BUT numeric top values
      (29, 43, ...) on the wheel columns get replaced with "GastroTags".
    - Forward-fill mid-level across empty cells ONLY within the same
      top-level span. When a new top-level starts, mid resets.
    - Columns where the top row contains "301" are kept as top="Dish components"
      since 301 appears to be a spreadsheet artifact. Its mid inherits "Splash"
      from the prior column.
    """
    columns = []

    current_top = ""
    current_mid = ""

    for i in range(2, n_cols):
        raw_t = raw_top[i].strip() if i < len(raw_top) else ""
        raw_m = raw_mid[i].strip() if i < len(raw_mid) else ""
        name = raw_col[i].strip() if i < len(raw_col) else ""

        if not name:
            continue  # skip columns with no row-3 name

        # --- Resolve top-level ---
        if raw_t:
            if is_numeric(raw_t) and name.endswith("_wheel"):
                # Numeric top on wheel columns -> group under GastroTags
                resolved_top = "GastroTags"
            elif raw_t == "301":
                # "301" is a spreadsheet artifact for LiquidAromas
                # Keep it under "Dish components" (the previous top)
                resolved_top = current_top  # stays "Dish components"
            else:
                resolved_top = raw_t
        else:
            resolved_top = current_top  # forward-fill

        # Detect top-level boundary (reset mid when top changes)
        top_changed = resolved_top != current_top
        current_top = resolved_top

        # --- Resolve mid-level ---
        if raw_m:
            if raw_m == "GastroTags" and name.endswith("_wheel"):
                # "GastroTags" on mid-level for wheel cols -> use as top, no mid
                current_mid = ""
                resolved_mid = ""
            else:
                current_mid = raw_m
                resolved_mid = raw_m
        elif top_changed:
            # New top-level category with no explicit mid -> reset mid
            current_mid = ""
            resolved_mid = ""
        else:
            # Forward-fill mid within the same top-level
            resolved_mid = current_mid

        columns.append({
            "index": i,
            "top": resolved_top,
            "mid": resolved_mid,
            "name": name,
        })

    return columns


def parse_v2(path: str):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)

    # --- Header rows (0, 1, 2) ---
    raw_top = rows[0]
    raw_mid = rows[1]
    raw_col = rows[2]

    # Determine column count from the widest row
    n_cols = max(len(raw_top), len(raw_mid), len(raw_col))
    if len(rows) > 3:
        n_cols = max(n_cols, max(len(r) for r in rows[3:] if r))

    # Pad helper
    def pad(r):
        return r + [""] * (n_cols - len(r))

    raw_top = pad(raw_top)
    raw_mid = pad(raw_mid)
    raw_col = pad(raw_col)

    columns = build_column_structure(raw_top, raw_mid, raw_col, n_cols)

    # Build hierarchy dict: top -> mid -> [col_names]
    # Use "(none)" as mid-level key when mid is empty for cleaner JSON
    hierarchy = {}
    for col in columns:
        top = col["top"]
        mid = col["mid"] if col["mid"] else "(none)"
        name = col["name"]
        hierarchy.setdefault(top, {}).setdefault(mid, []).append(name)

    # --- Data rows ---
    ingredients_v2 = {}
    for row in rows[3:]:
        if not row or not row[0].strip():
            continue
        row = pad(row) if len(row) < n_cols else row
        ing_id = int(row[0].strip())
        ing_name = row[1].strip()

        tags = {}
        for col in columns:
            i = col["index"]
            top = col["top"]
            mid = col["mid"] if col["mid"] else "(none)"
            name = col["name"]
            raw_val = row[i].strip().lower() if i < len(row) else ""
            is_present = raw_val == "x"
            tags.setdefault(top, {}).setdefault(mid, {})[name] = is_present

        ingredients_v2[ing_id] = {
            "id": ing_id,
            "name": ing_name,
            "name_normalized": ing_name.lower().strip(),
            "tags": tags,
        }

    return ingredients_v2, columns, hierarchy


# ---------------------------------------------------------------------------
# 2. Parse GW (wheel assignments)
# ---------------------------------------------------------------------------

def parse_gw(path: str):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = [h.strip() for h in rows[0]]
    wheels = {}
    for row in rows[1:]:
        if not row or not row[0].strip():
            continue
        ing_id = int(row[0].strip())
        wheel_data = {}
        for ci, col_name in enumerate(header[2:], start=2):
            val = row[ci].strip().lower() if ci < len(row) else ""
            wheel_data[col_name] = val == "x"
        wheels[ing_id] = wheel_data
    return wheels


# ---------------------------------------------------------------------------
# 3. Merge and output
# ---------------------------------------------------------------------------

def main():
    print(f"V2 file: {V2_PATH}")
    print(f"GW file: {GW_PATH}")

    ingredients_v2, columns, hierarchy = parse_v2(str(V2_PATH))
    wheels = parse_gw(str(GW_PATH))

    # Merge wheel data into ingredients
    merged = []
    missing_wheel = 0
    for ing_id in sorted(ingredients_v2.keys()):
        ing = ingredients_v2[ing_id]
        if ing_id in wheels:
            ing["wheels"] = wheels[ing_id]
        else:
            ing["wheels"] = {w: False for w in WHEEL_COLS}
            missing_wheel += 1
        merged.append(ing)

    # Build output
    output = {
        "meta": {
            "total_ingredients": len(merged),
            "total_tag_columns": len(columns),
            "wheel_columns": WHEEL_COLS,
            "top_level_categories": list(hierarchy.keys()),
        },
        "column_structure": columns,
        "ingredients": merged,
    }

    # Write main parsed JSON
    with open(OUT_PARSED, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {OUT_PARSED}  ({os.path.getsize(OUT_PARSED):,} bytes)")

    # Write column hierarchy JSON
    with open(OUT_COLUMNS, "w", encoding="utf-8") as f:
        json.dump(hierarchy, f, indent=2, ensure_ascii=False)
    print(f"Wrote {OUT_COLUMNS}  ({os.path.getsize(OUT_COLUMNS):,} bytes)")

    # Summary
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Ingredients parsed from V2:  {len(ingredients_v2)}")
    print(f"  Wheel entries from GW:       {len(wheels)}")
    print(f"  Ingredients missing wheels:   {missing_wheel}")
    print(f"  Total tag columns (excl ID/Name): {len(columns)}")

    # Top-level categories
    print(f"\n  Top-level categories ({len(hierarchy)}):")
    for top, mids in hierarchy.items():
        col_count = sum(len(cols) for cols in mids.values())
        mid_names = [m for m in mids.keys() if m != "(none)"]
        mid_str = f" -> [{', '.join(mid_names)}]" if mid_names else ""
        print(f"    {top}: {col_count} cols{mid_str}")

    # Verify wheel data consistency: compare V2 wheel tags vs GW wheel data
    print(f"\n  Wheel data consistency check:")
    mismatches = 0
    for ing in merged:
        for wc in WHEEL_COLS:
            v2_val = ing["tags"].get("GastroTags", {}).get("(none)", {}).get(wc, False)
            gw_val = ing["wheels"].get(wc, False)
            if v2_val != gw_val:
                mismatches += 1
                if mismatches <= 3:
                    print(f"    MISMATCH [{ing['id']}] {ing['name']}: {wc} V2={v2_val} GW={gw_val}")
    if mismatches == 0:
        print(f"    All wheel values match between V2 and GW files.")
    else:
        print(f"    Total mismatches: {mismatches}")

    # Sample entries
    print(f"\n{'='*60}")
    print(f"  SAMPLE INGREDIENTS")
    print(f"{'='*60}")
    samples = [merged[0], merged[1], merged[2], merged[len(merged)//2], merged[-1]]
    for ing in samples:
        print(f"\n  [{ing['id']}] {ing['name']} (normalized: '{ing['name_normalized']}')")
        # Show active tags grouped by category
        for top in hierarchy.keys():
            if top not in ing["tags"]:
                continue
            active_in_cat = []
            for mid, cols in ing["tags"][top].items():
                for col_name, val in cols.items():
                    if val:
                        prefix = f"{mid}/" if mid != "(none)" else ""
                        active_in_cat.append(f"{prefix}{col_name}")
            if active_in_cat:
                print(f"    {top}: {', '.join(active_in_cat)}")
        # Show wheels
        active_wheels = [w for w, v in ing["wheels"].items() if v]
        print(f"    Wheels: {active_wheels if active_wheels else '(none)'}")

    print()


if __name__ == "__main__":
    main()
