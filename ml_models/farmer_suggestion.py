import sys
import json
import random

def farmer_suggestions(crop_name, soil_type):
    # Mock logic for farming suggestions
    suggestions = [
        "Use organic compost to improve soil fertility before planting.",
        "Ensure proper drainage, especially for loamy soils.",
        "Implement drip irrigation to conserve water.",
        "Monitor for pests early in the growing season.",
        "Consider crop rotation to maintain soil health for the next season."
    ]
    
    specific = []
    
    if crop_name.lower() == "rice":
        specific.append("Maintain standing water during the vegetative stage.")
    elif crop_name.lower() in ["wheat", "maize"]:
        specific.append("Apply nitrogen-based fertilizer during the tillering stage.")
        
    if soil_type.lower() == "clay":
        specific.append("Avoid over-watering as clay retains moisture well.")
    elif soil_type.lower() == "sandy":
        specific.append("Water more frequently but in smaller amounts.")
        
    # Pick a few random general suggestions
    general = random.sample(suggestions, 2)
    
    final_suggestions = specific + general
    
    return {
        "crop": crop_name,
        "soil_type": soil_type,
        "suggestions": final_suggestions
    }

if __name__ == "__main__":
    if len(sys.argv) > 2:
        crop = sys.argv[1]
        soil = sys.argv[2]
        result = farmer_suggestions(crop, soil)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Missing parameters: crop, soil_type"}))
