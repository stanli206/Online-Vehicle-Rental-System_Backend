// Integration test that needs the Express app but no database.
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("auth guard", () => {
  it("blocks a protected route without a token", async () => {
    const res = await request(app).get("/api/booking/myBooking");
    expect(res.status).toBe(401);
  });

  it("ignores a junk 'Bearer undefined' header (no 500)", async () => {
    const res = await request(app)
      .get("/api/booking/myBooking")
      .set("Authorization", "Bearer undefined");
    expect(res.status).toBe(401); // clean 401, not a crash
  });
});
