import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/authMiddleware.js"; // Assuming auth middleware exists

const router = express.Router();

// Get unread notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put("/:userId/read", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.params.userId, read: false }, { read: true });
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
