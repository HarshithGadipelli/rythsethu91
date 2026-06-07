import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req,res,next)=>{
  let token=req.headers.authorization;

  if(!token) return res.status(401).json("No token");

  try{
    const decoded=jwt.verify(token.split(" ")[1],process.env.JWT_SECRET);

    req.user=await User.findById(decoded.id);

    next();
  }catch(err){
    res.status(401).json("Token invalid");
  }
}