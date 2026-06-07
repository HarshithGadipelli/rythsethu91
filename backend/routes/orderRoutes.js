import express from "express";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";

const router = express.Router();

// Create order (decrement crop quantity)
router.post("/create", async (req, res) => {
  try {
    const order = await Order.create({
      ...req.body,
      timeline: [{ status: "pending", note: "Order placed by customer" }]
    });
    if (req.body.crop && req.body.quantity) {
      await Crop.findByIdAndUpdate(req.body.crop, {
        $inc: { quantity: -Number(req.body.quantity) }
      });
    }
    
    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.emit("order_created", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("crop").populate("customer").populate("farmer").populate("agent").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a customer
router.get("/customer/:id", async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.params.id }).populate("crop").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: { timeline: { status, note: note || `Status changed to ${status}` } }
      },
      { new: true }
    );
    
    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;