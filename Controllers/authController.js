import User from "../Models/User.schema.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cloudinary from "../Config/cloudinary.config.js";

dotenv.config();
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePicture = "";
    if (req.file) {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pictures",
      });
      profilePicture = uploadedImage.secure_url;
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      profilePicture: profilePicture || undefined,
      role: role || undefined,
    });

    await newUser.save();
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `The ${duplicateField} is already registered. Please use a different ${duplicateField}.`,
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: errors.join(", ") });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found. Please register first." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect password. Please try again." });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      _id: user._id,
      name: user.name,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
  }
};
