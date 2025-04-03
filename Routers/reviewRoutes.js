import express from "express";
import { addReview, getReviewsByID } from "../Controllers/reviewController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createReview/:vehicleId", authMiddleware, addReview);
router.post("/getAllReview/:vehicleId", authMiddleware, getReviewsByID);

export default router;
