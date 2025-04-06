import express from "express";
import {
  getUserProfile,
  updateUserProfile,
} from "../Controllers/userProfile.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/userProfile/:id", authMiddleware, getUserProfile);
router.put("/updateProfile/:id", authMiddleware, updateUserProfile);

export default router;
