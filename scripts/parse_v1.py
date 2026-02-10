"""
Parse the V1 IngredientTags.csv file and output structured JSON.

Reads the legacy CSV with ingredient names, IDs, and boolean tag columns.
Outputs v1_parsed.json with:
  - All ingredients with id, name, normalized_name, and tag values
  - Summary of all column headers
  - List of all unique normalized ingredient names
"""

import csv
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "..", "IngredientTags.csv")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "v1_parsed.json")


def parse_v1():
    ingredients = []
    all_headers = []
    unique_names = set()

    # Try multiple encodings gracefully
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            with open(CSV_PATH, "r", encoding=encoding) as f:
                reader = csv.reader(f)
                header_row = next(reader)

                # First column = ingredient name, second = id, rest = tag columns
                # The header row has empty strings for the first two columns
                tag_columns = [h.strip() for h in header_row[2:]]
                all_headers = [header_row[0].strip() or "name", header_row[1].strip() or "id"] + tag_columns

                for row_num, row in enumerate(reader, start=2):
                    if not row or not row[0].strip():
                        continue

                    original_name = row[0].strip()
                    normalized_name = original_name.lower().strip()

                    # Parse ID (second column)
                    try:
                        ingredient_id = int(row[1].strip()) if len(row) > 1 and row[1].strip() else None
                    except ValueError:
                        ingredient_id = None

                    # Parse tag columns as booleans
                    tags = {}
                    for i, tag_name in enumerate(tag_columns):
                        col_index = i + 2
                        if col_index < len(row):
                            val = row[col_index].strip()
                            tags[tag_name] = True if val == "1" else False
                        else:
                            tags[tag_name] = False

                    ingredient = {
                        "id": ingredient_id,
                        "name": original_name,
                        "normalized_name": normalized_name,
                        "tags": tags,
                    }
                    ingredients.append(ingredient)
                    unique_names.add(normalized_name)

            # If we got here, encoding worked
            break
        except UnicodeDecodeError:
            continue
    else:
        print("ERROR: Could not decode CSV with any supported encoding.", file=sys.stderr)
        sys.exit(1)

    # Sort unique names for consistent output
    sorted_unique_names = sorted(unique_names)

    output = {
        "summary": {
            "total_ingredients": len(ingredients),
            "total_unique_names": len(sorted_unique_names),
            "column_headers": all_headers,
            "tag_columns": tag_columns,
            "tag_count": len(tag_columns),
        },
        "unique_names": sorted_unique_names,
        "ingredients": ingredients,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return output


if __name__ == "__main__":
    result = parse_v1()

    print(f"Ingredients parsed: {result['summary']['total_ingredients']}")
    print(f"Unique names: {result['summary']['total_unique_names']}")
    print(f"Tag columns: {result['summary']['tag_count']}")
    print(f"\nJSON written to: {OUTPUT_PATH}")

    print("\n--- First 5 entries (sanity check) ---")
    for entry in result["ingredients"][:5]:
        active_tags = [k for k, v in entry["tags"].items() if v]
        print(f"  [{entry['id']}] {entry['name']} (normalized: {entry['normalized_name']})")
        print(f"       Active tags ({len(active_tags)}): {', '.join(active_tags[:10])}{'...' if len(active_tags) > 10 else ''}")
