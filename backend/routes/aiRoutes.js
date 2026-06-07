import express from "express";
import { parseIntent } from "../controllers/aiController.js";

const router = express.Router();
router.post("/parse", parseIntent);

export default router;
