import Crop from "../models/Crop.js";

export const getCrops=async(req,res)=>{

 const crops=await Crop.find().populate("farmer");

 res.json(crops);

}