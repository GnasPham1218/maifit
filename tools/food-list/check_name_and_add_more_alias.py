import json
import os
import time
from dotenv import load_dotenv
import google.generativeai as genai

# 1. Load environment variables from the .env file
load_dotenv()

# Retrieve API keys string from environment and split into a list
keys_env = os.getenv("GEMINI_API_KEYS", "")
API_KEYS = [key.strip() for key in keys_env.split(",") if key.strip()]

if not API_KEYS:
  raise ValueError(
      "No API Keys found in the .env file! Please check your GEMINI_API_KEYS"
      " variable."
  )

print(f"Successfully loaded {len(API_KEYS)} API Key(s) for rotation.")

# Variable to manage the current key index
current_key_index = 0


def get_next_model():
  """Get Gemini model with the next API Key in the list (Round-robin rotation)."""
  global current_key_index
  api_key = API_KEYS[current_key_index]

  # Re-configure SDK with the current key
  genai.configure(api_key=api_key)

  # Using gemini-3.5-flash-lite model
  model = genai.GenerativeModel("gemini-3.5-flash-lite")

  # Move to the next key for subsequent calls
  current_key_index = (current_key_index + 1) % len(API_KEYS)
  return model


# DELAY TIME (in seconds) between requests to avoid hitting the RPM limit per key
DELAY_SECONDS = 2.0

# Load input JSON file
with open("food_list.json", "r", encoding="utf-8") as f:
  food_data = json.load(f)


def review_and_fix_food_item(item):
  """Review and standardize the food item based on strict Vietnamese database rules:

  - A. Name: Short, natural, capitalized first letter, NO preparation states unless it's a distinct product (e.g., 'Bún khô').
  - C & D. Aliases / Locking Aliases: Real user terms, correct mapping with preparation words (e.g., 'chiên' goes to FRIED, 'cơm' / 'gạo' in locking_aliases), 2-8 aliases, no ambiguity.
  - Using key rotation.
  """
  prompt = f"""
    You are an expert in food data engineering and Vietnamese culinary nomenclature.
    Review and update the following food item strictly according to these database rules:

    RULES FOR 'name':
    1. Short, natural, most common Vietnamese name, capitalized first letter, with proper diacritics (e.g., "Rau muống", "Thịt ba chỉ").
    2. NO preparation states or cooking methods in the name (e.g., NO "tươi", "sống", "chín", "luộc"). Exceptions apply only when the state creates a fundamentally different product (e.g., "Bún khô", "Nho khô", "Sữa bột", "Cá mòi hộp").
    3. One name = one exact item/cut. Different cuts or products must have distinct names (e.g., add suffix " nạc" for lean cuts if necessary).

    RULES FOR 'aliases' and 'locking_aliases':
    1. Real terms that Vietnamese users actually type or say. English is allowed only if widely used in Vietnam (e.g., spaghetti, kiwi, mayo). Do NOT translate USDA descriptions (e.g., no "taro raw").
    2. Proper diacritics, correct spelling, unique entries.
    3. Mapping rules based on preparation:
       - If an alias contains a cooking/preparation word (e.g., "gà chiên", "cơm" for cooked rice, "gạo" for raw), it MUST go to 'locking_aliases' matching the corresponding preparation row.
       - Generic/neutral aliases without preparation hints (e.g., "Gà", "Thịt bò", "Súp lơ xanh") go to 'aliases' of the RAW row (or the single row if there is only one).
       - Each alias must strictly match the preparation context of its row.
    4. Quantity: 2 to 8 meaningful aliases per row. Do not pad useless words. Avoid ambiguous terms.

    Input data:
    {json.dumps(item, ensure_ascii=False, indent=2)}

    Output requirements:
    - Keep the original JSON structure (name, category_code, category, preparations with id, preparation, source_description, aliases, locking_aliases).
    - Update 'name', 'aliases', and 'locking_aliases' according to the rules above.
    - ABSOLUTELY DO NOT alter 'source_description', 'preparation', or 'id' fields.
    - Return ONLY valid raw JSON without any extra markdown formatting or explanations outside of it.
    """

  # Try calling API; if the current key fails/exhausts quota, switch to the next one
  max_retries = len(API_KEYS)
  for attempt in range(max_retries):
    try:
      # Get model with the currently rotated key
      current_model = get_next_model()
      response = current_model.generate_content(prompt)
      raw_text = response.text.strip()

      # Clean up markdown code blocks if present
      if raw_text.startswith("```json"):
        raw_text = raw_text[7:-3].strip()
      elif raw_text.startswith("```"):
        raw_text = raw_text[3:-3].strip()

      return json.loads(raw_text)
    except Exception as e:
      print(
          f"⚠️ Error with current key (Attempt {attempt+1}/{max_retries}):"
          f" {str(e)}"
      )
      if attempt == max_retries - 1:
        print(f"❌ Failed all keys for food item: {item.get('name')}")
        return item  # Return original data if all keys fail
      print("🔄 Switching to the next key and retrying...")


# Iterate and review each food item
updated_food_data = []
total_items = len(food_data)

for index, item in enumerate(food_data, 1):
  print(
      f"[{index}/{total_items}] Reviewing and standardizing:"
      f" {item.get('name')}..."
  )

  updated_item = review_and_fix_food_item(item)
  updated_food_data.append(updated_item)

  # Mild delay between requests to evenly distribute load
  if index < total_items:
    time.sleep(DELAY_SECONDS)

# Save reviewed results to a new file
output_filename = "food_data_standardized.json"
with open(output_filename, "w", encoding="utf-8") as f:
  json.dump(updated_food_data, f, ensure_ascii=False, indent=2)

print(
    "\nCompleted! Food data has been standardized according to the rules and"
    f" saved to '{output_filename}'."
)