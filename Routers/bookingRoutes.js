import express from "express";
import {
  createBooking,
  getBookedDates,
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
router.get("/booked-dates/:vehicleId", getBookedDates);

// getBookings

export default router;
