import jwt from "jsonwebtoken";
import User from "../Models/User.schema.js";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  // Prefer the httpOnly access cookie; fall back to a Bearer header for
  // backward compatibility / non-browser API clients.
  const headerToken = req.headers.authorization?.split(" ")[1];
  // Ignore junk header values like "Bearer undefined"/"null" (legacy frontend).
  const cleanHeaderToken =
    headerToken && headerToken !== "undefined" && headerToken !== "null"
      ? headerToken
      : null;
  const token = req.cookies?.accessToken || cleanHeaderToken;

  if (!token) return res.status(401).json({ message: "Token Missing!" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id).select("-password");
    next();
  } catch (error) {
    // 401 (not 500) so the frontend can detect expiry and refresh the token.
    res.status(401).json({ message: "Please login & try again!" });
    console.log({ message: error.message });
  }
};
