import cloudinary from "../cloudinary/cloudinary.config.js";
import Vehicle from "../Models/Vehicle.schema.js";

//create vehicle | Admin only
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

//getAllVehicle
export const getVehicles = async (req, res) => {
  try {
    const getAllvehicles = await Vehicle.find();
    res.status(200).json({ data: getAllvehicles });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


//update vehicle
export const updateVehicle = async (req, res) => {  
  try {
    const vehicleId = req.params.id;

    // Find existing vehicle
    const existingVehicle = await Vehicle.findById(vehicleId);
    if (!existingVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    let updatedImage = existingVehicle.images; 

    // Check if new image is uploaded
    if (req.file) { 
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "vehicle_images",
      });
      updatedImage = uploadedImage.secure_url; 
    }

    //Updating the vehicle details
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { make, model, year, pricePerDay, location, availability, images: updatedImage, description, ratings },
      { new: true } 
    );

    res.status(200).json({ message: "Vehicle updated successfully", data: updatedVehicle }); 
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// export const updateVehicle = async (req, res) => {
//   try {
//     const vehicleId = req.params.id;
//     const { make, model, year, pricePerDay, location,availability,images,description,ratings } = req.body;

//     const updateVehicle = await Vehicle.findByIdAndUpdate(
//       vehicleId,
//       { make, model, year, pricePerDay, location,availability,images,description,ratings },
//       { new: true }
//     );

//     if (!updateVehicle) {
//       return res.status(404).json({ message: "Product not found" });
//     }
//     res
//       .status(200)
//       .json({ message: "Product updated successfully", data: updateVehicle });
//   } catch (error) {}
// };