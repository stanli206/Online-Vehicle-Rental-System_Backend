import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./Routers/authRoutes.js";
import vehicleRoutes from "./Routers/vehicleRoutes.js";
import bookingRoutes from "./Routers/bookingRoutes.js";
import paymentRoutes from "./Routers/paymentRoutes.js";
import reviewRoutes from "./Routers/reviewRoutes.js";
import userProfileRoutes from "./Routers/userProfileRoutes.js";
import geminiRoute from "./Routers/geminiRoute.js";

dotenv.config();

// Build and configure the Express app. Kept separate from the server entry
// (index.js) so it can be imported by tests without opening a port.
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/gemini", geminiRoute);

export default app;
