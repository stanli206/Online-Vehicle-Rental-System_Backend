import express from "express";
import {
  addReview,
  deleteReview,
  getAllReviews,
  getAverageRating,
  getReviewsByID,
} from "../Controllers/reviewController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { adminMiddleware } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/createReview/:vehicleId", authMiddleware, addReview);
router.get("/getAllReviewById/:vehicleId", getReviewsByID);
router.get("/getAllReviews", authMiddleware, adminMiddleware, getAllReviews);
router.delete(
  "/deleteReview/:reviewId",
  authMiddleware,
  adminMiddleware,
  deleteReview
);
// In your backend routes (reviewRoutes.js)
router.get("/:vehicleId/average-rating", getAverageRating);

export default router;
