import mongoose from "mongoose";

const paymentSchema=new mongoose.Schema({

 order:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Order"
 },

 amount:Number,

 method:String,

 status:{
  type:String,
  default:"pending"
 }

});

export default mongoose.model("Payment",paymentSchema);