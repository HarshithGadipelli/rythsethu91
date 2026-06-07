import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  role: {
    type: String,
    enum: ["farmer", "customer", "agent", "admin"],
    default: "customer"
  },
  language: { type: String, default: "en", enum: ["en", "te", "hi", "kn", "ta"] },
  location: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  avatar: { type: String, default: "" },
  aadhaar: { type: String, default: "" },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("User", userSchema);