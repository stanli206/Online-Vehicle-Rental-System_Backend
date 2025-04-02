import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import moment from "moment-timezone";

export const createBooking = async (req, res) => {
  try {
    const { vehicle, startDate, startTime, endDate, endTime } = req.body;

    // 1. Validate Vehicle Exists
    const vehicleData = await Vehicle.findById(vehicle);
    if (!vehicleData) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // 2. Parse Dates with Timezone (Asia/Kolkata)
    const timeZone = "Asia/Kolkata";
    const startDateTime = moment.tz(
      `${startDate} ${startTime}`,
      "YYYY-MM-DD HH:mm",
      timeZone
    );
    const endDateTime = moment.tz(
      `${endDate} ${endTime}`,
      "YYYY-MM-DD HH:mm",
      timeZone
    );

    // 3. Validate Date/Time Inputs
    if (!startDateTime.isValid() || !endDateTime.isValid()) {
      return res.status(400).json({ message: "Invalid date/time format" });
    }

    if (endDateTime.isSameOrBefore(startDateTime)) {
      return res.status(400).json({
        message: "End date/time must be after start date/time",
      });
    }

    // 4. Check for Overlapping Bookings (CORRECTED VERSION)
    const overlappingBooking = await Booking.findOne({
      vehicle: vehicle,
      $nor: [
        { endDateTime: { $lte: startDateTime.toDate() } }, // Existing booking ends before new one starts
        { startDateTime: { $gte: endDateTime.toDate() } }, // Existing booking starts after new one ends
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: "Vehicle already booked for this time period",
        conflict: {
          existingStart: overlappingBooking.startDateTime,
          existingEnd: overlappingBooking.endDateTime,
        },
      });
    }

    // 5. Calculate Pricing
    const durationHours = endDateTime.diff(startDateTime, "hours", true);
    const totalDays = Math.ceil(durationHours / 24);
    const totalPrice = totalDays * vehicleData.pricePerDay;

    // 6. Create New Booking
    const newBooking = new Booking({
      user: req.user._id,
      vehicle: vehicle,
      startDateTime: startDateTime.toDate(), // Store as Date in UTC
      endDateTime: endDateTime.toDate(), // Store as Date in UTC
      startDate: startDateTime.format("YYYY-MM-DD"), // For easy querying
      endDate: endDateTime.format("YYYY-MM-DD"),
      startTime: startDateTime.format("HH:mm"),
      endTime: endDateTime.format("HH:mm"),
      totalPrice,
      status: "pending",
    });

    await newBooking.save();

    // 7. Return Success Response
    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        id: newBooking._id,
        vehicle: vehicleData.name,
        start: startDateTime.format("DD MMM YYYY, hh:mm A"),
        end: endDateTime.format("DD MMM YYYY, hh:mm A"),
        totalDays,
        totalPrice,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({
      message: "Server error while creating booking",
      error: error.message,
    });
  }
};

//get myBooking
export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user").populate("vehicle");
    res.status(201).json({ bookings });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

//update booking
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params; // Booking ID from URL params
    const { status } = req.body; // New status from request body

    // Valid status check
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Booking find & update
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true } //
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res
      .status(200)
      .json({ message: `Booking ${status} successfully`, updatedBooking });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
