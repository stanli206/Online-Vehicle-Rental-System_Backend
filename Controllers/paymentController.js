import Stripe from "stripe";
import dotenv from "dotenv";
import Payment from "../Models/Payment.schema.js";
import Booking from "../Models/Booking.schema.js";
import User from "../Models/User.schema.js";
import sendEmail from "../utils/mailer.js";
import moment from "moment-timezone";
import Vehicle from "../Models/Vehicle.schema.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    // 1. Get booking details
    const booking = await Booking.findById(bookingId).populate("vehicle");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 2. Save initial payment with status = pending
    const savedPayment = await new Payment({
      user: req.user._id,
      booking: bookingId,
      amount: booking.totalPrice,
      paymentMethod,
      status: "pending",
      transactionId: "", // will be updated below
    }).save();

    // 3. Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.vehicle.make} ${booking.vehicle.model}`,
            },
            unit_amount: Math.round(booking.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://onlinerentauto.netlify.app/payment-success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}&userId=${req.user._id}`,
      cancel_url: "https://onlinerentauto.netlify.app/payment-failed", 
    });

    // 4. Update payment with Stripe session ID as transactionId
    savedPayment.transactionId = session.id;
    await savedPayment.save();

    // 5. Send Stripe URL to frontend
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

//invoice
export const getInvoiceDetailsByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log("Booking ID is " + bookingId);

    const payment = await Payment.findOne({ booking: bookingId })
      .populate({
        path: "booking",
        populate: { path: "vehicle" },
      })
      .populate("user");

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Payment not found for this booking" });
    }

    const invoice = {
      invoiceId: payment._id,
      user: {
        name: payment.user.name,
        email: payment.user.email,
        phone: payment.user.phone,
      },
      vehicle: {
        vehicle: payment.booking.vehicle._id,
        brand: payment.booking.vehicle.brand,
        pricePerDay: payment.booking.vehicle.pricePerDay,
      },
      booking: {
        startDate: payment.booking.startDate,
        startTime: payment.booking.startTime,
        endDate: payment.booking.endDate,
        endTime: payment.booking.endTime,
        totalPrice: payment.booking.totalPrice,
      },
      payment: {
        amount: payment.amount,
        method: payment.paymentMethod,
        transactionId: payment.transactionId,
        status: payment.status,
        paidAt: payment.createdAt,
      },
    };

    res.status(200).json(invoice);
  } catch (err) {
    console.error("Invoice fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
