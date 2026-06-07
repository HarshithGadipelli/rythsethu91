import express from "express";
import Crop from "../models/Crop.js";
import upload from "../middleware/upload.js";
import { addCrop } from "../controllers/farmerController.js";

const router = express.Router();

// Add crop with image
router.post("/add", upload.single("image"), addCrop);

// Get all crops
router.get("/", async (req, res) => {
  try {
    const crops = await Crop.find().populate("farmer", "name email location").sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single crop
router.get("/:id", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id).populate("farmer", "name email location");
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update crop availability
router.put("/:id/availability", async (req, res) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, { isAvailable: req.body.isAvailable }, { new: true });
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete crop
router.delete("/:id", async (req, res) => {
  try {
    await Crop.findByIdAndDelete(req.params.id);
    res.json({ message: "Crop removed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;