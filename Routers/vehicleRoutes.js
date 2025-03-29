import express from "express";
import {
  createVehicle,
  deleteVehicle,
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
  uploadVehicle.single("images"),
  createVehicle
);

//get All vehicle
router.get("/getAllVehicles", getVehicles);

//update
router.put(
  "/update/:id",
  authMiddleware,
  adminMiddleware,
  uploadVehicle.single("images"), 
  updateVehicle
);

//delete
router.delete("/delete/:id",authMiddleware,adminMiddleware,deleteVehicle)

export default router;
