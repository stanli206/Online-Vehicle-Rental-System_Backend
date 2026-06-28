import moment from "moment-timezone";
import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import { TIMEZONE, BOOKING_STATUS } from "../constants/index.js";

// Small helper to throw HTTP-aware errors the controller can map to responses.
function httpError(status, payload) {
  const err = new Error(payload.message || "Error");
  err.status = status;
  err.payload = payload;
  return err;
}

/**
 * Core booking business logic, extracted from the controller.
 * Validates the vehicle + dates, checks for overlaps, computes price, and
 * persists a pending booking. Throws httpError(...) for client-facing failures.
 */
export async function createBooking(userId, { vehicle, startDate, startTime, endDate, endTime }) {
  // 1. Validate vehicle exists
  const vehicleData = await Vehicle.findById(vehicle);
  if (!vehicleData) {
    throw httpError(404, { message: "Vehicle not found" });
  }

  // 2. Parse dates in the app timezone
  const startDateTime = moment.tz(`${startDate} ${startTime}`, "YYYY-MM-DD HH:mm", TIMEZONE);
  const endDateTime = moment.tz(`${endDate} ${endTime}`, "YYYY-MM-DD HH:mm", TIMEZONE);

  // 3. Validate date/time inputs
  if (!startDateTime.isValid() || !endDateTime.isValid()) {
    throw httpError(400, { message: "Invalid date/time format" });
  }
  if (endDateTime.isSameOrBefore(startDateTime)) {
    throw httpError(400, { message: "End date/time must be after start date/time" });
  }

  // 4. Check for overlapping confirmed bookings
  const overlappingBooking = await Booking.findOne({
    vehicle,
    status: BOOKING_STATUS.CONFIRMED,
    startDate: { $lte: endDateTime.format("YYYY-MM-DD") },
    endDate: { $gte: startDateTime.format("YYYY-MM-DD") },
  });
  if (overlappingBooking) {
    throw httpError(400, {
      message: "This vehicle is already booked for the selected dates.",
      conflict: {
        existingStart: overlappingBooking.startDate,
        existingEnd: overlappingBooking.endDate,
        status: overlappingBooking.status,
      },
    });
  }

  // 5. Pricing
  const durationHours = endDateTime.diff(startDateTime, "hours", true);
  const totalDays = Math.ceil(durationHours / 24);
  const totalPrice = totalDays * vehicleData.pricePerDay;

  // 6. Persist
  const newBooking = new Booking({
    user: userId,
    vehicle,
    startDate: startDateTime.format("YYYY-MM-DD"),
    endDate: endDateTime.format("YYYY-MM-DD"),
    startTime: startDateTime.format("HH:mm"),
    endTime: endDateTime.format("HH:mm"),
    totalPrice,
    status: BOOKING_STATUS.PENDING,
  });
  await newBooking.save();

  return { newBooking, vehicleData, startDateTime, endDateTime, totalDays, totalPrice };
}
