import express from "express";
import dotenv from "dotenv";
import connectDB from "./Database/Config.js";
import authRoutes from "./Routers/authRoutes.js";
import vehicleRoutes from "./Routers/vehicleRoutes.js";
import bookingRoutes from "./Routers/bookingRoutes.js";
import paymentRoutes from "./Routers/paymentRoutes.js";
import reviewRoutes from "./Routers/reviewRoutes.js";
import userProfileRoutes from "./Routers/userProfileRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "https://onlinerentauto.netlify.app",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

const port = process.env.PORT;
app.use(express.json());
connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/user", userProfileRoutes);

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
