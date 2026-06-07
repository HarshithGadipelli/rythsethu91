import express from "express";
import Delivery from "../models/Delivery.js";

const router = express.Router();


router.get("/assigned/:agentId", async (req, res) => {

  try {

    const deliveries = await Delivery.find({
      agent: req.params.agentId
    })
    .populate("order")
    .populate("agent");

    res.json(deliveries);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


router.put("/update-status/:deliveryId", async (req, res) => {

  try {

    const delivery = await Delivery.findByIdAndUpdate(
      req.params.deliveryId,
      { status: req.body.status },
      { new: true }
    );

    res.json(delivery);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


export default router;