import User from "../models/User.js";
import Order from "../models/Order.js";

export const getUsers=async(req,res)=>{
 const users=await User.find();

 res.json(users);
}

export const getOrders = async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};