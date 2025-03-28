import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../cloudinary/cloudinary.config.js";

// Profile picture upload
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_pictures", // Cloudinary folder for profile pictures
    allowed_formats: ["jpg", "png", "jpeg", "webp"], 
  },
});

//Vehicle image upload
const vehicleImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vehicle_images", // Cloudinary folder for vehicle images
    allowed_formats: ["jpg", "png", "jpeg","webp"],
  },
});

const uploadProfile = multer({ storage: profileStorage });
const uploadVehicle = multer({ storage: vehicleImageStorage });

export { uploadProfile ,uploadVehicle}; 
