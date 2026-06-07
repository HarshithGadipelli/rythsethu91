import Order from "../models/Order.js";

export const placeOrder=async(req,res)=>{
 const order=await Order.create(req.body);

 res.json(order);
}

export const myOrders=async(req,res)=>{
 const orders=await Order.find({customer:req.user._id});

 res.json(orders);
}