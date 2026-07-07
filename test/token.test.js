// Unit test — pure functions, no DB needed.
import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

describe("token utils", () => {
  const user = { _id: "507f1f77bcf86cd799439011", role: "user", name: "Stan" };

  it("signs and verifies an access token with the right claims", () => {
    const token = signAccessToken(user);
    const decoded = verifyAccessToken(token);
    expect(decoded._id).toBe(user._id);
    expect(decoded.role).toBe("user");
    expect(decoded.name).toBe("Stan");
  });

  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken(user);
    const decoded = verifyRefreshToken(token);
    expect(decoded._id).toBe(user._id);
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken(user);
    expect(() => verifyAccessToken(token + "tampered")).toThrow();
  });
});
