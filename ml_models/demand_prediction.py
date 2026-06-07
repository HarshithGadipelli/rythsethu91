import sys
import json
from datetime import datetime
from pymongo import MongoClient

# Connect to MongoDB
try:
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["rythu_sethu"]
except:
    db = None

# Comprehensive seasonal demand data for Indian agriculture
SEASONAL_DEMAND = {
    "January":   [("Potato",9,"Upward","rabi"),("Tomato",8,"Upward","rabi"),("Cauliflower",8,"Upward","rabi"),("Green Peas",8,"Upward","rabi"),("Spinach",7,"Stable","rabi"),("Carrot",7,"Upward","rabi"),("Cabbage",7,"Stable","rabi"),("Mustard",6,"Stable","rabi"),("Wheat",6,"Stable","rabi")],
    "February":  [("Tomato",9,"Upward","rabi"),("Potato",8,"Stable","rabi"),("Onion",8,"Upward","rabi"),("Cauliflower",7,"Downward","rabi"),("Green Peas",7,"Downward","rabi"),("Cabbage",7,"Stable","rabi"),("Carrot",7,"Stable","rabi"),("Spinach",6,"Stable","rabi"),("Wheat",6,"Stable","rabi")],
    "March":     [("Tomato",9,"Stable","rabi"),("Onion",9,"Upward","rabi"),("Watermelon",8,"Upward","zaid"),("Cucumber",7,"Upward","zaid"),("Mango",7,"Upward","perennial"),("Potato",6,"Downward","rabi"),("Okra",6,"Upward","zaid"),("Brinjal",6,"Stable","rabi")],
    "April":     [("Mango",10,"Upward","perennial"),("Watermelon",9,"Upward","zaid"),("Onion",8,"Stable","rabi"),("Cucumber",8,"Upward","zaid"),("Tomato",7,"Downward","rabi"),("Okra",7,"Upward","zaid"),("Banana",6,"Stable","perennial"),("Brinjal",6,"Stable","rabi")],
    "May":       [("Mango",10,"Stable","perennial"),("Watermelon",9,"Stable","zaid"),("Cucumber",8,"Stable","zaid"),("Okra",8,"Upward","kharif"),("Banana",7,"Upward","perennial"),("Coconut",6,"Stable","perennial"),("Papaya",6,"Stable","perennial"),("Sugarcane",6,"Upward","kharif")],
    "June":      [("Rice",9,"Upward","kharif"),("Okra",8,"Stable","kharif"),("Chilli",8,"Upward","kharif"),("Turmeric",7,"Upward","kharif"),("Ginger",7,"Upward","kharif"),("Maize",7,"Upward","kharif"),("Cotton",6,"Upward","kharif"),("Soybean",6,"Upward","kharif")],
    "July":      [("Rice",10,"Stable","kharif"),("Maize",8,"Stable","kharif"),("Cotton",8,"Upward","kharif"),("Turmeric",7,"Stable","kharif"),("Ginger",7,"Stable","kharif"),("Chilli",7,"Stable","kharif"),("Soybean",7,"Stable","kharif"),("Groundnut",6,"Upward","kharif")],
    "August":    [("Rice",9,"Stable","kharif"),("Cotton",8,"Stable","kharif"),("Maize",7,"Downward","kharif"),("Groundnut",7,"Stable","kharif"),("Soybean",7,"Stable","kharif"),("Turmeric",7,"Stable","kharif"),("Brinjal",6,"Upward","kharif"),("Okra",6,"Stable","kharif")],
    "September": [("Rice",8,"Downward","kharif"),("Tomato",8,"Upward","rabi"),("Onion",7,"Upward","rabi"),("Cotton",7,"Downward","kharif"),("Brinjal",7,"Stable","kharif"),("Chilli",6,"Stable","kharif"),("Banana",6,"Stable","perennial"),("Potato",6,"Upward","rabi")],
    "October":   [("Tomato",9,"Upward","rabi"),("Onion",8,"Upward","rabi"),("Potato",8,"Upward","rabi"),("Cauliflower",7,"Upward","rabi"),("Wheat",7,"Upward","rabi"),("Green Peas",7,"Upward","rabi"),("Spinach",6,"Upward","rabi"),("Cabbage",6,"Upward","rabi")],
    "November":  [("Potato",9,"Upward","rabi"),("Tomato",9,"Stable","rabi"),("Cauliflower",8,"Upward","rabi"),("Onion",8,"Stable","rabi"),("Wheat",8,"Upward","rabi"),("Green Peas",8,"Upward","rabi"),("Carrot",7,"Upward","rabi"),("Spinach",7,"Upward","rabi")],
    "December":  [("Potato",9,"Stable","rabi"),("Tomato",9,"Stable","rabi"),("Cauliflower",9,"Stable","rabi"),("Green Peas",9,"Stable","rabi"),("Wheat",8,"Stable","rabi"),("Carrot",8,"Upward","rabi"),("Onion",7,"Stable","rabi"),("Spinach",7,"Stable","rabi")],
}

def get_platform_trends():
    """Analyze platform order data for real demand patterns."""
    if not db:
        return {}
    
    try:
        trends = {}
        crops = db.crops.find({}, {"name": 1, "totalOrders": 1, "category": 1})
        for crop in crops:
            name = crop.get("name", "")
            orders = crop.get("totalOrders", 0)
            if name:
                trends[name.lower()] = orders
        return trends
    except:
        return {}

def predict_demand(month):
    seasonal = SEASONAL_DEMAND.get(month, SEASONAL_DEMAND["January"])
    platform_trends = get_platform_trends()
    
    results = []
    for product, base_score, trend, season in seasonal:
        # Boost score based on platform data
        platform_orders = platform_trends.get(product.lower(), 0)
        platform_bonus = min(platform_orders * 0.5, 2)
        final_score = min(round(base_score + platform_bonus, 1), 10)
        
        # Adjust trend based on platform activity
        if platform_orders > 5:
            trend = "Upward"
        
        results.append({
            "product": product,
            "demand_score": final_score,
            "trend": trend,
            "season": season,
            "platform_orders": platform_orders,
            "recommendation": "High demand - increase production" if final_score >= 8 else "Moderate demand" if final_score >= 6 else "Low demand"
        })
    
    results.sort(key=lambda x: x["demand_score"], reverse=True)
    return results

if __name__ == "__main__":
    try:
        month = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%B")
        result = predict_demand(month)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
