import mongoose from "mongoose";

const farmSchema=new mongoose.Schema({

 farmer:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 name:String,
 location:String,
 size:Number,
 crops:[String]

});

export default mongoose.model("Farm",farmSchema);