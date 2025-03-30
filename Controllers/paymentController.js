import Stripe from "stripe";
import dotenv from "dotenv";
import Payment from "../Models/Payment.schema.js";
import Booking from "../Models/Booking.schema.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, session_id } = req.body;

    if (session_id) {
      // 🔍 Log session ID
      console.log("🔍 Received session_id for verification:", session_id);

      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log("💳 Stripe Session Retrieved:", session);

      if (!session || session.payment_status !== "paid") {
        console.log("❌ Payment Not Completed:", session.payment_status);
        return res
          .status(400)
          .json({ message: "Payment failed or not completed" });
      }

      // 🔍 Check if payment exists in DB
      const payment = await Payment.findOne({ transactionId: session_id });
      console.log("💰 Payment Retrieved from DB:", payment);

      if (!payment) {
        console.log("❌ Payment not found in DB");
        return res.status(404).json({ message: "Payment not found" });
      }

      // ✅ Update Payment Status
      payment.status = "completed";
      payment.transactionId = session_id;
      await payment.save();
      console.log("✅ Payment Status Updated in DB");

      // ✅ Update Booking Status
      const updatedBooking = await Booking.findByIdAndUpdate(
        payment.booking,
        { status: "confirmed" },
        { new: true }
      );

      console.log("🚗 Booking Status Updated in DB:", updatedBooking);

      return res
        .status(200)
        .json({ message: "Payment successful & booking confirmed" });
    } else {
      console.log("🛍 Creating new payment for booking:", bookingId);

      const booking = await Booking.findById(bookingId).populate("vehicle");
      if (!booking) {
        console.log("❌ Booking not found");
        return res.status(404).json({ message: "Booking not found" });
      }

      const amount = Math.round(booking.totalPrice * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Booking for ${booking.vehicle.make} ${booking.vehicle.model}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: "http://localhost:5173/payment-failed",
      });

      console.log("🔗 Stripe Checkout Session Created:", session.url);

      // ✅ Store Payment in DB as "Pending"
      const payment = new Payment({
        user: req.user._id,
        booking: bookingId,
        amount: booking.totalPrice,
        paymentMethod,
        status: "pending",
        transactionId: null, // 🛑 Ensure it's null initially
      });

      await payment.save();
      console.log("💰 Payment Saved to DB with Pending Status");

      return res.json({ url: session.url });
    }
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


export const confirmPayment = async (req, res) => {
    try {
      const { session_id } = req.body;
      
      console.log("🔍 Received session_id:", session_id);
      if (!session_id) {
        console.log("❌ session_id not received in request!");
        return res.status(400).json({ message: "Missing session_id" });
      }
  
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log("💳 Stripe Session Retrieved:", session);
  
      if (!session || session.payment_status !== "paid") {
        console.log("❌ Payment Not Completed:", session.payment_status);
        return res.status(400).json({ message: "Payment failed or not completed" });
      }
  
      // 🔍 Check Payment in DB
      const payment = await Payment.findOne({ transactionId: session_id });
      console.log("💰 Payment Retrieved from DB:", payment);
  
      if (!payment) {
        console.log("❌ Payment not found in DB");
        return res.status(404).json({ message: "Payment not found" });
      }
  
      // ✅ Update Payment & Booking Status
      payment.status = "completed";
      payment.transactionId = session_id;
      await payment.save();
      console.log("✅ Payment Status Updated in DB");
  
      const updatedBooking = await Booking.findByIdAndUpdate(
        payment.booking,
        { status: "confirmed" },
        { new: true }
      );
  
      console.log("🚗 Booking Status Updated in DB:", updatedBooking);
  
      return res.status(200).json({ message: "Payment successful & booking confirmed" });
  
    } catch (error) {
      console.error("❌ Server Error:", error.message);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  