import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
// const MONGO_URI = process.env.MONGODB_URL;

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;