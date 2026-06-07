import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
  status: String,
  note: String,
  timestamp: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "assigned", "picked_up", "in_transit", "delivered", "cancelled"],
    default: "pending"
  },
  paymentMode: { type: String, enum: ["cod", "upi", "card", "wallet"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
  deliveryAddress: { type: String, default: "" },
  deliveryLatitude: { type: Number },
  deliveryLongitude: { type: Number },
  deliveryType: { type: String, enum: ["standard", "express"], default: "standard" },
  notes: { type: String, default: "" },
  timeline: [timelineSchema]
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);