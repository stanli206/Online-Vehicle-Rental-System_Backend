import { transporter } from "../Config/emailConfig.js";
import { convert } from "html-to-text";

const sendEmail = async (to, subject, html) => {
  try {
    const textVersion = convert(html, { wordwrap: 130 });

    const mailOptions = {
      from: process.env.EMAIL,
      to,
      subject,
      text: textVersion,
      html,
    };

    // OPTIONAL: verify connection first
    await transporter.verify().catch(err => {
      console.error("SMTP verify failed:", err.message);
    });

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.accepted);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

export default sendEmail;
