import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    // owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    pricePerDay: { type: Number, required: true },
    location: { type: String, required: true },
    availability: { type: Boolean, default: true },
    images: { type: String, default: "" },
    description: { type: String },
    ratings: { type: Number, default: 0 },
    seats: { type: Number, required: true },
    fuelType: {
      type: String,
      enum: ["Petrol", "Diesel", "Electric"],
      required: true,
    },
    transmission: {
      type: String,
      enum: ["Manual", "Automatic"],
      required: true,
    },
  },
  { timestamps: true }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;
