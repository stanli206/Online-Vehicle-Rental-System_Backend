import express from "express";
import { createVehicle } from "../Controllers/vehicleController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { adminMiddleware } from "../Middleware/roleMiddleware.js";
import { uploadVehicle } from "../Middleware/cloudinary.Middleware.js";

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  adminMiddleware,
  uploadVehicle.array("images", 5),
  createVehicle
);

export default router;
