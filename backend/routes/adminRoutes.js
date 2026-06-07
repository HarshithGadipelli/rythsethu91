import express from "express";
import { getOrders, deleteUser } from "../controllers/adminController.js";
import User from "../models/User.js";

const router = express.Router();

// All users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All orders
router.get("/orders", getOrders);

// Delete user
router.delete("/users/:id", deleteUser);

// Change user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify farmer
router.put("/users/:id/verify", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;