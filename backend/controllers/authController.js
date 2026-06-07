import User from "../models/User.js";
import Farmer from "../models/Farmer.js";
import Customer from "../models/Customer.js";
import Agent from "../models/Agent.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const {
      name, email, password, phone, role, location,
      latitude, longitude, language, aadhaar,
      // Farmer extras
      farmName, farmLocation, farmSize, soilType, experience,
      // Customer extras
      // Customer extras
      address, pincode, city, state
    } = req.body;

    console.log("Registering user:", email, role);

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, email, password: hashed, phone,
      role: role || "customer",
      location, latitude, longitude,
      language: language || "en",
      aadhaar
    });

    console.log("Created base user. Role:", user.role);

    // Create role-specific profile
    if (user.role === "farmer") {
      await Farmer.create({
        user: user._id,
        farmName: farmName || "",
        farmLocation: farmLocation || location || "",
        latitude, longitude,
        farmSize: farmSize || 0,
        soilType: soilType || "loamy",
        experience: experience || 0
      });
    } else if (user.role === "customer") {
      await Customer.create({
        user: user._id,
        address: address || location || "",
        pincode: pincode || "",
        city: city || "",
        state: state || ""
      });
    } else if (user.role === "agent") {
      await Agent.create({
        user: user._id,
        vehicle: "To be confirmed",
        active: true
      });
    }

    console.log("Creating token...");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    console.log("Sending response...");
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found. Please register first." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password. Please try again." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    // Fetch role profile
    let profile = null;
    if (user.role === "farmer") profile = await Farmer.findOne({ user: user._id });
    else if (user.role === "customer") profile = await Customer.findOne({ user: user._id });
    else if (user.role === "agent") profile = await Agent.findOne({ user: user._id });

    res.json({
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, language: user.language, location: user.location,
        latitude: user.latitude, longitude: user.longitude, isVerified: user.isVerified
      },
      profile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    let profile = null;
    if (user.role === "farmer") profile = await Farmer.findOne({ user: user._id });
    else if (user.role === "customer") profile = await Customer.findOne({ user: user._id });
    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};