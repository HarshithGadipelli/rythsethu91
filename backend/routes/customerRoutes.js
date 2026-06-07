import express from "express";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";

const router = express.Router();


router.get("/marketplace", async (req, res) => {

  try {

    const crops = await Crop.find().populate("farmer");

    res.json(crops);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


router.post("/place-order", async (req, res) => {

  try {

    const order = await Order.create(req.body);

    res.json(order);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


router.get("/orders/:customerId", async (req, res) => {

  try {

    const orders = await Order.find({
      customer: req.params.customerId
    })
    .populate("crop");

    res.json(orders);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


export default router;