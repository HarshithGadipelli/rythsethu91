import mongoose from "mongoose";

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  category: {
    type: String,
    enum: ["vegetable", "fruit", "grain", "pulse", "spice", "dairy", "other"],
    default: "vegetable"
  },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: "kg", enum: ["kg", "g", "litre", "piece", "dozen"] },
  minOrderQty: { type: Number, default: 1 },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  image: { type: String, default: "" },
  images: [{ type: String }],
  location: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  harvestDate: { type: Date },
  expiryDate: { type: Date },
  season: { type: String, enum: ["kharif", "rabi", "zaid", "perennial"], default: "kharif" },
  isOrganic: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  isPrebooking: { type: Boolean, default: false },
  nutritionInfo: {
    calories: Number,
    carbs: Number,
    protein: Number,
    fat: Number,
    fiber: Number
  },
  rating: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Crop", cropSchema);