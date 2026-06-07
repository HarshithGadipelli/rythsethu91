import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  address: { type: String, default: "" },
  pincode: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  preferences: [{ type: String }], // preferred crops
  dietaryRestrictions: [{ type: String }], // vegetarian, vegan, etc
  totalOrders: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);