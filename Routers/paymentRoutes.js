import express from "express";
import {
  createPayment,
  getInvoiceDetailsByBookingId,
  updatePaymentStatus,
} from "../Controllers/paymentController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createPayment", authMiddleware, createPayment);
router.post("/success", updatePaymentStatus);
router.get("/invoice/:bookingId", authMiddleware, getInvoiceDetailsByBookingId);

export default router;
