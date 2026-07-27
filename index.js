import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./Database/Config.js";
import logger from "./utils/logger.js";
// import "./Controllers/reminderCron.js";

dotenv.config();

const port = process.env.PORT;

// Connect to the database, then start the server.
connectDB();

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
