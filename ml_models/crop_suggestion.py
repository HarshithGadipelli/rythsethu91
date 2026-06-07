import sys
import json
from pymongo import MongoClient

# Connect to MongoDB for live platform data
try:
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["rythu_sethu"]
except:
    db = None

# Comprehensive Indian crop database with climate rules
CROP_DATABASE = {
    "Rice": {"temp_min":20,"temp_max":35,"hum_min":60,"hum_max":95,"rain_min":100,"rain_max":300,"soil":["clay","loamy","silt"],"season":["kharif"]},
    "Wheat": {"temp_min":10,"temp_max":25,"hum_min":30,"hum_max":70,"rain_min":25,"rain_max":75,"soil":["loamy","clay"],"season":["rabi"]},
    "Maize": {"temp_min":18,"temp_max":32,"hum_min":50,"hum_max":85,"rain_min":50,"rain_max":150,"soil":["loamy","sandy"],"season":["kharif","rabi"]},
    "Cotton": {"temp_min":21,"temp_max":35,"hum_min":40,"hum_max":80,"rain_min":50,"rain_max":100,"soil":["loamy","clay"],"season":["kharif"]},
    "Sugarcane": {"temp_min":20,"temp_max":38,"hum_min":60,"hum_max":90,"rain_min":75,"rain_max":200,"soil":["loamy","clay"],"season":["kharif","perennial"]},
    "Groundnut": {"temp_min":25,"temp_max":35,"hum_min":40,"hum_max":75,"rain_min":40,"rain_max":100,"soil":["sandy","loamy"],"season":["kharif","rabi"]},
    "Soybean": {"temp_min":20,"temp_max":35,"hum_min":50,"hum_max":85,"rain_min":60,"rain_max":150,"soil":["loamy","clay"],"season":["kharif"]},
    "Tomato": {"temp_min":18,"temp_max":30,"hum_min":40,"hum_max":70,"rain_min":20,"rain_max":60,"soil":["loamy","sandy"],"season":["rabi","zaid"]},
    "Onion": {"temp_min":13,"temp_max":28,"hum_min":30,"hum_max":70,"rain_min":15,"rain_max":50,"soil":["loamy","sandy"],"season":["rabi"]},
    "Potato": {"temp_min":10,"temp_max":25,"hum_min":60,"hum_max":85,"rain_min":30,"rain_max":75,"soil":["loamy","sandy"],"season":["rabi"]},
    "Chilli": {"temp_min":20,"temp_max":35,"hum_min":50,"hum_max":80,"rain_min":25,"rain_max":60,"soil":["loamy","sandy"],"season":["kharif","rabi"]},
    "Turmeric": {"temp_min":20,"temp_max":35,"hum_min":60,"hum_max":90,"rain_min":100,"rain_max":250,"soil":["loamy","clay"],"season":["kharif"]},
    "Ginger": {"temp_min":19,"temp_max":32,"hum_min":70,"hum_max":95,"rain_min":150,"rain_max":300,"soil":["loamy","silt"],"season":["kharif"]},
    "Banana": {"temp_min":22,"temp_max":35,"hum_min":60,"hum_max":90,"rain_min":100,"rain_max":200,"soil":["loamy","clay"],"season":["perennial"]},
    "Mango": {"temp_min":24,"temp_max":38,"hum_min":40,"hum_max":80,"rain_min":50,"rain_max":150,"soil":["loamy","sandy"],"season":["perennial"]},
    "Papaya": {"temp_min":22,"temp_max":35,"hum_min":50,"hum_max":85,"rain_min":60,"rain_max":150,"soil":["loamy","sandy"],"season":["perennial"]},
    "Coconut": {"temp_min":25,"temp_max":35,"hum_min":60,"hum_max":90,"rain_min":100,"rain_max":250,"soil":["loamy","sandy"],"season":["perennial"]},
    "Mustard": {"temp_min":10,"temp_max":25,"hum_min":30,"hum_max":60,"rain_min":20,"rain_max":50,"soil":["loamy","sandy"],"season":["rabi"]},
    "Sunflower": {"temp_min":18,"temp_max":30,"hum_min":30,"hum_max":65,"rain_min":25,"rain_max":60,"soil":["loamy","sandy"],"season":["rabi","zaid"]},
    "Brinjal": {"temp_min":20,"temp_max":35,"hum_min":50,"hum_max":80,"rain_min":25,"rain_max":60,"soil":["loamy","clay"],"season":["kharif","rabi"]},
    "Okra": {"temp_min":22,"temp_max":38,"hum_min":50,"hum_max":80,"rain_min":30,"rain_max":80,"soil":["loamy","sandy"],"season":["kharif","zaid"]},
    "Cucumber": {"temp_min":18,"temp_max":32,"hum_min":50,"hum_max":80,"rain_min":25,"rain_max":60,"soil":["loamy","sandy"],"season":["zaid"]},
    "Watermelon": {"temp_min":24,"temp_max":38,"hum_min":40,"hum_max":70,"rain_min":15,"rain_max":40,"soil":["sandy","loamy"],"season":["zaid"]},
    "Spinach": {"temp_min":10,"temp_max":22,"hum_min":50,"hum_max":80,"rain_min":20,"rain_max":50,"soil":["loamy","clay"],"season":["rabi"]},
    "Green Peas": {"temp_min":8,"temp_max":22,"hum_min":50,"hum_max":75,"rain_min":25,"rain_max":60,"soil":["loamy","clay"],"season":["rabi"]},
    "Cauliflower": {"temp_min":12,"temp_max":22,"hum_min":50,"hum_max":80,"rain_min":25,"rain_max":60,"soil":["loamy","clay"],"season":["rabi"]},
    "Cabbage": {"temp_min":12,"temp_max":22,"hum_min":50,"hum_max":80,"rain_min":25,"rain_max":60,"soil":["loamy","clay"],"season":["rabi"]},
    "Carrot": {"temp_min":10,"temp_max":25,"hum_min":50,"hum_max":75,"rain_min":20,"rain_max":50,"soil":["loamy","sandy"],"season":["rabi"]},
    "Jowar": {"temp_min":25,"temp_max":38,"hum_min":30,"hum_max":70,"rain_min":30,"rain_max":100,"soil":["clay","loamy"],"season":["kharif","rabi"]},
    "Bajra": {"temp_min":25,"temp_max":40,"hum_min":20,"hum_max":60,"rain_min":15,"rain_max":50,"soil":["sandy","loamy"],"season":["kharif"]},
    "Ragi": {"temp_min":20,"temp_max":32,"hum_min":50,"hum_max":80,"rain_min":50,"rain_max":120,"soil":["loamy","clay"],"season":["kharif"]},
}

def calculate_score(crop_data, temp, hum, rain):
    """Calculate suitability score 0-100 for given conditions."""
    score = 0
    
    # Temperature score (40% weight)
    t_min, t_max = crop_data["temp_min"], crop_data["temp_max"]
    t_mid = (t_min + t_max) / 2
    t_range = (t_max - t_min) / 2
    if t_min <= temp <= t_max:
        score += 40 * (1 - abs(temp - t_mid) / (t_range + 1))
    elif abs(temp - t_mid) < t_range * 1.5:
        score += 15
    
    # Humidity score (30% weight)
    h_min, h_max = crop_data["hum_min"], crop_data["hum_max"]
    h_mid = (h_min + h_max) / 2
    h_range = (h_max - h_min) / 2
    if h_min <= hum <= h_max:
        score += 30 * (1 - abs(hum - h_mid) / (h_range + 1))
    elif abs(hum - h_mid) < h_range * 1.5:
        score += 10
    
    # Rainfall score (30% weight)
    r_min, r_max = crop_data["rain_min"], crop_data["rain_max"]
    r_mid = (r_min + r_max) / 2
    r_range = (r_max - r_min) / 2
    if r_min <= rain <= r_max:
        score += 30 * (1 - abs(rain - r_mid) / (r_range + 1))
    elif abs(rain - r_mid) < r_range * 1.5:
        score += 10
    
    return round(min(score, 100), 1)

def get_platform_demand(crop_name):
    """Check platform order history for demand data."""
    if not db:
        return 0
    try:
        orders = db.orders.count_documents({"crop": {"$exists": True}})
        return min(orders * 2, 20)  # bonus score based on platform activity
    except:
        return 0

def suggest(temp, hum, rain):
    temp = float(temp)
    hum = float(hum)
    rain = float(rain)
    
    results = []
    for crop_name, data in CROP_DATABASE.items():
        score = calculate_score(data, temp, hum, rain)
        platform_bonus = get_platform_demand(crop_name)
        total_score = min(score + platform_bonus, 100)
        if total_score > 20:
            results.append({
                "crop": crop_name,
                "score": total_score,
                "season": ", ".join(data["season"]),
                "soil": ", ".join(data["soil"])
            })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    
    if not results:
        return {
            "recommended_crop": "Rice",
            "confidence": 50,
            "alternatives": ["Wheat", "Maize"],
            "note": "No strong match found. Showing default recommendations."
        }
    
    best = results[0]
    alternatives = [r["crop"] for r in results[1:6]]
    
    return {
        "recommended_crop": best["crop"],
        "confidence": round(best["score"]),
        "best_soil": best["soil"],
        "season": best["season"],
        "alternatives": alternatives,
        "all_scores": [{"crop": r["crop"], "score": r["score"], "season": r["season"]} for r in results[:10]]
    }

if __name__ == "__main__":
    try:
        temp = sys.argv[1] if len(sys.argv) > 1 else "28"
        hum  = sys.argv[2] if len(sys.argv) > 2 else "65"
        rain = sys.argv[3] if len(sys.argv) > 3 else "80"
        result = suggest(temp, hum, rain)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
