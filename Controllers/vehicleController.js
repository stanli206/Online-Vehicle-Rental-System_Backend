import cloudinary from "../Config/cloudinary.config.js";
import Vehicle from "../Models/Vehicle.schema.js";

//create vehicle | Admin only
export const createVehicle = async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      pricePerDay,
      location,
      description,
      seats,
      fuelType,
      transmission,
    } = req.body;

    let vehicleImage = ""; // Default empty string for single image

    // Check if image is uploaded
    if (req.file) {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "vehicle_images",
      });
      vehicleImage = uploadedImage.secure_url; //
    }

    const vehicle = new Vehicle({
      make,
      model,
      year,
      pricePerDay,
      location,
      availability: true,
      images:
        req.file.path ||
        req.file.secure_url ||
        req.file.url ||
        req.file.filename ||
        vehicleImage,
      description,
      seats,
      fuelType,
      transmission,
    });

    await vehicle.save();
    res.status(201).json({ message: "Vehicle created successfully", vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//getAllVehicle
export const getVehicles = async (req, res) => {
  try {
    const getAllvehicles = await Vehicle.find();
    res.status(200).json({ data: getAllvehicles });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Find existing vehicle
    const existingVehicle = await Vehicle.findById(vehicleId);
    if (!existingVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    let updatedImage = existingVehicle.images || "";

    if (req.file) {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "vehicle_images",
      });
      updatedImage = uploadedImage.secure_url;
    }

    //  Create updated data object
    const updatedData = {
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      pricePerDay: req.body.pricePerDay,
      location: req.body.location,
      availability: req.body.availability,
      images: updatedImage, // Cloudinary image
      description: req.body.description,
      ratings: req.body.ratings,
      seats: req.body.seats,
      fuelType: req.body.fuelType,
      transmission: req.body.transmission,
    };

    // ✅ Updating the vehicle details
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      updatedData,
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Vehicle updated successfully", data: updatedVehicle });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

//delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Find vehicle by ID
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Delete image from Cloudinary (If exists)
    if (vehicle.images) {
      const imagePublicId = vehicle.images.split("/").pop().split(".")[0]; // Extract public_id from URL
      await cloudinary.uploader.destroy(`vehicle_images/${imagePublicId}`);
    }

    // Delete vehicle from DB
    await Vehicle.findByIdAndDelete(vehicleId);

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
