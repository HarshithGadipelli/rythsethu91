import Delivery from "../models/Delivery.js";

export const assignedDeliveries=async(req,res)=>{

 const deliveries=await Delivery.find({agent:req.user._id})
 .populate("order");

 res.json(deliveries);

}