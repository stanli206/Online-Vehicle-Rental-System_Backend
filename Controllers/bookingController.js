import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import moment from "moment";

export const createBooking = async (req, res) => {
  try {
    const { vehicle, startDate, startTime, endDate, endTime } = req.body;

    //  Check if vehicle exists
    const vehicleId = await Vehicle.findById(vehicle);
    if (!vehicleId) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Validate startDate and endDate
    if (
      !startDate ||
      !endDate ||
      isNaN(new Date(startDate)) ||
      isNaN(new Date(endDate))
    ) {
      return res.status(400).json({ message: "Invalid startDate or endDate" });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date" });
    }

    //Check if vehicle is already booked for the selected dates
    const existingBooking = await Booking.findOne({
      vehicle: vehicle,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
    });

    if (existingBooking) {
      return res.status(400).json({
        message: "Vehicle is already booked for the selected dates.",
        booked: true,
      });
    }

    // Convert startDate and endDate properly
    const formattedStartDate = moment(startDate, "DD/MM/YYYY").startOf("day");
    const formattedEndDate = moment(endDate, "DD/MM/YYYY").endOf("day");

    // totalDays Calculation
    const totalDays = formattedEndDate.diff(formattedStartDate, "days") + 1;

    //total Price Calculation
    const totalPrice = totalDays * vehicleId.pricePerDay;

    if (totalDays <= 0) {
      return res.status(400).json({ message: "Invalid booking duration." });
    }

    // Ensure totalPrice is valid
    if (isNaN(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({ message: "Total price calculation error" });
    }

    // Create Booking
    const newBooking = new Booking({
      user: req.user._id,
      vehicle: vehicle,
      startDate,
      startTime,
      endDate,
      endTime,
      totalPrice,
    });

    await newBooking.save();
    res.status(201).json({
      message: "Booking created successfully. Complete the payment to confirm.",
      booked: false, //  Not already booked
      newBooking,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
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
