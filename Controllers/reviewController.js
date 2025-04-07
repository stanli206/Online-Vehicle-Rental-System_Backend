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

//Get all reviews for a vehicle http://localhost:5000/api/review/getAllReview
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
//
export const getAllReviews = async (req, res) => {
  try {
    const getAllReview = await Review.find();
    console.log(getAllReview);

    res.status(200).json({ data: getAllReview });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
//  Delete a review (only owner can delete)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) return res.status(404).json({ message: "Review not found" });

    

    await review.deleteOne();
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// calculate average rating ecah vehicle
export const getAverageRating = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Find all reviews for the given vehicle ID
    const reviews = await Review.find({ vehicle: vehicleId });

    if (reviews.length === 0) {
      return res.status(200).json({ averageRating: 0, totalReviews: 0 });
    }

    // Calculate the total rating sum
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);

    // Calculate the average rating
    const averageRating = totalRating / reviews.length;

    res.status(200).json({
      averageRating: averageRating.toFixed(1), // Rounded to 1 decimal place
      totalReviews: reviews.length, // Total number of reviews
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// getAll reviews

export const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ user: userId })
      .populate("vehicle", "name brand model image") // Populate vehicle details
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error });
  }
};
