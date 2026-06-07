import Crop from "../models/Crop.js";
import User from "../models/User.js";

export const addCrop = async (req, res) => {
  try {
    // Check if farmer is verified
    const farmerId = req.body.farmer;
    if (farmerId) {
      const farmer = await User.findById(farmerId);
      if (farmer && farmer.role === "farmer" && !farmer.isVerified) {
        return res.status(403).json({ 
          error: "Your account is pending verification. Only verified farmers can list crops on the marketplace. Please wait for admin approval." 
        });
      }
    }

    const cropData = { ...req.body };
    if (req.file) {
      cropData.image = `/uploads/${req.file.filename}`;
    }
    const crop = await Crop.create(cropData);
    
    // Emit real-time event
    const io = req.app?.get?.("io");
    if (io) io.emit("crop_added", crop);
    
    res.json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyCrops = async (req, res) => {
  const crops = await Crop.find({ farmer: req.user._id });
  res.json(crops);
};