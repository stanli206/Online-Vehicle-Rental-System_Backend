import Review from "../Models/Review.schema.js";
import Vehicle from "../Models/Vehicle.schema.js";

//Add a review
export const addReview = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id; // From authMiddleware
    console.log(vehicleId);
    console.log(rating);
    console.log(comment);
    console.log(userId);

    // Check if vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    console.log(vehicle);

    // Create & save review
    const review = await Review.create({
      user: userId,
      vehicle: vehicleId,
      rating,
      comment,
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get all reviews for a vehicle
export const getReviewsByID = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    console.log(vehicleId);
    const reviews = await Review.find({ vehicle: vehicleId }).populate(
      "user",
      "name"
    );
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Delete a review (only owner can delete)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) return res.status(404).json({ message: "Review not found" });

    // Check if user is the owner of the review
    if (review.user.toString() !== req.user.id)
      return res
        .status(403)
        .json({ message: "Not authorized to delete this review" });

    await review.deleteOne();
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
