import User from "../Models/User.schema.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cloudinary from "../cloudinary/cloudinary.config.js";

dotenv.config();

export const registerUser = async (req, res) => {
  try {
    // console.log("Request Body:", req.body); // 🔍 Debug Log
    // console.log("Request File:", req.file);
    const { name, email, password, phone, role } = req.body; //profilePicture
    const hashedPassword = await bcrypt.hash(password, 10);

    //profile_img upload to cloudinary
    let profilePicture = "";
    if (req.file) {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pictures",
      });
      profilePicture = uploadedImage.secure_url; // Store Cloudinary URL
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      profilePicture: req.file.path || req.file.secure_url || req.file.url || req.file.filename,
      role,
    });
    await newUser.save();
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log(user.name);

    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Invalid Password" });

    const token = jwt.sign(
      { _id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "User logged in successfully", token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
