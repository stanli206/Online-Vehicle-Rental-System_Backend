import jwt from "jsonwebtoken";
import User from "../Models/User.schema.js";
import dotenv from "dotenv";

dotenv.config();

// Like authMiddleware, but never blocks the request.
// If a valid token is present, attaches req.user. Otherwise continues anonymously.
export const optionalAuth = async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id).select("-password");
  } catch (error) {
    // Invalid/expired token: just treat as anonymous.
    console.log("optionalAuth: ignoring invalid token -", error.message);
  }
  next();
};
