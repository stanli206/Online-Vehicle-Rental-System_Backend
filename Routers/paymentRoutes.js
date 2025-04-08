import express from "express";
import {
  createPayment,
  getInvoiceDetailsByBookingId,
  getInvoiceDetailsByUserId,
  updatePaymentStatus,
} from "../Controllers/paymentController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createPayment", authMiddleware, createPayment);
router.post("/success", updatePaymentStatus);
router.get("/invoice/:bookingId", authMiddleware, getInvoiceDetailsByBookingId);
router.get("/userInvoice/:userId", authMiddleware, getInvoiceDetailsByUserId);

export default router;
