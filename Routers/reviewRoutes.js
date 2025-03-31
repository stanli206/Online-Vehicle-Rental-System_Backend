import express from "express";
import { addReview } from "../Controllers/reviewController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/createReview/:vehicleId", authMiddleware, addReview);

export default router;
