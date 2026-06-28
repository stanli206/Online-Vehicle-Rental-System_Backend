import express from "express";
import { chatWithGemini } from "../Controllers/geminiController.js";
import { optionalAuth } from "../Middleware/optionalAuth.js";

const router = express.Router();

// optionalAuth: works for guests, but if logged in the bot can see the user's bookings.
router.post("/chat", optionalAuth, chatWithGemini);

export default router;
