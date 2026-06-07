import mongoose from "mongoose";

const predictionSchema=new mongoose.Schema({

 crop:String,

 demand:Number,

 suggestedPrice:Number,

 date:Date

});

export default mongoose.model("Prediction",predictionSchema);