import mongoose from "mongoose";

const reviewSchema=new mongoose.Schema({

 user:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 rating:Number,

 comment:String

});

export default mongoose.model("Review",reviewSchema);