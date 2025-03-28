import express from "express";
import {
  createVehicle,
  getVehicles,
  updateVehicle,
} from "../Controllers/vehicleController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { adminMiddleware } from "../Middleware/roleMiddleware.js";
import { uploadVehicle } from "../Middleware/cloudinary.Middleware.js";

const router = express.Router();

//create vehicle
router.post(
  "/create",
  authMiddleware,
  adminMiddleware,
  uploadVehicle.single("image"),
  createVehicle
);

//get All vehicle
router.get("/getAllVehicles", getVehicles);

//update
router.put(
  "/update/:id",
  authMiddleware,
  adminMiddleware,
  uploadVehicle.single("image"), 
  updateVehicle
);

export default router;
