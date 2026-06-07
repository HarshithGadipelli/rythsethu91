import express from "express";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";

const router = express.Router();

// Create order (with stock validation, delivery charges, bill)
router.post("/create", async (req, res) => {
  try {
    const { crop, quantity, deliveryType, deliveryCharges, deliveryDistance } = req.body;

    // Stock validation
    if (crop && quantity) {
      const cropDoc = await Crop.findById(crop);
      if (!cropDoc) return res.status(404).json({ error: "Crop not found" });
      if (cropDoc.quantity < Number(quantity)) {
        return res.status(400).json({ error: `Only ${cropDoc.quantity} ${cropDoc.unit || "kg"} available in stock.` });
      }
    }

    // Calculate amounts
    const subtotal = req.body.totalAmount || 0;
    const charges = deliveryType === "farm_pickup" ? 0 : (deliveryCharges || 0);
    const platformFee = Math.round(subtotal * 0.05); // 5% platform fee
    const totalAmount = subtotal + charges;

    const order = await Order.create({
      ...req.body,
      subtotal,
      deliveryCharges: charges,
      deliveryDistance: deliveryDistance || 0,
      platformFee,
      totalAmount,
      timeline: [{ status: "pending", note: "Order placed by customer" }]
    });

    // Decrement crop stock
    if (crop && quantity) {
      const updated = await Crop.findByIdAndUpdate(crop, {
        $inc: { quantity: -Number(quantity), totalOrders: 1 }
      }, { new: true });

      // Auto-mark unavailable if stock reaches 0
      if (updated && updated.quantity <= 0) {
        await Crop.findByIdAndUpdate(crop, { isAvailable: false });
      }
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
    const orders = await Order.find({ customer: req.params.id }).populate("crop").populate("farmer").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a farmer
router.get("/farmer/:id", async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.params.id }).populate("crop").populate("customer").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bill for an order
router.get("/:id/bill", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("crop").populate("customer").populate("farmer");
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      billNumber: order.billNumber,
      date: order.createdAt,
      customer: { name: order.customer?.name, phone: order.customer?.phone, address: order.deliveryAddress },
      farmer: { name: order.farmer?.name, location: order.farmer?.location },
      items: [{
        name: order.crop?.name || "Crop",
        quantity: order.quantity,
        unit: order.crop?.unit || "kg",
        unitPrice: order.crop?.price || 0,
        subtotal: order.subtotal
      }],
      deliveryType: order.deliveryType,
      deliveryCharges: order.deliveryCharges,
      deliveryDistance: order.deliveryDistance,
      platformFee: order.platformFee,
      totalAmount: order.totalAmount,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      status: order.status
    });
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

    // If cancelled, restore stock
    if (status === "cancelled") {
      const original = await Order.findById(req.params.id);
      if (original?.crop && original?.quantity) {
        await Crop.findByIdAndUpdate(original.crop, {
          $inc: { quantity: Number(original.quantity) },
          isAvailable: true
        });
      }
    }

    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign delivery agent to order
router.put("/:id/assign-agent", async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        agent: agentId,
        status: "assigned",
        $push: { timeline: { status: "assigned", note: "Delivery agent assigned" } }
      },
      { new: true }
    ).populate("crop").populate("customer").populate("farmer").populate("agent");

    const io = req.app.get("io");
    if (io) {
      io.emit("order_updated", order);
      io.emit("delivery_assigned", order);
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;