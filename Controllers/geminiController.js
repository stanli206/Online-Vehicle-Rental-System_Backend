import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import moment from "moment-timezone";
import mongoose from "mongoose";
import Vehicle from "../Models/Vehicle.schema.js";
import Booking from "../Models/Booking.schema.js";

dotenv.config();

const TIMEZONE = "Asia/Kolkata";

const SYSTEM_PROMPT = `You are "RentGaadi Assistant", an agent for RentGaadi, an online
vehicle rental platform. Users browse vehicles, book them for dates, pay online (Stripe),
and leave reviews.

You have TOOLS to read live data and help users book:
- search_vehicles: find available vehicles by name/type/location/price/seats.
- check_availability: see which dates a vehicle is already booked.
- prepare_booking: validate dates and compute the price for a booking WITHOUT saving it.
- create_booking: actually create a PENDING booking (requires the user to be logged in).

STRICT BOOKING RULES (follow exactly):
1. To book, FIRST call prepare_booking and show the user a clear summary: vehicle, dates,
   number of days, and total price.
2. Then STOP and ask the user to confirm. WAIT for them to reply with an explicit
   confirmation (e.g. "yes", "confirm") in a NEW message.
3. ONLY after that explicit confirmation may you call create_booking. NEVER call
   create_booking in the same turn as prepare_booking, and never without confirmation.
4. If the user is not logged in, ask them to log in before booking.
5. After a booking is created it is PENDING. The app will automatically take the user
   to the Payment page to finish paying, so tell them they're being redirected there.
   You CANNOT take payments or move money yourself — never claim to.

General rules: be concise and warm. Base all facts on tool results — never invent
vehicles, prices, availability, or bookings. NEVER invent or guess a vehicle id (e.g.
do not make up "thar-123"). To book, just pass the vehicle's NAME (vehicleName, e.g.
"Mahindra Thar") to prepare_booking/create_booking — the system resolves it for you.
If a tool returns needChoice, ask the user which option they mean. Dates are YYYY-MM-DD,
times are 24h HH:mm. Prices are per day in INR (₹). Do not ask for or store passwords,
card numbers, or OTPs.`;

let genAI = null;
function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/* ----------------------------- Tool declarations ----------------------------- */

const toolDeclarations = [
  {
    name: "search_vehicles",
    description:
      "Search currently available vehicles. All filters are optional; omit what the user didn't specify.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description: "Match against make or model, e.g. 'Thar' or 'Mahindra'.",
        },
        location: { type: SchemaType.STRING },
        fuelType: {
          type: SchemaType.STRING,
          description: "One of: Petrol, Diesel, Electric",
        },
        transmission: {
          type: SchemaType.STRING,
          description: "One of: Manual, Automatic",
        },
        maxPricePerDay: { type: SchemaType.NUMBER },
        minSeats: { type: SchemaType.NUMBER },
      },
    },
  },
  {
    name: "check_availability",
    description:
      "List the dates a vehicle is already booked (confirmed) within an optional range.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        vehicleId: { type: SchemaType.STRING },
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
      },
      required: ["vehicleId"],
    },
  },
  {
    name: "prepare_booking",
    description:
      "Validate a booking and compute its total price WITHOUT saving. Use this before asking the user to confirm. Identify the vehicle by its name (e.g. 'Mahindra Thar') OR by an id returned from search_vehicles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        vehicleName: {
          type: SchemaType.STRING,
          description: "The vehicle's name, e.g. 'Mahindra Thar'. Preferred.",
        },
        vehicleId: {
          type: SchemaType.STRING,
          description: "A real id from search_vehicles. Never invent one.",
        },
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        startTime: { type: SchemaType.STRING, description: "24h HH:mm" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endTime: { type: SchemaType.STRING, description: "24h HH:mm" },
      },
      required: ["startDate", "startTime", "endDate", "endTime"],
    },
  },
  {
    name: "create_booking",
    description:
      "Create a PENDING booking. Only call after the user has seen a prepared summary AND explicitly confirmed in a later message. Requires the user to be logged in. Identify the vehicle by name OR by a real id from search_vehicles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        vehicleName: {
          type: SchemaType.STRING,
          description: "The vehicle's name, e.g. 'Mahindra Thar'. Preferred.",
        },
        vehicleId: {
          type: SchemaType.STRING,
          description: "A real id from search_vehicles. Never invent one.",
        },
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        startTime: { type: SchemaType.STRING, description: "24h HH:mm" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endTime: { type: SchemaType.STRING, description: "24h HH:mm" },
      },
      required: ["startDate", "startTime", "endDate", "endTime"],
    },
  },
];

/* ------------------------------ Tool helpers ------------------------------ */

function priceFor(vehicleData, startDate, startTime, endDate, endTime) {
  const start = moment.tz(`${startDate} ${startTime}`, "YYYY-MM-DD HH:mm", TIMEZONE);
  const end = moment.tz(`${endDate} ${endTime}`, "YYYY-MM-DD HH:mm", TIMEZONE);
  if (!start.isValid() || !end.isValid()) return { error: "Invalid date/time format." };
  if (end.isSameOrBefore(start)) return { error: "End must be after start." };
  const totalDays = Math.ceil(end.diff(start, "hours", true) / 24);
  return { start, end, totalDays, totalPrice: totalDays * vehicleData.pricePerDay };
}

async function findOverlap(vehicleId, startDate, endDate) {
  return Booking.findOne({
    vehicle: vehicleId,
    status: "confirmed",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
}

// Resolve a vehicle from a real id or a (possibly fuzzy) name.
// Returns { vehicle } | { error } | { needChoice, options }.
async function resolveVehicle({ vehicleId, vehicleName }) {
  // 1. A real, valid ObjectId wins.
  if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
    const v = await Vehicle.findById(vehicleId);
    if (v) return { vehicle: v };
  }

  // 2. Otherwise treat name (or a bad id string) as a search term.
  const raw = (vehicleName || vehicleId || "").toString();
  const clean = raw.replace(/[^a-zA-Z ]+/g, " ").replace(/\s+/g, " ").trim();
  const tokens = clean.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return { error: "No vehicle specified." };

  const ors = [];
  tokens.forEach((t) => {
    const rx = new RegExp(t, "i");
    ors.push({ make: rx }, { model: rx });
  });

  const candidates = await Vehicle.find({ availability: true, $or: ors }).limit(15);
  if (candidates.length === 0) {
    return { error: `No available vehicle matching "${raw}".` };
  }

  // Rank by how many search tokens appear in "make model".
  const lc = tokens.map((t) => t.toLowerCase());
  const scored = candidates.map((v) => {
    const hay = `${v.make} ${v.model}`.toLowerCase();
    const score = lc.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
    return { v, score };
  });
  const max = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === max);

  if (top.length === 1) return { vehicle: top[0].v };

  // Ambiguous: ask the user to choose.
  return {
    needChoice: true,
    options: top.map((s) => ({
      id: String(s.v._id),
      name: `${s.v.make} ${s.v.model} (${s.v.year})`,
      pricePerDay: s.v.pricePerDay,
    })),
  };
}

/* ------------------------------ Tool executor ------------------------------ */

async function executeTool(name, args = {}, user) {
  try {
    if (name === "search_vehicles") {
      const q = { availability: true };
      if (args.keyword) {
        const rx = new RegExp(args.keyword, "i");
        q.$or = [{ make: rx }, { model: rx }];
      }
      if (args.location) q.location = new RegExp(args.location, "i");
      if (args.fuelType) q.fuelType = args.fuelType;
      if (args.transmission) q.transmission = args.transmission;
      if (typeof args.maxPricePerDay === "number")
        q.pricePerDay = { $lte: args.maxPricePerDay };
      if (typeof args.minSeats === "number") q.seats = { $gte: args.minSeats };

      const vehicles = await Vehicle.find(q)
        .select("make model year pricePerDay location seats fuelType transmission ratings")
        .limit(25)
        .lean();
      return {
        count: vehicles.length,
        vehicles: vehicles.map((v) => ({ id: String(v._id), ...v, _id: undefined })),
      };
    }

    if (name === "check_availability") {
      const vehicle = await Vehicle.findById(args.vehicleId).lean();
      if (!vehicle) return { error: "Vehicle not found." };
      const bookings = await Booking.find({
        vehicle: args.vehicleId,
        status: "confirmed",
      }).lean();
      const booked = new Set();
      bookings.forEach((b) => {
        let d = new Date(b.startDate);
        const end = new Date(b.endDate);
        while (d <= end) {
          booked.add(d.toISOString().slice(0, 10));
          d.setDate(d.getDate() + 1);
        }
      });
      let dates = Array.from(booked).sort();
      if (args.startDate) dates = dates.filter((d) => d >= args.startDate);
      if (args.endDate) dates = dates.filter((d) => d <= args.endDate);
      return { vehicle: `${vehicle.make} ${vehicle.model}`, bookedDates: dates };
    }

    if (name === "prepare_booking" || name === "create_booking") {
      const resolved = await resolveVehicle(args);
      if (resolved.error) return { error: resolved.error };
      if (resolved.needChoice)
        return {
          needChoice: true,
          options: resolved.options,
          note: "Multiple matches. Ask the user which one they mean before continuing.",
        };
      const vehicle = resolved.vehicle;

      const calc = priceFor(
        vehicle,
        args.startDate,
        args.startTime,
        args.endDate,
        args.endTime
      );
      if (calc.error) return { error: calc.error };

      const overlap = await findOverlap(args.vehicleId, args.startDate, args.endDate);
      if (overlap)
        return {
          error: "Vehicle already booked for those dates.",
          conflict: { start: overlap.startDate, end: overlap.endDate },
        };

      const summary = {
        vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
        vehicleId: String(vehicle._id),
        startDate: args.startDate,
        startTime: args.startTime,
        endDate: args.endDate,
        endTime: args.endTime,
        totalDays: calc.totalDays,
        totalPrice: calc.totalPrice,
        currency: "INR",
      };

      if (name === "prepare_booking") {
        return { saved: false, ...summary, note: "Not saved yet. Ask the user to confirm." };
      }

      // create_booking
      if (!user) {
        return { error: "User must be logged in to create a booking." };
      }
      const booking = await Booking.create({
        user: user._id,
        vehicle: vehicle._id,
        startDate: args.startDate,
        endDate: args.endDate,
        startTime: args.startTime,
        endTime: args.endTime,
        totalPrice: calc.totalPrice,
        status: "pending",
      });

      // Payload shaped exactly like the Payment page expects via router state.
      const paymentBooking = {
        id: String(booking._id),
        start: calc.start.format("DD MMM YYYY, hh:mm A"),
        end: calc.end.format("DD MMM YYYY, hh:mm A"),
        totalDays: calc.totalDays,
        totalPrice: calc.totalPrice,
        status: "pending",
        vehicle: {
          _id: String(vehicle._id),
          make: vehicle.make,
          model: vehicle.model,
          pricePerDay: vehicle.pricePerDay,
          totalDays: calc.totalDays,
          images: vehicle.images,
          location: vehicle.location,
        },
      };

      return {
        saved: true,
        bookingId: String(booking._id),
        status: "pending",
        ...summary,
        payment: paymentBooking,
        next: "Booking created. Tell the user they are being taken to the Payment page to complete payment.",
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

/* -------------------------- Lightweight live context -------------------------- */

async function buildLiveContext(user) {
  const lines = [];
  const count = await Vehicle.countDocuments({ availability: true });
  lines.push(`Available vehicles in catalog: ${count}. Use search_vehicles for details.`);

  if (user) {
    const bookings = await Booking.find({ user: user._id })
      .populate("vehicle", "make model year")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    lines.push(`USER: ${user.name || "logged-in user"} (logged in).`);
    lines.push(`USER'S BOOKINGS (${bookings.length}):`);
    if (bookings.length === 0) lines.push("No bookings yet.");
    bookings.forEach((b) => {
      const v = b.vehicle;
      const vName = v ? `${v.make} ${v.model} (${v.year})` : "Vehicle";
      lines.push(
        `- ${vName} | ${b.startDate} ${b.startTime || ""} → ${b.endDate} ${b.endTime || ""} | ₹${b.totalPrice} | ${b.status}`
      );
    });
  } else {
    lines.push("USER: not logged in. They must log in before creating a booking.");
  }
  return lines.join("\n");
}

/* ------------------------------ Resilience ------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Transient server-side errors worth retrying quickly (busy / temporary).
function isTransient(err) {
  const m = (err && err.message) || "";
  return (
    m.includes("503") ||
    m.includes("Service Unavailable") ||
    m.includes("high demand") ||
    m.includes("overload") ||
    m.includes("500")
  );
}

// Quota / rate-limit errors. Retrying these fast just wastes the daily allowance.
function isQuota(err) {
  const m = (err && err.message) || "";
  return (
    m.includes("429") ||
    m.includes("Too Many Requests") ||
    m.includes("RESOURCE_EXHAUSTED") ||
    m.includes("quota")
  );
}

// Retry a single sendMessage ONLY on transient errors (never on quota errors).
async function sendWithRetry(chat, payload, tries = 2) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await chat.sendMessage(payload);
    } catch (e) {
      lastErr = e;
      if (!isTransient(e) || i === tries - 1) throw e;
      await sleep(700 * Math.pow(2, i)); // 700ms, 1400ms
    }
  }
  throw lastErr;
}

// Run one full conversation (incl. tool loop) on a given model. Returns reply text.
async function runConversation(modelName, systemInstruction, sdkHistory, message, user) {
  const model = getClient().getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools: [{ functionDeclarations: toolDeclarations }],
  });

  const chat = model.startChat({ history: sdkHistory });

  let result = await sendWithRetry(chat, message.trim());
  let calls = result.response.functionCalls();
  let guard = 0;
  let booking = null; // set when a booking is successfully created

  while (calls && calls.length > 0 && guard < 5) {
    const responses = [];
    for (const call of calls) {
      const output = await executeTool(call.name, call.args, user);
      if (call.name === "create_booking" && output && output.payment) {
        booking = output.payment;
      }
      responses.push({ functionResponse: { name: call.name, response: output } });
    }
    result = await sendWithRetry(chat, responses);
    calls = result.response.functionCalls();
    guard++;
  }

  return { reply: result.response.text(), booking };
}

/* --------------------------------- Handler --------------------------------- */

// POST /api/gemini/chat
// body: { message: string, history?: [{ role: "user"|"model", text: string }] }
export const chatWithGemini = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    const liveContext = await buildLiveContext(req.user);
    const systemInstruction = `${SYSTEM_PROMPT}\n\n--- CONTEXT ---\n${liveContext}\n--- Today: ${moment.tz(TIMEZONE).format("YYYY-MM-DD")} ---`;

    const sdkHistory = history
      .filter((m) => m && m.text && (m.role === "user" || m.role === "model"))
      .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

    // Try the primary model; if it stays overloaded, fall back to a lighter one.
    const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const candidates = [...new Set([primary, "gemini-2.5-flash-lite"])];

    let outcome = null;
    let lastErr = null;
    for (const modelName of candidates) {
      try {
        outcome = await runConversation(modelName, systemInstruction, sdkHistory, message, req.user);
        break;
      } catch (e) {
        lastErr = e;
        // Try the next model only on transient OR quota errors (separate quota buckets).
        if (!isTransient(e) && !isQuota(e)) throw e;
        console.log(`Model ${modelName} unavailable (${isQuota(e) ? "quota" : "busy"}), trying next...`);
      }
    }

    if (outcome === null) throw lastErr;
    // booking is non-null only when a pending booking was just created → frontend redirects to Payment.
    res.status(200).json({ reply: outcome.reply, booking: outcome.booking || null });
  } catch (error) {
    console.log("Gemini error:", error.message);
    if (isQuota(error)) {
      return res.status(429).json({
        message:
          "The assistant has reached today's free usage limit. Please try again later, or ask the site owner to raise the Gemini API quota.",
      });
    }
    const busy = isTransient(error);
    res.status(busy ? 503 : 500).json({
      message: busy
        ? "The assistant is very busy right now. Please try again in a few seconds."
        : "Assistant is unavailable right now. Please try again.",
    });
  }
};
