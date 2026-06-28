import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import moment from "moment-timezone";
import Payment from "../Models/Payment.schema.js";
import * as bookingService from "../services/bookingService.js";

export const createBooking = async (req, res) => {
  try {
    const { vehicle, startDate, startTime, endDate, endTime } = req.body;

    // Business logic lives in the service layer; controller handles HTTP only.
    const {
      newBooking,
      vehicleData,
      startDateTime,
      endDateTime,
      totalDays,
      totalPrice,
    } = await bookingService.createBooking(req.user._id, {
      vehicle,
      startDate,
      startTime,
      endDate,
      endTime,
    });

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
    // Client-facing validation errors carry a status + payload from the service.
    if (error.status) {
      return res.status(error.status).json(error.payload);
    }
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

    //  Get all bookings for the user 
    const bookings = await Booking.find({ user: userId })
      .populate("vehicle")
      .populate("user")
      .lean();

    //  Get all payment records for those bookings
    const bookingIds = bookings.map((booking) => booking._id);
    const payments = await Payment.find({
      booking: { $in: bookingIds },
    }).lean();

    //  Merge each booking with its payment
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
    const { id } = req.params;
    const { status } = req.body; 
    console.log(status);

    // Valid status check
    if (
      !["pending", "confirmed", "cancelled", "remove", "cancel"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (status === "cancel") {
      const deletedBooking = await Booking.findByIdAndDelete(id);
      console.log("id not fetched");

      if (!deletedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.status(200).json({ message: "Booking removed successfully" });
    }

    if (status === "remove") {
      // const deletedBooking0 = await Payment.findByIdAndDelete(id);
      const deletedBooking1 = await Booking.findByIdAndDelete(id);
      console.log("id 2 not fetched" + id);

      if (!deletedBooking1) {
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
        currentDate.setDate(currentDate.getDate() + 1); 
      }
    });

    console.log("Final booked dates:", Array.from(bookedDates)); // Debugging Output

    res.status(200).json({ bookedDates: Array.from(bookedDates) });
  } catch (error) {
    console.error("Error fetching booked dates:", error);
    res.status(500).json({ message: "Error fetching booked dates", error });
  }
};
