import express from "express";
import { 
  suggestCrop, 
  predictDemand, 
  analyzeNutrition, 
  farmerSuggestions,
  routeOptimize
} from "../controllers/mlController.js";

const router = express.Router();

router.post("/crop-suggest", suggestCrop);
router.post("/demand-predict", predictDemand);
router.post("/nutrition", analyzeNutrition);
router.post("/farmer-suggest", farmerSuggestions);
router.post("/route-optimize", routeOptimize);

export default router;