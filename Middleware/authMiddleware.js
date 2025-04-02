import jwt from "jsonwebtoken";
import User from "../Models/User.schema.js";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token Missing!" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id).select("-password");
    next();
  } catch (error) {
    res.status(500).json({ message: "Please login & try again!" });
    console.log({ message: error.message });
  }
};
