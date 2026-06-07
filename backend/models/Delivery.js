import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pickupLocation: { type: String, default: "" },
  deliveryLocation: { type: String, default: "" },
  pickupLatitude: { type: Number },
  pickupLongitude: { type: Number },
  deliveryLatitude: { type: Number },
  deliveryLongitude: { type: Number },
  route: { type: String, default: "" },
  vehicleType: { type: String, enum: ["bike", "auto", "truck", "van"], default: "bike" },
  agentPhone: { type: String, default: "" },
  estimatedTime: { type: String, default: "" },
  trackingCode: { type: String, default: "" },
  status: {
    type: String,
    enum: ["assigned", "picked_up", "in_transit", "delivered", "failed"],
    default: "assigned"
  },
  deliveredAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("Delivery", deliverySchema);