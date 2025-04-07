import User from "../Models/User.schema.js";
import Payment from "../Models/Payment.schema.js";

//byID
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you're using auth middleware
    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//getAllusers
export const getAllUsers = async (req, res) => {
  try {
    const getAllusers = await User.find();
    res.status(200).json({ data: getAllusers });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

//updateprofile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedFields = {
      name: req.body.name,
      phone: req.body.phone,
      profilePicture: req.body.profilePicture,
    };

    // Optional: Prevent email/password change here (unless separate endpoint)
    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get all user booking and transaction history

export const getAllCompletedPaymentsWithBookingHistory = async (req, res) => {
  try {
    const completedPayments = await Payment.find({ status: "completed" })
      .populate("user", "name email phone role")
      .populate({
        path: "booking",
        populate: {
          path: "vehicle", // Populate vehicle inside booking
          model: "Vehicle",
        },
      });

    const modifiedPayments = completedPayments.map((payment) => {
      if (!payment.booking) {
        return {
          ...payment.toObject(),
          booking: {
            status: "ride cancelled from user",
            startDate: "-",
            endDate: "-",
            pickupLocation: "-",
            dropLocation: "-",
            vehicle: {
              make: "-",
              model: "-",
              year: "-",
              rentPerHour: "-",
            },
          },
        };
      }
      return payment;
    });

    res.status(200).json({
      success: true,
      message:
        "All completed payments with booking history (including cancelled) fetched successfully",
      data: modifiedPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//payment history getby userid
export const getPaymentsWithBookingHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const completedPayments = await Payment.find({
      status: "completed",
      user: userId,
    })
      .populate("user", "name email phone role")
      .populate({
        path: "booking",
        populate: {
          path: "vehicle", // Populate vehicle inside booking
          model: "Vehicle",
        },
      });

    const modifiedPayments = completedPayments.map((payment) => {
      if (!payment.booking) {
        return {
          ...payment.toObject(),
          booking: {
            status: "ride cancelled from user",
            startDate: "-",
            endDate: "-",
            pickupLocation: "-",
            dropLocation: "-",
            vehicle: {
              make: "-",
              model: "-",
              year: "-",
              rentPerHour: "-",
            },
          },
        };
      }
      return payment;
    });

    res.status(200).json({
      success: true,
      message: "Completed payments with booking history fetched for the user",
      data: modifiedPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
