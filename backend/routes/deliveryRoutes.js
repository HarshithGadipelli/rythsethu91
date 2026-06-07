import express from "express";
import Delivery from "../models/Delivery.js";
import { assignDelivery, getDeliveriesByAgent, updateDeliveryStatus } from "../controllers/deliveryController.js";

const router = express.Router();

router.post("/assign", assignDelivery);
router.get("/", async (req, res) => {
  const deliveries = await Delivery.find().populate("order").populate("agent");
  res.json(deliveries);
});

router.get("/agent/:agentId", getDeliveriesByAgent);
router.put("/:id/status", updateDeliveryStatus);

export default router;