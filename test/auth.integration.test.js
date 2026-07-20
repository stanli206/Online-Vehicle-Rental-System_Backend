// Integration test — spins up an in-memory MongoDB so the real Atlas DB is untouched.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("auth flow (register → login)", () => {
  const creds = {
    name: "Test User",
    email: "test@example.com",
    password: "secret123",
    phone: "9999999999",
  };

  it("registers a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(200);
  });

  it("logs in and sets httpOnly cookies (token NOT in body)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: creds.email, password: creds.password });

    expect(res.status).toBe(200);
    const cookies = (res.headers["set-cookie"] || []).join(";");
    expect(cookies).toContain("accessToken");
    expect(cookies).toContain("refreshToken");
    expect(cookies).toContain("HttpOnly");
    expect(res.body.token).toBeUndefined(); // secrets not exposed to JS
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: creds.email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });
});
