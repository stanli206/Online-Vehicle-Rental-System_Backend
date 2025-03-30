import express from "express";
import {
  createBooking,
  getBookings,
  updateBookingStatus,
} from "../Controllers/bookingController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createBooking", authMiddleware, createBooking);
router.get("/myBooking", authMiddleware, getBookings);
router.put(
  "/updateStatus/:id",
  authMiddleware,
  authMiddleware,
  updateBookingStatus
);

// getBookings

export default router;
