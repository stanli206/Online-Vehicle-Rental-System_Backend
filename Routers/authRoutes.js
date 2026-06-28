import express from "express";
import {
  loginUser,
  registerUser,
  refreshToken,
  logoutUser,
} from "../Controllers/authController.js";
import { uploadProfile } from "../Middleware/cloudinary.Middleware.js";

const router = express.Router();

router.post("/register", uploadProfile.single("profilePicture"), registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", logoutUser);

export default router;
