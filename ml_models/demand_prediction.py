import sys
import json
import random
from pymongo import MongoClient

def predict_demand(month):
    try:
        client = MongoClient("mongodb://127.0.0.1:27017/")
        db = client["rythu_sethu"]
        orders_col = db["orders"]
        crops_col = db["crops"]
        
        # In a fully trained ML scenario, we'd load an SKLearn/Tensorflow model here.
        # Since we just want data-driven logic using MongoDB:
        # 1. Fetch crops that have high totalOrders
        # 2. Add some seasonality heuristics
        
        seasonality = {
            "Winter": ["Wheat", "Mustard", "Peas", "Gram", "Carrot", "Spinach", "Tomato"],
            "Summer": ["Mango", "Watermelon", "Cucumber", "Bitter Gourd", "Tomato", "Onion"],
            "Monsoon": ["Rice", "Maize", "Cotton", "Soybean", "Groundnut"],
            "Autumn": ["Apple", "Pomegranate", "Cabbage", "Cauliflower"]
        }
        
        month = month.lower()
        season = ""
        if month in ["december", "january", "february"]:
            season = "Winter"
        elif month in ["march", "april", "may"]:
            season = "Summer"
        elif month in ["june", "july", "august", "september"]:
            season = "Monsoon"
        else:
            season = "Autumn"
            
        seasonal_crops = seasonality.get(season, seasonality["Summer"])
        
        # Real MongoDB aggregation: Top selling crops in the platform
        pipeline = [
            {"$match": {"status": {"$ne": "cancelled"}}},
            {"$group": {"_id": "$crop", "total_quantity_sold": {"$sum": "$quantity"}}},
            {"$sort": {"total_quantity_sold": -1}},
            {"$limit": 5}
        ]
        
        top_orders = list(orders_col.aggregate(pipeline))
        
        predictions = []
        # If we have real sales data, mix it in!
        real_demand_names = []
        for to in top_orders:
            crop = crops_col.find_one({"_id": to["_id"]})
            if crop:
                name = crop.get("name", "Unknown Crop")
                real_demand_names.append(name)
                predictions.append({
                    "product": name,
                    "demand_score": round(random.uniform(8.5, 10.0), 1),
                    "trend": "Upward",
                    "season": season,
                    "source": "Platform Sales Data"
                })
                
        # Fill the rest with seasonal recommendations
        for product in seasonal_crops:
            if len(predictions) >= 3:
                break
            if product not in real_demand_names:
                predictions.append({
                    "product": product,
                    "demand_score": round(random.uniform(7.0, 9.0), 1),
                    "trend": "Stable" if random.random() > 0.5 else "Upward",
                    "season": season,
                    "source": "Seasonal Trends"
                })
                
        return predictions[:3]

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        month = sys.argv[1]
        result = predict_demand(month)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Missing parameter: month"}))
