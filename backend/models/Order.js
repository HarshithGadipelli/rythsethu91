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
  subtotal: { type: Number, default: 0 },
  deliveryCharges: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "assigned", "picked_up", "in_transit", "delivered", "cancelled"],
    default: "pending"
  },
  paymentMode: { type: String, enum: ["cod", "upi", "card", "wallet", "online"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
  deliveryAddress: { type: String, default: "" },
  deliveryLatitude: { type: Number },
  deliveryLongitude: { type: Number },
  deliveryType: { type: String, enum: ["standard", "express", "farm_pickup"], default: "standard" },
  deliveryDistance: { type: Number, default: 0 }, // in km
  notes: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  timeline: [timelineSchema]
}, { timestamps: true });

// Auto-generate bill number
orderSchema.pre("save", function(next) {
  if (!this.billNumber) {
    this.billNumber = "RS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  next();
});

export default mongoose.model("Order", orderSchema);