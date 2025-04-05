import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: {
      type: String,
      unique: true,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    profilePicture: { type: String, default: "" },
    role: { type: String, enum: ["Admin", "User"], default: "User" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
