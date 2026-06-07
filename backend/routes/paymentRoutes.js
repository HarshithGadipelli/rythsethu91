import express from "express";
import Payment from "../models/Payment.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_MOCKKEYID",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "MOCKSECRET_abcdefgh"
});

const router = express.Router();


router.post("/create", async (req, res) => {

  try {

    const payment = await Payment.create(req.body);

    res.json(payment);

  } catch (error) {

    res.status(500).json(error.message);

  }

});


router.get("/history/:orderId", async (req, res) => {

  try {

    const payments = await Payment.find({
      order: req.params.orderId
    });

    res.json(payments);

  } catch (error) {

    res.status(500).json(error.message);

  }

});




router.post("/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/razorpay/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "MOCKSECRET_abcdefgh")
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});export default router;
