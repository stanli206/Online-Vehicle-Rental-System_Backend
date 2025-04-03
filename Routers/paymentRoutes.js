import express from "express";
import {
  createPayment,
  updatePaymentStatus,
} from "../Controllers/paymentController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createPayment", authMiddleware, createPayment);
router.post("/success", updatePaymentStatus);

export default router;
