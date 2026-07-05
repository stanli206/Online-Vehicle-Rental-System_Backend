import User from "../Models/User.schema.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import cloudinary from "../Config/cloudinary.config.js";
import {
  setAuthCookies,
  setAccessCookie,
  clearAuthCookies,
  verifyRefreshToken,
  REFRESH_COOKIE,
} from "../utils/token.js";

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

    // Set httpOnly access + refresh cookies (token is NOT exposed to JS).
    setAuthCookies(res, user);

    res.status(200).json({
      message: "Login successful",
      role: user.role,
      _id: user._id,
      name: user.name,
    });
  } catch {
    res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
  }
};

// POST /api/auth/refresh
// Uses the refresh cookie to issue a new short-lived access cookie.
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "User no longer exists" });
    }

    setAccessCookie(res, user);
    res.status(200).json({ message: "Token refreshed" });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// POST /api/auth/logout
// Clears the auth cookies.
export const logoutUser = async (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({ message: "Logged out" });
};
