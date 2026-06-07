import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import Order from "../models/Order.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ML_MODELS_PATH = path.join(__dirname, "../../ml_models");

const runPythonScript = (scriptName, args) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [path.join(ML_MODELS_PATH, scriptName), ...args]);
    
    let dataString = "";
    pythonProcess.stdout.on("data", (data) => {
      dataString += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python Error: ${data}`);
    });
    
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
      } else {
        try {
          resolve(JSON.parse(dataString));
        } catch (err) {
          reject(new Error("Failed to parse python output: " + dataString));
        }
      }
    });
  });
};

export const suggestCrop = async (req, res) => {
  try {
    const { temp, hum, rain } = req.body;
    if (!temp || !hum || !rain) return res.status(400).json({ error: "Missing temp, hum, or rain" });
    const result = await runPythonScript("crop_suggestion.py", [temp, hum, rain]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const predictDemand = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const demand = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $lookup: { from: "crops", localField: "crop", foreignField: "_id", as: "cropInfo" } },
      { $unwind: "$cropInfo" },
      { $group: { _id: "$cropInfo.name", totalSold: { $sum: "$quantity" }, revenue: { $sum: "$totalAmount" } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);
    
    if (demand.length === 0) {
      return res.json({ demand: ["Tomato", "Rice", "Onion"], message: "Not enough recent data, showing default high demand crops." });
    }
    
    const topCrops = demand.map(d => d._id);
    res.json({ demand: topCrops, raw: demand });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const analyzeNutrition = async (req, res) => {
  try {
    const { crop } = req.body;
    if (!crop) return res.status(400).json({ error: "Missing crop" });
    const result = await runPythonScript("nutrition_analysis.py", [crop]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const farmerSuggestions = async (req, res) => {
  try {
    const { crop, soil } = req.body;
    if (!crop || !soil) return res.status(400).json({ error: "Missing crop or soil" });
    const result = await runPythonScript("farmer_suggestion.py", [crop, soil]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const routeOptimize = async (req, res) => {
  try {
    const { agentLat, agentLng, orders } = req.body;
    if (!agentLat || !agentLng || !orders || orders.length === 0) {
      return res.status(400).json({ error: "Missing agent location or orders" });
    }

    let currentLat = parseFloat(agentLat);
    let currentLng = parseFloat(agentLng);
    
    const unvisited = [...orders];
    const optimized = [];
    
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < unvisited.length; i++) {
        const dLat = unvisited[i].deliveryLatitude || unvisited[i].customer?.latitude || 0;
        const dLng = unvisited[i].deliveryLongitude || unvisited[i].customer?.longitude || 0;
        const dist = getDistance(currentLat, currentLng, dLat, dLng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      
      const nearest = unvisited.splice(nearestIdx, 1)[0];
      optimized.push(nearest);
      currentLat = nearest.deliveryLatitude || nearest.customer?.latitude || currentLat;
      currentLng = nearest.deliveryLongitude || nearest.customer?.longitude || currentLng;
    }
    
    res.json(optimized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};