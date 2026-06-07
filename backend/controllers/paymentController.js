import Payment from "../models/Payment.js";

export const createPayment=async(req,res)=>{

 const payment=await Payment.create(req.body);

 res.json(payment);

}