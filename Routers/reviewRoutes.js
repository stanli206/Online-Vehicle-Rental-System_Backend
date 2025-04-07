import express from "express";
import {
  addReview,
  deleteReview,
  getAllReviews,
  getAverageRating,
  getReviewsByID,
  getReviewsByUser,
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
//  (reviewRoutes.js)
router.get("/:vehicleId/average-rating", getAverageRating);
router.get("/getReviewById/:userId", authMiddleware, getReviewsByUser);

export default router;
