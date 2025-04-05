import express from "express";
import {
  createBooking,
  getBookedDates,
  getBookings,
  getUserBookingsWithPayments,
  updateBookingStatus,
} from "../Controllers/bookingController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createBooking", authMiddleware, createBooking);
router.get("/myBooking", authMiddleware, getBookings);
router.put("/updateStatus/:id", authMiddleware, updateBookingStatus);
router.get("/booked-dates/:vehicleId", getBookedDates);
router.get(
  "/booking&payment/:userId",
  authMiddleware,
  getUserBookingsWithPayments
);

export default router;
