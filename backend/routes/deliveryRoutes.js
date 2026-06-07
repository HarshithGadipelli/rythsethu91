import express from "express";
import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";

const router = express.Router();

// Get all deliveries
router.get("/", async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate({ path: "order", populate: [{ path: "crop" }, { path: "customer" }, { path: "farmer" }] })
      .populate("agent")
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get deliveries for a specific agent
router.get("/agent/:agentId", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ agent: req.params.agentId })
      .populate({ path: "order", populate: [{ path: "crop" }, { path: "customer" }, { path: "farmer" }] })
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get available orders needing delivery (unassigned, confirmed orders with delivery type)
router.get("/available", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["confirmed", "processing"] },
      agent: { $exists: false },
      deliveryType: { $ne: "farm_pickup" }
    }).populate("crop").populate("customer").populate("farmer").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Agent accepts a delivery
router.post("/accept/:orderId", async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findById(req.params.orderId).populate("crop").populate("farmer");
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.agent) return res.status(400).json({ error: "This order already has an assigned agent" });

    // Update order
    order.agent = agentId;
    order.status = "assigned";
    order.timeline.push({ status: "assigned", note: "Delivery agent accepted the order" });
    await order.save();

    // Create delivery record
    const delivery = await Delivery.create({
      order: order._id,
      agent: agentId,
      pickupLocation: order.farmer?.location || order.crop?.location || "",
      deliveryLocation: order.deliveryAddress || "",
      vehicleType: req.body.vehicleType || "bike",
      estimatedTime: "30-45 mins",
      trackingCode: "TRK-" + Date.now().toString(36).toUpperCase()
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("delivery_assigned", delivery);
      io.emit("order_updated", order);
    }

    res.json({ order, delivery });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign delivery (by admin)
router.post("/assign", async (req, res) => {
  try {
    const delivery = await Delivery.create(req.body);
    const io = req.app.get("io");
    if (io) io.emit("delivery_assigned", delivery);
    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update delivery status
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updates = { status };
    if (status === "delivered") updates.deliveredAt = new Date();

    const delivery = await Delivery.findByIdAndUpdate(id, updates, { new: true }).populate("order");

    // Also update the order status
    if (delivery?.order) {
      const orderStatusMap = {
        "picked_up": "picked_up",
        "in_transit": "in_transit",
        "delivered": "delivered",
        "failed": "cancelled"
      };
      if (orderStatusMap[status]) {
        await Order.findByIdAndUpdate(delivery.order._id || delivery.order, {
          status: orderStatusMap[status],
          $push: { timeline: { status: orderStatusMap[status], note: `Delivery ${status.replace("_", " ")}` } }
        });
      }
    }

    const io = req.app.get("io");
    if (io) io.emit("delivery_updated", delivery);

    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Agent earnings
router.get("/earnings/:agentId", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ agent: req.params.agentId, status: "delivered" }).populate("order");
    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.order?.deliveryCharges || 30), 0);
    const todayDeliveries = deliveries.filter(d => {
      const today = new Date();
      const deliveredDate = new Date(d.deliveredAt || d.updatedAt);
      return deliveredDate.toDateString() === today.toDateString();
    }).length;

    res.json({ totalDeliveries, totalEarnings, todayDeliveries, perDeliveryAvg: totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;