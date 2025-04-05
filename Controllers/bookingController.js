import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import moment from "moment-timezone";
import Payment from "../Models/Payment.schema.js";

export const createBooking = async (req, res) => {
  try {
    const { vehicle, startDate, startTime, endDate, endTime } = req.body;

    //Validate Vehicle Exists
    const vehicleData = await Vehicle.findById(vehicle);
    if (!vehicleData) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Parse Dates with Timezone (Asia/Kolkata)
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

    // Validate Date/Time Inputs
    if (!startDateTime.isValid() || !endDateTime.isValid()) {
      return res.status(400).json({ message: "Invalid date/time format" });
    }

    if (endDateTime.isSameOrBefore(startDateTime)) {
      return res.status(400).json({
        message: "End date/time must be after start date/time",
      });
    }

    //  Check for Overlapping Bookings with Status
    const overlappingBooking = await Booking.findOne({
      vehicle: vehicle,
      status: "confirmed", // Only check CONFIRMED bookings
      $or: [
        //  New booking starts during existing booking
        {
          startDate: { $lte: endDateTime.format("YYYY-MM-DD") },
          endDate: { $gte: startDateTime.format("YYYY-MM-DD") },
        },
        //  New booking ends during existing booking
        {
          startDate: { $lte: endDateTime.format("YYYY-MM-DD") },
          endDate: { $gte: startDateTime.format("YYYY-MM-DD") },
        },
        //  New booking completely contains existing booking
        {
          startDate: { $gte: startDateTime.format("YYYY-MM-DD") },
          endDate: { $lte: endDateTime.format("YYYY-MM-DD") },
        },
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: "This vehicle is already booked for the selected dates.",
        conflict: {
          existingStart: overlappingBooking.startDate,
          existingEnd: overlappingBooking.endDate,
          status: overlappingBooking.status,
        },
      });
    }
    //  Calculate Pricing
    const durationHours = endDateTime.diff(startDateTime, "hours", true);
    const totalDays = Math.ceil(durationHours / 24);
    const totalPrice = totalDays * vehicleData.pricePerDay;

    //  Create New Booking
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

//get myBooking By user Id
export const getUserBookingsWithPayments = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Step 1: Get all bookings for the user (plain object with .lean())
    const bookings = await Booking.find({ user: userId })
      .populate("vehicle")
      .populate("user")
      .lean();

    // Step 2: Get all payment records for those bookings
    const bookingIds = bookings.map((booking) => booking._id);
    const payments = await Payment.find({
      booking: { $in: bookingIds },
    }).lean();

    // Step 3: Merge each booking with its payment
    const bookingsWithPayments = bookings.map((booking) => {
      const payment = payments.find(
        (pay) => pay.booking.toString() === booking._id.toString()
      );
      return {
        ...booking, // booking is already plain object
        payment: payment || null,
      };
    });

    res.status(200).json({ bookings: bookingsWithPayments });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
//update booking
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params; // Booking ID from URL params
    const { status } = req.body; // New status from request body

    // Valid status check
    if (!["pending", "confirmed", "cancelled", "remove"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (status === "remove") {
      const deletedBooking = await Booking.findByIdAndDelete(id);
      if (!deletedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.status(200).json({ message: "Booking removed successfully" });
    }

    if (status === "remove") {
      const deletedBooking = await Payment.findByIdAndDelete(id);
      if (!deletedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.status(200).json({ message: "Booking removed successfully" });
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

//get booked dates
export const getBookedDates = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    console.log("Vehicle ID :", vehicleId);

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }

    // const bookings = await Booking.find({ vehicle: vehicleId, status: "confirmed || pending"  });
    const bookings = await Booking.find({
      vehicle: vehicleId,
      status: { $in: ["confirmed"] },
    });
    console.log("Bookings found:", bookings);

    if (bookings.length === 0) {
      return res.status(200).json({ bookedDates: [] });
    }

    const bookedDates = new Set(); // Use Set to store unique dates

    bookings.forEach((booking) => {
      let currentDate = new Date(booking.startDate); // Get start date
      const endDate = new Date(booking.endDate); // Get end date

      console.log(
        `Processing booking from ${currentDate.toISOString()} to ${endDate.toISOString()}`
      );

      while (currentDate <= endDate) {
        const formattedDate = currentDate.toISOString().split("T")[0]; // Extract YYYY-MM-DD
        bookedDates.add(formattedDate);
        currentDate.setDate(currentDate.getDate() + 1); // Move to next day
      }
    });

    console.log("Final booked dates:", Array.from(bookedDates)); // Debugging Output

    res.status(200).json({ bookedDates: Array.from(bookedDates) });
  } catch (error) {
    console.error("Error fetching booked dates:", error);
    res.status(500).json({ message: "Error fetching booked dates", error });
  }
};
