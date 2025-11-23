// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// export const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // MUST be true for Gmail port 465
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD, // Gmail App Password
  },
  connectionTimeout: 20000,
  socketTimeout: 20000,
});
