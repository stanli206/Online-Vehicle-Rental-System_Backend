import Stripe from "stripe";
import dotenv from "dotenv";
import Payment from "../Models/Payment.schema.js";
import Booking from "../Models/Booking.schema.js";
import User from "../Models/User.schema.js";
import sendEmail from "../utils/mailer.js";
import moment from "moment-timezone"; // Updated import

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    console.log("maeke model" + bookingId);
    console.log(paymentMethod);
    // console.log(booking);

    // 1. Find the booking
    const booking = await Booking.findById(bookingId).populate("vehicle");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.vehicle.make} ${booking.vehicle.model} ${booking._id}`,
            },
            unit_amount: Math.round(booking.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}&userId=${req.user._id}`,
      cancel_url: "http://localhost:5173/payment-failed",
    });

    // 3. Save payment as "pending"
    await new Payment({
      user: req.user._id,
      booking: bookingId,
      amount: booking.totalPrice,
      paymentMethod,
      status: "pending",
      transactionId: session.id, // Store Stripe session ID
    }).save();

    // 4. Return Stripe checkout URL
    res.json({ url: session.url });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { sessionId, bookingId, userId } = req.body;

    // 1. Check payment exists
    const payment = await Payment.findOne({ transactionId: sessionId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // 2. Update payment status to 'completed'
    payment.status = "completed";
    await payment.save();

    // 3. Get booking with populated vehicle and user details
    const booking = await Booking.findById(bookingId)
      .populate("vehicle")
      .populate("user", "name email phone"); // Add fields you need

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 4. Get user details
    const user = await User.findById(userId).select("name email phone"); // Select specific fields

    if (!user) return res.status(404).json({ message: "User not found" });

    // 5. Update booking status to 'confirmed'
    booking.status = "confirmed";
    await booking.save();

    // 6. Prepare and send confirmation email
    try {
      const emailSubject = `Booking Confirmation #${booking._id
        .toString()
        .slice(-6)}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Booking Confirmed!</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear ${user.name},</p>
            <p>Your booking has been confirmed. Here are your details:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0;">${booking.vehicle.make} ${
        booking.vehicle.model
      }</h3>
              <p><strong>Booking ID:</strong> ${booking._id}</p>
              <p><strong>Pickup Date:</strong> ${moment(booking.startDate)
                .tz("Asia/Kolkata")
                .format("MMMM Do YYYY")} at ${booking.startTime}</p>
              <p><strong>Return Date:</strong> ${moment(booking.endDate)
                .tz("Asia/Kolkata")
                .format("MMMM Do YYYY")} at ${booking.endTime}</p>
              <p><strong>Total Price:</strong> $${booking.totalPrice}</p>
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you for choosing us!</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 10px; text-align: center;">
            <p>© ${new Date().getFullYear()} RentAuto</p>
          </div>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailHtml);
      console.log(`Confirmation email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError.message);
    }
    // Now you have access to:
    // - booking details (including vehicle info)
    // - user details
    console.log("Booking Details:", {
      bookingId: booking._id,
      vehicle: booking.vehicle,
      dates: {
        start: booking.startDate,
        end: booking.endDate,
      },
      totalPrice: booking.totalPrice,
    });

    console.log("User Details:", {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });

    res.json({
      message: "Payment and booking updated successfully!",
      bookingDetails: {
        bookingId: booking._id,
        vehicle: booking.vehicle,
        dates: {
          start: booking.startDate,
          end: booking.endDate,
        },
        totalPrice: booking.totalPrice,
      },
      userDetails: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updatePaymentStatus = async (req, res) => {
//   try {
//     const { sessionId, bookingId, userId } = req.body;

//     // 1. Check payment exists
//     const payment = await Payment.findOne({ transactionId: sessionId });
//     if (!payment) return res.status(404).json({ message: "Payment not found" });

//     // 2. Update payment status to 'completed'
//     payment.status = "completed";
//     await payment.save();

//     // 3. Update booking status to 'confirmed'
//     const booking = await Booking.findById(bookingId);
//     if (!booking) return res.status(404).json({ message: "Booking not found" });

//     booking.status = "confirmed";
//     await booking.save();

//     res.json({ message: "Payment and booking updated successfully!" });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ message: "Server error" });
//   }
// };
