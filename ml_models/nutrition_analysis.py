import sys
import json

def analyze_nutrition(crop_name):
    crop_name = crop_name.lower().strip()
    
    # Mock database
    database = {
        "rice": {"calories": 130, "carbs": 28, "protein": 2.7, "fat": 0.3, "fiber": 0.4},
        "wheat": {"calories": 339, "carbs": 71, "protein": 14, "fat": 2.5, "fiber": 12.2},
        "tomato": {"calories": 18, "carbs": 3.9, "protein": 0.9, "fat": 0.2, "fiber": 1.2},
        "mango": {"calories": 60, "carbs": 15, "protein": 0.8, "fat": 0.4, "fiber": 1.6},
        "maize": {"calories": 86, "carbs": 19, "protein": 3.2, "fat": 1.2, "fiber": 2}
    }
    
    if crop_name in database:
        result = database[crop_name]
        result["crop"] = crop_name.capitalize()
        return result
    else:
        # Default fallback
        return {
            "crop": crop_name.capitalize(),
            "calories": 50,
            "carbs": 10,
            "protein": 1.0,
            "fat": 0.5,
            "fiber": 1.0,
            "note": "Generic nutritional estimate used."
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        crop = sys.argv[1]
        result = analyze_nutrition(crop)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Missing parameter: crop"}))
