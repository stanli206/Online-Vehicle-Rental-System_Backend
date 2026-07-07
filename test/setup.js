// Global test setup: provide safe dummy env vars BEFORE any app module loads
// (e.g. Stripe throws if STRIPE_SECRET_KEY is missing at import time).

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_access_secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
