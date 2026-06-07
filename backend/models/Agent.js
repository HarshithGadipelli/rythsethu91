import mongoose from "mongoose";

const agentSchema=new mongoose.Schema({

 user:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 vehicle:String,
 active:Boolean

});

export default mongoose.model("Agent",agentSchema);