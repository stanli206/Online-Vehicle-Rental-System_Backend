import cloudinary from "../cloudinary/cloudinary.config.js";
import Vehicle from "../Models/Vehicle.schema.js";
// import 

export const createVehicle = async (req, res) => {
  try {
    const { make, model, year, pricePerDay, location, description } = req.body;

    let vehicleImages = [];
    if (req.files) {
      for (const file of req.files) {
        const uploadedImage = await cloudinary.uploader.upload(file.path, {
          folder: "vehicle_images",
        });
        vehicleImages.push(uploadedImage.secure_url); // Store Cloudinary URL
      }
    }

    const vehicle = new Vehicle({
      make,
      model,
      year,
      pricePerDay,
      location,
      availability: true,
      images: vehicleImages, // Store uploaded images
      description,
    });

    await vehicle.save();
    res.status(201).json({ message: "Vehicle created successfully", vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
