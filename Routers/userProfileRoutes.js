import express from "express";
import {
  getAllCompletedPaymentsWithBookingHistory,
  getAllUsers,
  getPaymentsWithBookingHistoryByUserId,
  getUserProfile,
  updateUserProfile,
} from "../Controllers/userProfile.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { adminMiddleware } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.get("/userProfile/:id", authMiddleware, getUserProfile);
router.get("/getAllProfile", authMiddleware, adminMiddleware, getAllUsers);
router.put("/updateProfile/:id", authMiddleware, updateUserProfile);
router.get(
  "/users&bookings&payments",
  authMiddleware,
  adminMiddleware,
  getAllCompletedPaymentsWithBookingHistory
);
router.get(
  "/users&bookings&payments/:userId",
  authMiddleware,
  getPaymentsWithBookingHistoryByUserId
);

export default router;
