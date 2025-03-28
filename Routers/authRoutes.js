import express from "express";
import { loginUser, registerUser } from "../Controllers/authController.js";
import { uploadProfile } from "../Middleware/cloudinary.Middleware.js";

const router = express.Router();

router.post("/register", uploadProfile.single("profilePicture"), registerUser);
router.post("/login", loginUser);

export default router;
