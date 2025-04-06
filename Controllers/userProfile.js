import User from "../Models/User.schema.js";

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
