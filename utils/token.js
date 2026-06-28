import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;

const ACCESS_TTL = "15m"; // short-lived access token
const REFRESH_TTL = "7d"; // long-lived refresh token

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

// Cookie options. In production (cross-site frontend/backend) we need
// SameSite=None + Secure; in local dev SameSite=Lax over http works.
const isProd = process.env.NODE_ENV === "production";
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true, // JS cannot read it -> protects against XSS token theft
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? "none" : "lax",
    maxAge: maxAgeMs,
  };
}

export function signAccessToken(user) {
  return jwt.sign(
    { _id: user._id, role: user.role, name: user.name },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ _id: user._id }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// Set both auth cookies on the response.
export function setAuthCookies(res, user) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), cookieOptions(15 * 60 * 1000));
  res.cookie(
    REFRESH_COOKIE,
    signRefreshToken(user),
    cookieOptions(7 * 24 * 60 * 60 * 1000)
  );
}

// Set only a fresh access cookie (used by the refresh endpoint).
export function setAccessCookie(res, user) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), cookieOptions(15 * 60 * 1000));
}

// Clear both cookies on logout.
export function clearAuthCookies(res) {
  const opts = { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" };
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
