import Booking from "../Models/Booking.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";
import moment from "moment-timezone";

// export const createBooking = async (req, res) => {
//   try {
//     const { vehicle, startDate, startTime, endDate, endTime } = req.body;
//     console.log("vehicle Id :" + vehicle);
//     console.log("start date :" + startDate);
//     console.log("end date :" + endDate);
//     console.log("start time :" + startTime);
//     console.log("end time :" + endTime);

//     //  Check if vehicle exists
//     const vehicleId = await Vehicle.findById(vehicle);
//     if (!vehicleId) {
//       return res.status(404).json({ message: "Vehicle not found" });
//     }
//     console.log(vehicleId);

//     // Validate startDate and endDate
//     if (
//       !startDate ||
//       !endDate ||
//       isNaN(new Date(startDate)) ||
//       isNaN(new Date(endDate))
//     ) {
//       return res.status(400).json({ message: "Invalid startDate or endDate" });
//     }

//     if (new Date(endDate) <= new Date(startDate)) {
//       return res
//         .status(400)
//         .json({ message: "End date must be after start date" });
//     }

//     //Check if vehicle is already booked for the selected dates
//     const existingBooking = await Booking.findOne({
//       vehicle: vehicle,
//       $or: [
//         {
//           startDate: { $lte: new Date(endDate) },
//           endDate: { $gte: new Date(startDate) },
//         },
//       ],
//     });

//     if (existingBooking) {
//       return res.status(400).json({
//         message: "Vehicle is already booked for the selected dates.",
//         booked: true,
//       });
//     }

//     // Convert startDate and endDate properly
//     const formattedStartDate = moment(startDate, "YYYY/MM/DD").startOf("day");
//     const formattedEndDate = moment(endDate, "YYYY/MM/DD").endOf("day");
//     console.log("start date" + formattedStartDate);
//     console.log("end date" + formattedEndDate);

//     // totalDays Calculation
//     const totalDays = formattedEndDate.diff(formattedStartDate, "days") + 1;

//     //total Price Calculation
//     const totalPrice = totalDays * vehicleId.pricePerDay;

//     if (totalDays <= 0) {
//       return res.status(400).json({ message: "Invalid booking duration." });
//     }

//     // Ensure totalPrice is valid
//     if (isNaN(totalPrice) || totalPrice <= 0) {
//       return res.status(400).json({ message: "Total price calculation error" });
//     }

//     // Create Booking
//     const newBooking = new Booking({
//       user: req.user._id,
//       vehicle: vehicle,
//       startDate,
//       startTime,
//       endDate,
//       endTime,
//       totalPrice,
//     });

//     await newBooking.save();
//     res.status(201).json({
//       message: "Booking created successfully. Complete the payment to confirm.",
//       booked: false, //  Not already booked
//       newBooking,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error });
//   }
// };

export const createBooking = async (req, res) => {
  try {
    const { vehicle, startDate, startTime, endDate, endTime } = req.body;
    console.log(vehicle);
    console.log(startDate);
    console.log(endDate);

    // Check if vehicle exists
    const vehicleId = await Vehicle.findById(vehicle);
    if (!vehicleId) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Convert startDate and endDate to proper timezone (IST in this case)
    const formattedStartDate = moment(startDate)
      .tz("Asia/Kolkata", true)
      .startOf("day");
    const formattedEndDate = moment(endDate)
      .tz("Asia/Kolkata", true)
      .endOf("day");

    // Convert startTime and endTime to correct timezone (IST)
    const formattedStartTime = moment(startTime).tz("Asia/Kolkata", true);
    const formattedEndTime = moment(endTime).tz("Asia/Kolkata", true);

    console.log("Start Date:", formattedStartDate);
    console.log("End Date:", formattedEndDate);
    console.log("Start Time:", formattedStartTime);
    console.log("End Time:", formattedEndTime);

    // Validate startDate and endDate
    if (
      !startDate ||
      !endDate ||
      isNaN(new Date(startDate)) ||
      isNaN(new Date(endDate))
    ) {
      return res.status(400).json({ message: "Invalid startDate or endDate" });
    }

    if (formattedEndDate <= formattedStartDate) {
      return res
        .status(400)
        .json({ message: "End date must be after start date" });
    }

    // Check if the vehicle is already booked for the selected dates
    const existingBooking = await Booking.findOne({
      vehicle: vehicle,
      $or: [
        {
          startDate: { $lte: formattedEndDate },
          endDate: { $gte: formattedStartDate },
        },
      ],
    });

    if (existingBooking) {
      return res
        .status(400)
        .json({ message: "Vehicle is already booked for the selected dates." });
    }

    // Calculate totalDays and totalPrice
    const totalDays = formattedEndDate.diff(formattedStartDate, "days") + 1;
    const totalPrice = totalDays * vehicleId.pricePerDay;

    if (totalDays <= 0) {
      return res.status(400).json({ message: "Invalid booking duration." });
    }

    if (isNaN(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({ message: "Total price calculation error" });
    }

    // Create the booking
    const newBooking = new Booking({
      user: req.user._id,
      vehicle: vehicle,
      startDate: formattedStartDate,
      startTime: formattedStartTime,
      endDate: formattedEndDate,
      endTime: formattedEndTime,
      totalPrice,
    });

    await newBooking.save();
    res.status(201).json({
      message: "Booking created successfully. Complete the payment to confirm.",
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
