import Stripe from "stripe";
import dotenv from "dotenv";
import Payment from "../Models/Payment.schema.js";
import Booking from "../Models/Booking.schema.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    console.log(bookingId);
console.log(paymentMethod);
// console.log(booking);

    // 1. Find the booking
    const booking = await Booking.findById(bookingId).populate("vehicle");
    if (!booking) return res.status(404).json({ message: "Booking not found" });


    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${booking.vehicle.make} ${booking.vehicle.model}` },
          unit_amount: Math.round(booking.totalPrice * 100),
        },
        quantity: 1,
      }],
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

    // 3. Update booking status to 'confirmed'
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "confirmed";
    await booking.save();

    res.json({ message: "Payment and booking updated successfully!" });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};
