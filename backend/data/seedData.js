import Crop from "../models/Crop.js";

export const seedCrops=async()=>{

 await Crop.insertMany([

  {name:"Tomato",price:30,quantity:200},
  {name:"Potato",price:20,quantity:300},
  {name:"Carrot",price:25,quantity:150}

 ]);

}