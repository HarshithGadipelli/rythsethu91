import express from "express";
import Crop from "../models/Crop.js";

const router = express.Router();

router.get("/my-crops/:id", async (req, res) => {
  const crops = await Crop.find({ farmer: req.params.id });
  res.json(crops);
});

export default router;