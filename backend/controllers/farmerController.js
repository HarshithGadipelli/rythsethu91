import Crop from "../models/Crop.js";

export const addCrop = async (req, res) => {
  try {
    const cropData = { ...req.body };
    if (req.file) {
      cropData.image = `/uploads/${req.file.filename}`;
    }
    const crop = await Crop.create(cropData);
    res.json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyCrops=async(req,res)=>{
 const crops=await Crop.find({farmer:req.user._id});

 res.json(crops);
}