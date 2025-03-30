import express from "express";
import {
  confirmPayment,
  createPayment,
} from "../Controllers/paymentController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createPayment", authMiddleware, createPayment);
router.post("/confirmPayment", confirmPayment);

export default router;
