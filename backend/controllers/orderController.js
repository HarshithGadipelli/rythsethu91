import Order from "../models/Order.js";

export const createOrder=async(req,res)=>{
 const order=await Order.create(req.body);

 res.json(order);
}