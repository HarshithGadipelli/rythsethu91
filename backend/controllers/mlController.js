import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

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
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: "Missing month" });
    const result = await runPythonScript("demand_prediction.py", [month]);
    res.json(result);
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