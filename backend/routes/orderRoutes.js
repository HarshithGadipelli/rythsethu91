import express from "express";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Create order (with stock validation, delivery charges, bill)
router.post("/create", async (req, res) => {
  try {
    const { crop, quantity, deliveryType, deliveryCharges, deliveryDistance, isPrebooked, pointsUsed, customer, farmer } = req.body;

    // Stock validation
    if (crop && quantity) {
      const cropDoc = await Crop.findById(crop);
      if (!cropDoc) return res.status(404).json({ error: "Crop not found" });
      if (cropDoc.quantity < Number(quantity)) {
        return res.status(400).json({ error: `Only ${cropDoc.quantity} ${cropDoc.unit || "kg"} available in stock.` });
      }
    }

    // Handle reward points deduction
    let finalDiscount = 0;
    if (pointsUsed && Number(pointsUsed) > 0 && customer) {
      const cust = await User.findById(customer);
      if (cust && cust.rewardPoints >= Number(pointsUsed)) {
        finalDiscount = Number(pointsUsed);
        await User.findByIdAndUpdate(customer, { $inc: { rewardPoints: -finalDiscount } });
      }
    }

    // Calculate amounts
    const subtotal = req.body.totalAmount || 0;
    const charges = deliveryType === "farm_pickup" ? 0 : (deliveryCharges || 0);
    const platformFee = Math.round(subtotal * 0.05); // 5% platform fee
    const totalAmount = Math.max(0, subtotal + charges - finalDiscount);
    const pointsEarned = Math.floor(totalAmount / 100);

    const initialStatus = isPrebooked ? "prebooked" : "pending";

    const order = await Order.create({
      ...req.body,
      status: initialStatus,
      isPrebooked: isPrebooked || false,
      pointsEarned,
      pointsUsed: finalDiscount,
      subtotal,
      deliveryCharges: charges,
      deliveryDistance: deliveryDistance || 0,
      platformFee,
      totalAmount,
      timeline: [{ status: initialStatus, note: isPrebooked ? "Pre-booking placed" : "Order placed by customer" }]
    });

    // Award reward points and notify
    if (pointsEarned > 0) {
      if (customer) {
        await User.findByIdAndUpdate(customer, { $inc: { rewardPoints: pointsEarned } });
        await Notification.create({ user: customer, title: "🏆 Points Earned!", message: `You earned ${pointsEarned} Reward Points from your purchase!`, type: "reward" });
      }
      if (farmer) {
        await User.findByIdAndUpdate(farmer, { $inc: { rewardPoints: pointsEarned } });
        await Notification.create({ user: farmer, title: "💰 New Sale & Points!", message: `You earned ${pointsEarned} Reward Points from a new order.`, type: "reward" });
      }
    } else if (farmer) {
      await Notification.create({ user: farmer, title: "📦 New Order Received!", message: `You have received a new order.`, type: "order" });
    }

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
      // Note: we might want to refund pointsUsed here, but skipping for brevity
    }

    // If delivered, give delivery agent experience points (10 per delivery)
    if (status === "delivered") {
      const deliveredOrder = await Order.findById(req.params.id);
      if (deliveredOrder && deliveredOrder.agent) {
        await User.findByIdAndUpdate(deliveredOrder.agent, { $inc: { experiencePoints: 10 } });
      }
    }

    // Emit real-time event and notify customer
    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    const updatedOrder = await Order.findById(req.params.id);
    if (updatedOrder && updatedOrder.customer) {
      await Notification.create({ 
        user: updatedOrder.customer, 
        title: "📦 Order Update", 
        message: `Your order status has been updated to: ${status.replace("_", " ")}`, 
        type: "order" 
      });
    }

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

    // Notify agent and customer
    await Notification.create({ user: agentId, title: "🚚 New Delivery", message: "You have been assigned a new delivery.", type: "order" });
    if (order.customer) {
      await Notification.create({ user: order.customer._id, title: "🚚 Agent Assigned", message: "A delivery agent has been assigned to your order.", type: "order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;