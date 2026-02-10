"""
Build the unified Gastrowheel source-of-truth CSV.

Strategy:
1. V2 + GW = canonical base (341 ingredients, IDs 1-357)
2. V1 matched by normalized name → merge additional tags (dietary, cuisine from V1)
3. V1-only ingredients → add with new IDs starting at 400, assign wheel categories
4. CommonIngredients.xlsx → merge market commonality data
5. GW wheel assignments take priority (they're the most curated)

Output: gastrowheel_unified.csv — flat CSV with all tags as columns.
"""

import csv
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

V1_JSON = os.path.join(SCRIPT_DIR, "v1_parsed.json")
V2_JSON = os.path.join(SCRIPT_DIR, "v2_parsed.json")
EXCEL_JSON = os.path.join(SCRIPT_DIR, "excel_parsed.json")
OUTPUT_CSV = os.path.join(PROJECT_DIR, "gastrowheel_unified.csv")
REPORT_PATH = os.path.join(SCRIPT_DIR, "merge_report.txt")

# ── Name normalization map ──────────────────────────────────────────
# V1 name → V2 name (for cases where fuzzy matching alone won't work)
NAME_ALIASES = {
    "agave syrup": "agave nectar",
    "almonds": "almond",
    "apples": "apple",
    "dried apricots": "apricot",
    "artichoke hearts": "artichoke hearths",
    "blackberries": "blackberry",
    "blueberries": "blueberry",
    "cranberries": "cranberry",
    "dates": "date",
    "figs": "fig",
    "grapes": "grape",
    "green beans": "green bean",
    "green olives": "green olive",
    "kalamata olives": "kalamata olive",
    "lemons": "lemon",
    "limes": "lime",
    "mangoes": "mango",
    "mushrooms": "mushroom",
    "nectarines": "nectarine",
    "oranges": "orange",
    "peaches": "peach",
    "peanuts": "peanut",
    "pears": "pear",
    "pecans": "pecan",
    "pickles": "pickle",
    "pineapples": "pineapple",
    "pistachios": "pistachio",
    "plums": "plum",
    "prunes": "prune",
    "radishes": "radish",
    "raisins": "raisin",
    "raspberries": "raspberry",
    "scallions": "scallion",
    "shallots": "shallot",
    "strawberries": "strawberry",
    "tangerines": "tangerine",
    "tomatoes": "tomato",
    "turnips": "turnip",
    "walnuts": "walnut",
    "watermelon": "water melon",
    "red onion": "red onions",
    "spring onion": "spring onions",
    "cherry tomato": "cherry tomatoes",
    "sun-dried tomatoes": "sundried tomato",
    "sun dried tomatoes": "sundried tomato",
    "butterhead lettuce": "boston lettuce",
    "yellow pepper": "yellow bell pepper",
    "red pepper": "red bell pepper",
    "green pepper": "green bell pepper",
}

# ── Keyword-based wheel assignment for V1-only ingredients ──────────
# Check ingredient NAME for these keywords (order matters: first match wins)
NAME_KEYWORD_WHEELS = [
    # Sour
    (["vinegar", "pickle", "pickled", "kimchi", "sauerkraut", "tamarind",
      "pomegranate molasses", "yuzu", "calamansi", "sumac"], "Sour_wheel"),
    # Umami
    (["broth", "stock", "bouillon", "fish sauce", "soy sauce", "miso",
      "anchov", "sardine", "tuna", "salmon", "shrimp", "prawn", "crab",
      "lobster", "oyster", "clam", "mussel", "squid", "octopus",
      "bacon", "prosciutto", "salami", "chorizo", "sausage", "ham",
      "beef", "pork", "lamb", "veal", "venison", "duck", "turkey",
      "chicken", "pheasant", "rabbit", "jerky",
      "parmesan", "cheddar", "aged cheese", "pecorino", "gruyere",
      "worcestershire", "vegemite", "marmite", "nutritional yeast",
      "seaweed", "nori", "kombu", "bonito", "dashi", "tempeh",
      "fermented", "paste", "umami"], "Umami_wheel"),
    # Spicy
    (["chili", "chile", "chilli", "jalapeño", "jalapeno", "habanero",
      "cayenne", "sriracha", "tabasco", "hot sauce", "wasabi", "horseradish",
      "mustard", "pepper flake", "peppercorn", "szechuan", "harissa",
      "sambal", "gochujang", "chipotle"], "Spicy_wheel"),
    # Sweet
    (["syrup", "honey", "sugar", "maple", "caramel", "molasses", "jam",
      "jelly", "marmalade", "compote", "chutney", "ice cream", "gelato",
      "chocolate", "candy", "sweet potato", "yam",
      "mango", "papaya", "pineapple", "banana", "melon", "watermelon",
      "berry", "berries", "strawberry", "raspberry", "blueberry",
      "peach", "plum", "nectarine", "apricot", "cherry", "fig", "date",
      "raisin", "prune", "grape", "persimmon", "lychee", "passion fruit",
      "guava", "dragon fruit", "pomegranate", "kiwi"], "Sweet_wheel"),
    # Bitter
    (["radicchio", "endive", "dandelion", "arugula", "coffee", "espresso",
      "cocoa", "cacao", "matcha", "tea", "dark chocolate", "bitter melon",
      "turmeric", "fenugreek", "rapini", "broccoli rabe",
      "bitters", "tonic", "grapefruit", "marmalade"], "Bitter_wheel"),
    # Crunch
    (["crouton", "breadcrumb", "panko", "tortilla chip", "pita chip",
      "cracker", "granola", "fried onion", "fried shallot",
      "coconut flake", "crispy", "crunchy", "chip", "crisp",
      "taco shell", "wonton", "toast", "biscuit", "pretzel",
      "poppadom", "lavash"], "Crunch_wheel"),
    # Oil
    (["oil", "butter", "ghee", "lard", "dripping", "fat", "margarine",
      "shortening", "tallow", "schmaltz"], "Oil_wheel"),
    # Aroma
    (["vanilla", "cinnamon", "cardamom", "clove", "nutmeg", "saffron",
      "star anise", "fennel seed", "cumin", "coriander seed",
      "truffle", "rose water", "orange blossom", "lavender",
      "lemongrass", "galangal", "extract", "essence",
      "liqueur", "amaretto", "brandy", "rum", "whiskey", "wine",
      "champagne", "sherry", "port", "vermouth", "sake", "mirin",
      "absinthe", "bourbon", "cognac", "kirsch"], "Aroma_wheel"),
    # Fresh (vegetables, herbs, leafy greens)
    (["lettuce", "spinach", "kale", "chard", "watercress", "sprout",
      "micro", "herb", "basil", "cilantro", "parsley", "mint", "dill",
      "chive", "tarragon", "oregano", "thyme", "rosemary", "sage",
      "cucumber", "celery", "fennel", "zucchini", "squash",
      "pea", "green bean", "snap pea", "snow pea",
      "edamame", "asparagus", "artichoke", "leek",
      "corn", "pepper", "tomato", "eggplant", "okra",
      "bok choy", "cabbage", "broccoli", "cauliflower",
      "radish", "turnip", "beet", "carrot", "parsnip",
      "juice", "water", "soda", "kombucha", "smoothie"], "Fresh_wheel"),
    # Soft (starches, legumes, dairy, baking, noodles, grains)
    (["rice", "noodle", "pasta", "couscous", "polenta", "quinoa",
      "oat", "barley", "bulgur", "farro", "millet", "spelt",
      "bread", "pita", "naan", "tortilla", "wrap", "flatbread", "bun",
      "flour", "starch", "powder", "baking",
      "cream", "cheese", "yogurt", "yoghurt", "milk", "ricotta",
      "mascarpone", "mozzarella", "cottage", "fromage",
      "tofu", "seitan", "egg",
      "bean", "lentil", "chickpea", "hummus",
      "potato", "mash", "puree", "soup",
      "coconut milk", "coconut cream", "almond milk", "oat milk",
      "soy milk", "agar", "gelatin",
      "frozen"], "Soft_wheel"),
]

# V1 tag-based fallback (if no keyword match)
TAG_WHEEL_MAP = {
    "spices": "Aroma_wheel",
    "herbs": "Fresh_wheel",
    "oils": "Oil_wheel",
    "nuts": "Crunch_wheel",
    "seeds": "Crunch_wheel",
    "sweeteners": "Sweet_wheel",
    "dairy": "Soft_wheel",
    "milks": "Soft_wheel",
    "legumes": "Soft_wheel",
    "grains": "Soft_wheel",
    "lettuces": "Fresh_wheel",
    "vegetables_raw": "Fresh_wheel",
    "vegetables_root": "Soft_wheel",
    "fruit": "Sweet_wheel",
    "fruit_tropical": "Sweet_wheel",
    "fresh_berries": "Sweet_wheel",
    "citrus": "Sour_wheel",
    "dried_fruit": "Sweet_wheel",
    "alliums": "Aroma_wheel",
    "strong_sauces": "Umami_wheel",
    "liquid_sour": "Sour_wheel",
    "proteins": "Umami_wheel",
    "baking": "Soft_wheel",
}

FLAVOR_WHEEL_MAP = {
    "umami": "Umami_wheel",
    "savory": "Umami_wheel",
    "sour": "Sour_wheel",
    "spicy": "Spicy_wheel",
    "bitter": "Bitter_wheel",
    "crunch": "Crunch_wheel",
    "sweet": "Sweet_wheel",
}

# ── V1 ingredient filter: skip these overly-specific items ──────────
# Patterns in names that indicate too-specific variants we don't need
SKIP_NAME_PATTERNS = [
    "ice cream",  # too specific dessert item
]

# Exact names to skip (duplicates, too niche, or confusing)
SKIP_EXACT = {
    "salt",  # not an ingredient you "pick" on the wheel
    "water",  # obvious
    "ice",
    "pepper",  # too ambiguous
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize(name):
    """Normalize ingredient name for matching."""
    n = name.lower().strip()
    n = NAME_ALIASES.get(n, n)
    return n


def flatten_v2_tags(tags_dict):
    """Flatten the nested V2 tag structure into a flat dict of column_name: bool."""
    flat = {}
    for top_key, mid_dict in tags_dict.items():
        for mid_key, leaf_dict in mid_dict.items():
            for leaf_key, val in leaf_dict.items():
                flat[leaf_key] = val
    return flat


def determine_wheel_for_v1(v1_ingredient):
    """Assign a wheel category to a V1-only ingredient using name keywords + tag fallback."""
    name = v1_ingredient["normalized_name"]
    tags = v1_ingredient["tags"]

    # 1. Keyword match on ingredient name (most reliable)
    for keywords, wheel in NAME_KEYWORD_WHEELS:
        for kw in keywords:
            if kw in name:
                return wheel

    # 2. Flavor tag match
    for flavor_tag, wheel in FLAVOR_WHEEL_MAP.items():
        if tags.get(flavor_tag, False):
            return wheel

    # 3. Category tag match
    for tag_name, wheel in TAG_WHEEL_MAP.items():
        if tags.get(tag_name, False):
            return wheel

    # 4. Aromatic/bulk fallback
    if tags.get("aromatic", False):
        return "Aroma_wheel"
    if tags.get("bulk", False) or tags.get("base", False):
        return "Soft_wheel"

    # 5. Final fallback: Soft (neutral) rather than Fresh
    return "Soft_wheel"


def map_v1_to_v2_component(v1_tags):
    """Map V1 category tags to V2 dish component columns."""
    components = {}

    # Bulk
    components["Fibres"] = v1_tags.get("fiber", False) or v1_tags.get("vegetables_root", False)
    components["Starch"] = v1_tags.get("carb", False) or v1_tags.get("grains", False)
    components["Protein"] = v1_tags.get("proteins", False) or v1_tags.get("legumes", False)
    components["Lightbulks"] = (
        v1_tags.get("vegetables", False)
        and not components["Fibres"]
        and not components["Protein"]
    )

    # Boost
    components["Spices"] = v1_tags.get("spices", False)
    components["Alliums"] = v1_tags.get("alliums", False)

    # Top
    components["Fruittops"] = v1_tags.get("fruit", False) or v1_tags.get("fresh_berries", False)
    components["Seeds"] = v1_tags.get("seeds", False)
    components["Nuts"] = v1_tags.get("nuts", False)
    components["Bread"] = False  # V1 doesn't have a bread tag
    components["Cheesetops"] = v1_tags.get("dairy", False) and not v1_tags.get("milks", False)
    components["Herbs"] = v1_tags.get("herbs", False)
    components["OtherTops"] = v1_tags.get("topping", False) and not any([
        components["Fruittops"], components["Seeds"], components["Nuts"],
        components["Cheesetops"], components["Herbs"]
    ])

    # Splash
    components["Oils"] = v1_tags.get("oils", False)
    components["Fats"] = False  # Separate from oils in V2
    components["LiquidAromas"] = v1_tags.get("liquid", False) and not v1_tags.get("oils", False)

    return components


def map_v1_to_v2_dietary(v1_tags):
    """Map V1 dietary tags to V2 dietary columns."""
    return {
        "Glutenfree": v1_tags.get("glutenfree", False),
        "Vegan": v1_tags.get("vegan", False),
        "Vegetarian": v1_tags.get("pescetarian", False),  # V1 uses pescetarian ~ vegetarian
        "LactoseFree": v1_tags.get("lactosefree", False),
        "Diabetic": v1_tags.get("diabetic", False),
        "NutFree": not v1_tags.get("nuts", False),
        "FODMAPS": v1_tags.get("low_fodmap", False) or v1_tags.get("Low fodmap", False),
    }


def map_v1_to_v2_flavor(v1_tags):
    """Map V1 flavor tags to V2 taste columns."""
    return {
        "Umami": v1_tags.get("umami", False) or v1_tags.get("savory", False),
        "Sweet": v1_tags.get("sweet", False),
        "Bitter": v1_tags.get("bitter", False),
        "Sour": v1_tags.get("sour", False),
        "Salty": False,  # V1 doesn't distinguish salty
        "Spicy": v1_tags.get("spicy", False),
        "Crunchy": v1_tags.get("crunch", False),
        "AromaBomb": v1_tags.get("aromatic", False),
    }


def map_v1_to_v2_region(v1_tags):
    """Map V1 cuisine tags to V2 region columns."""
    return {
        "Mediterranean": (
            v1_tags.get("french", False) or v1_tags.get("French", False)
            or v1_tags.get("Italian", False) or v1_tags.get("greek", False)
            or v1_tags.get("spanish", False) or v1_tags.get("Spanish", False)
        ),
        "SouthAsian": v1_tags.get("Indian", False),
        "EastAsian": (
            v1_tags.get("East Asian", False) or v1_tags.get("Thai", False)
        ),
        "LatinAmerican": (
            v1_tags.get("Mexican", False)
            or v1_tags.get("Brazilian", False) or v1_tags.get("brazillian", False)
        ),
        "European": (
            v1_tags.get("Northern European", False)
            or v1_tags.get("french", False) or v1_tags.get("French", False)
        ),
        "MiddleEastern": v1_tags.get("Middle Eastern", False),
        "Exotic": False,
    }


def build_unified():
    print("Loading parsed data...")
    v1_data = load_json(V1_JSON)
    v2_data = load_json(V2_JSON)
    excel_data = load_json(EXCEL_JSON)

    v2_ingredients = v2_data["ingredients"]
    v1_ingredients = v1_data["ingredients"]
    common_ingredients = excel_data["common_ingredients"]["ingredients"]

    # Build V2 name lookup
    v2_by_name = {}
    for ing in v2_ingredients:
        v2_by_name[ing["name_normalized"]] = ing

    # Build V1 name lookup
    v1_by_name = {}
    for ing in v1_ingredients:
        norm = normalize(ing["name"])
        v1_by_name[norm] = ing

    # Build commonality lookup (by ID string)
    common_by_id = {}
    for id_str, data in common_ingredients.items():
        common_by_id[int(id_str)] = data

    # ── Define output columns ──────────────────────────────────────
    # These match the V2 structure exactly, flattened
    OUTPUT_COLUMNS = [
        "id", "name",
        # Dish components
        "Fibres", "Starch", "Protein", "Lightbulks",
        "Spices", "Alliums",
        "Fruittops", "Seeds", "Nuts", "Bread", "Cheesetops", "Herbs", "OtherTops",
        "Oils", "Fats", "LiquidAromas",
        # Dietary
        "Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "Diabetic", "NutFree", "FODMAPS",
        # Flavor - Taste
        "Umami", "Sweet", "Bitter", "Sour", "Salty", "Spicy", "Crunchy", "AromaBomb",
        # Flavor - Aromas
        "FRUITY", "GREEN", "FLORAL", "SULFUROUS", "HERBAL", "AROMATIC_SPICY",
        "WOODY", "NUTTY", "ROASTED", "SMOKEY", "CITRUS", "MEATY", "MARINE", "CREAMY", "CHEESY",
        # Seasonality
        "Spring", "Summer", "Fall", "Winter",
        # Region
        "Mediterranean", "SouthAsian", "EastAsian", "LatinAmerican",
        "European", "MiddleEastern", "Exotic",
        # Style
        "SlowAndDeep", "FastAndFresh",
        # RecipeTags
        "Sofrito", "Taco", "Aromatics", "Boil", "Raw", "Dressing", "Toasting",
        # Flavormap
        "Sour_map", "Umami_map", "Sweet_map", "Bitter_map",
        "Crunch_map", "OilAndFat_map", "Pungency_map",
        "Spices_map", "Herbs_map", "Cheese_map", "Alliums_map",
        "Beverages_map", "Fruits_map", "FillingVeggies_map",
        "Vegetables_map", "MeatAndFish_map", "Baking_map",
        # Wheel (the star columns for Gastrowheel)
        "Sour_wheel", "Umami_wheel", "Oil_wheel", "Crunch_wheel", "Sweet_wheel",
        "Aroma_wheel", "Fresh_wheel", "Soft_wheel", "Bitter_wheel", "Spicy_wheel",
        # Market commonality
        "common_en", "common_da", "common_de", "common_es",
        # Has icon
        "has_icon",
    ]

    # Check which icon files exist
    icon_dir = os.path.join(PROJECT_DIR, "Icons")
    icon_ids = set()
    if os.path.isdir(icon_dir):
        for f in os.listdir(icon_dir):
            if f.endswith(".svg"):
                try:
                    icon_ids.add(int(f.replace(".svg", "")))
                except ValueError:
                    pass

    rows = []
    matched_v1_names = set()
    report_lines = []

    # ── Phase 1: Process all V2 ingredients (canonical) ─────────────
    print("Phase 1: Processing V2 ingredients (341 canonical)...")
    for v2_ing in v2_ingredients:
        v2_id = v2_ing["id"]
        v2_name = v2_ing["name"]
        v2_norm = v2_ing["name_normalized"]
        flat_tags = flatten_v2_tags(v2_ing["tags"])
        wheels = v2_ing["wheels"]

        # Rename SPICY aroma to AROMATIC_SPICY to avoid clash with taste Spicy
        if "SPICY" in flat_tags:
            flat_tags["AROMATIC_SPICY"] = flat_tags.pop("SPICY")

        # Drop the "? ? ?" style column
        flat_tags.pop("? ? ?", None)

        # Merge wheel data from GW (authoritative)
        flat_tags.update(wheels)

        # Try to match V1 by name
        v1_match = v1_by_name.get(v2_norm) or v1_by_name.get(normalize(v2_name))
        if v1_match:
            matched_v1_names.add(normalize(v1_match["name"]))

            # Merge V1 region data into V2 where V2 is empty
            v1_region = map_v1_to_v2_region(v1_match["tags"])
            for key, val in v1_region.items():
                if val and not flat_tags.get(key, False):
                    flat_tags[key] = True

        # Get commonality data
        common_data = common_by_id.get(v2_id, {})

        # Build row
        row = {"id": v2_id, "name": v2_name}
        for col in OUTPUT_COLUMNS[2:]:
            if col == "has_icon":
                row[col] = "x" if v2_id in icon_ids else ""
            elif col.startswith("common_"):
                lang = col.split("_")[1]
                if common_data:
                    row[col] = "x" if lang in common_data.get("common_in", []) else ""
                else:
                    row[col] = ""
            else:
                row[col] = "x" if flat_tags.get(col, False) else ""

        rows.append(row)

    # ── Phase 2: Add V1-only ingredients ────────────────────────────
    print("Phase 2: Identifying V1-only ingredients...")
    v1_only = []
    for v1_ing in v1_ingredients:
        norm = normalize(v1_ing["name"])
        if norm not in matched_v1_names and norm not in v2_by_name:
            v1_only.append(v1_ing)

    # Filter V1-only: skip overly-specific variants and non-ingredients
    filtered_v1_only = []
    for v1_ing in v1_only:
        name = v1_ing["normalized_name"]
        # Skip if name is too short
        if len(name) < 3:
            continue
        # Skip exact matches
        if name in SKIP_EXACT:
            continue
        # Skip name patterns
        skip = False
        for pattern in SKIP_NAME_PATTERNS:
            if pattern in name:
                skip = True
                break
        if skip:
            continue
        filtered_v1_only.append(v1_ing)

    print(f"  V1-only candidates: {len(v1_only)}, after filtering: {len(filtered_v1_only)}")

    next_id = 400
    for v1_ing in sorted(filtered_v1_only, key=lambda x: x["normalized_name"]):
        v1_tags = v1_ing["tags"]

        # Map V1 tags to V2 structure
        components = map_v1_to_v2_component(v1_tags)
        dietary = map_v1_to_v2_dietary(v1_tags)
        flavor = map_v1_to_v2_flavor(v1_tags)
        region = map_v1_to_v2_region(v1_tags)

        # Determine wheel assignment
        wheel_name = determine_wheel_for_v1(v1_ing)

        # Build wheels dict
        wheel_cols = {
            "Sour_wheel": False, "Umami_wheel": False, "Oil_wheel": False,
            "Crunch_wheel": False, "Sweet_wheel": False, "Aroma_wheel": False,
            "Fresh_wheel": False, "Soft_wheel": False, "Bitter_wheel": False,
            "Spicy_wheel": False,
        }
        wheel_cols[wheel_name] = True

        # Combine all tags
        all_tags = {}
        all_tags.update(components)
        all_tags.update(dietary)
        all_tags.update(flavor)
        all_tags.update(region)
        all_tags.update(wheel_cols)

        # Add empty aroma, seasonality, style, recipe, flavormap columns
        for col in ["FRUITY", "GREEN", "FLORAL", "SULFUROUS", "HERBAL", "AROMATIC_SPICY",
                     "WOODY", "NUTTY", "ROASTED", "SMOKEY", "CITRUS", "MEATY", "MARINE",
                     "CREAMY", "CHEESY"]:
            if col not in all_tags:
                all_tags[col] = False
        for col in ["Spring", "Summer", "Fall", "Winter"]:
            if col not in all_tags:
                all_tags[col] = False
        for col in ["SlowAndDeep", "FastAndFresh"]:
            if col not in all_tags:
                all_tags[col] = False
        for col in ["Sofrito", "Taco", "Aromatics", "Boil", "Raw", "Dressing", "Toasting"]:
            if col not in all_tags:
                all_tags[col] = False
        for col in ["Sour_map", "Umami_map", "Sweet_map", "Bitter_map", "Crunch_map",
                     "OilAndFat_map", "Pungency_map", "Spices_map", "Herbs_map",
                     "Cheese_map", "Alliums_map", "Beverages_map", "Fruits_map",
                     "FillingVeggies_map", "Vegetables_map", "MeatAndFish_map", "Baking_map"]:
            if col not in all_tags:
                all_tags[col] = False
        # Salty not in V1
        if "Salty" not in all_tags:
            all_tags["Salty"] = False

        # Use V1's original ID if it had an icon, otherwise assign new
        v1_id = v1_ing["id"]
        has_icon = v1_id in icon_ids if v1_id else False
        use_id = v1_id if has_icon else next_id

        if not has_icon:
            next_id += 1

        # Get commonality from excel (by V1 id)
        common_data = common_by_id.get(v1_id, {})

        # Standardize name: title case
        display_name = v1_ing["name"].strip()

        row = {"id": use_id, "name": display_name}
        for col in OUTPUT_COLUMNS[2:]:
            if col == "has_icon":
                row[col] = "x" if has_icon else ""
            elif col.startswith("common_"):
                lang = col.split("_")[1]
                if common_data:
                    row[col] = "x" if lang in common_data.get("common_in", []) else ""
                else:
                    row[col] = ""
            else:
                row[col] = "x" if all_tags.get(col, False) else ""

        rows.append(row)

        report_lines.append(
            f"  NEW [{use_id}] {display_name} → {wheel_name}"
            f" (from V1 id={v1_id}, icon={'yes' if has_icon else 'no'})"
        )

    # ── Sort by ID ──────────────────────────────────────────────────
    rows.sort(key=lambda r: r["id"])

    # ── Write CSV ───────────────────────────────────────────────────
    print(f"\nWriting {len(rows)} ingredients to {OUTPUT_CSV}...")
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    # ── Write merge report ──────────────────────────────────────────
    v2_count = len(v2_ingredients)
    v1_only_count = len(filtered_v1_only)
    total = len(rows)

    # Count wheel distribution
    wheel_dist = {}
    for row in rows:
        for w in ["Sour_wheel", "Umami_wheel", "Oil_wheel", "Crunch_wheel", "Sweet_wheel",
                   "Aroma_wheel", "Fresh_wheel", "Soft_wheel", "Bitter_wheel", "Spicy_wheel"]:
            if row[w] == "x":
                wheel_dist[w] = wheel_dist.get(w, 0) + 1

    # Count ingredients with no wheel
    no_wheel = sum(1 for row in rows if not any(
        row[w] == "x" for w in ["Sour_wheel", "Umami_wheel", "Oil_wheel", "Crunch_wheel",
                                 "Sweet_wheel", "Aroma_wheel", "Fresh_wheel", "Soft_wheel",
                                 "Bitter_wheel", "Spicy_wheel"]
    ))

    # Count ingredients with icons
    with_icon = sum(1 for row in rows if row["has_icon"] == "x")

    report = [
        "=" * 60,
        "GASTROWHEEL UNIFIED CSV - MERGE REPORT",
        "=" * 60,
        "",
        f"Total ingredients: {total}",
        f"  From V2 (canonical): {v2_count}",
        f"  From V1 (new additions): {v1_only_count}",
        f"  With icons: {with_icon}",
        f"  Without wheel assignment: {no_wheel}",
        "",
        "Wheel distribution:",
    ]
    for w in sorted(wheel_dist.keys()):
        report.append(f"  {w}: {wheel_dist[w]}")
    report.append("")
    report.append("New ingredients from V1:")
    report.extend(report_lines)

    report_text = "\n".join(report)

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(report_text)
    print(f"\nReport written to: {REPORT_PATH}")
    print(f"CSV written to: {OUTPUT_CSV}")


if __name__ == "__main__":
    build_unified()
