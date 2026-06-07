import express from "express";
import User from "../models/User.js";
import Crop from "../models/Crop.js";
import Order from "../models/Order.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    const farmersCount = await User.countDocuments({ role: "farmer" });
    const customersCount = await User.countDocuments({ role: "customer" });
    const ordersCount = await Order.countDocuments({ status: "delivered" });
    
    // Sum total revenue
    const revenueAgg = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      farmers: farmersCount,
      customers: customersCount,
      orders: ordersCount,
      revenue: totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
