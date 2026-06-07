import express from "express";
import { 
  suggestCrop, 
  predictDemand, 
  analyzeNutrition, 
  farmerSuggestions 
} from "../controllers/mlController.js";

const router = express.Router();

router.post("/crop-suggest", suggestCrop);
router.post("/demand-predict", predictDemand);
router.post("/nutrition", analyzeNutrition);
router.post("/farmer-suggest", farmerSuggestions);

export default router;