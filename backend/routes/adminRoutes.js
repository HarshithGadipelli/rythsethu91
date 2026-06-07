import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Crop from "../models/Crop.js";
import Delivery from "../models/Delivery.js";
import Farmer from "../models/Farmer.js";

const router = express.Router();

// ─── USERS ───
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Farmer.deleteMany({ user: req.params.id });
    res.json({ message: "User deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FARMER VERIFICATION ───
router.put("/users/:id/verify", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select("-password");
    if (user.role === "farmer") {
      await Farmer.findOneAndUpdate({ user: req.params.id }, { verified: true, aadhaarVerified: true });
    }
    const io = req.app.get("io");
    if (io) io.emit("farmer_verified", { userId: req.params.id });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: false }, { new: true }).select("-password");
    if (user.role === "farmer") {
      await Farmer.findOneAndUpdate({ user: req.params.id }, { verified: false });
    }
    res.json({ user, reason: reason || "Verification rejected" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ORDERS ───
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("crop").populate("customer").populate("farmer").populate("agent")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELIVERIES ───
router.get("/deliveries", async (req, res) => {
  try {
    const deliveries = await Delivery.find().populate("order").populate("agent").sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign delivery agent to order
router.post("/delivery/assign", async (req, res) => {
  try {
    const { orderId, agentId, pickupLocation, deliveryLocation, vehicleType } = req.body;

    // Update the order
    const order = await Order.findByIdAndUpdate(orderId, {
      agent: agentId,
      status: "assigned",
      $push: { timeline: { status: "assigned", note: "Delivery agent assigned by admin" } }
    }, { new: true }).populate("crop").populate("customer").populate("farmer");

    // Create delivery record
    const delivery = await Delivery.create({
      order: orderId,
      agent: agentId,
      pickupLocation: pickupLocation || order?.farmer?.location || "",
      deliveryLocation: deliveryLocation || order?.deliveryAddress || "",
      vehicleType: vehicleType || "bike",
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

// ─── PLATFORM STATS ───
router.get("/stats", async (req, res) => {
  try {
    const [users, orders, crops, deliveries] = await Promise.all([
      User.countDocuments(),
      Order.find(),
      Crop.countDocuments(),
      Delivery.countDocuments()
    ]);

    const farmers = await User.countDocuments({ role: "farmer" });
    const customers = await User.countDocuments({ role: "customer" });
    const agents = await User.countDocuments({ role: "agent" });
    const verifiedFarmers = await User.countDocuments({ role: "farmer", isVerified: true });
    const pendingFarmers = await User.countDocuments({ role: "farmer", isVerified: false });

    const totalRevenue = orders.reduce((a, o) => a + (o.totalAmount || 0), 0);
    const totalDeliveryCharges = orders.reduce((a, o) => a + (o.deliveryCharges || 0), 0);
    const totalPlatformFees = orders.reduce((a, o) => a + (o.platformFee || 0), 0);
    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    const cancelledOrders = orders.filter(o => o.status === "cancelled").length;

    // Revenue by category
    const revenueByCategory = {};
    for (const order of orders) {
      if (order.crop) {
        const crop = await Crop.findById(order.crop);
        if (crop) {
          const cat = crop.category || "other";
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (order.totalAmount || 0);
        }
      }
    }

    res.json({
      totalUsers: users, farmers, customers, agents,
      verifiedFarmers, pendingFarmers,
      totalOrders: orders.length, pendingOrders, deliveredOrders, cancelledOrders,
      totalCrops: crops, totalDeliveries: deliveries,
      totalRevenue, totalDeliveryCharges, totalPlatformFees,
      platformProfit: totalPlatformFees + totalDeliveryCharges,
      revenueByCategory
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AVAILABLE AGENTS ───
router.get("/agents", async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).select("-password");
    res.json(agents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;