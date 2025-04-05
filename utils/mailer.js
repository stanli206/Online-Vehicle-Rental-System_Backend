import { transporter } from "../Config/emailConfig.js";
import { convert } from "html-to-text";

const sendEmail = async (to, subject, html) => {
  try {
    // Create plain text version from HTML
    const textVersion = convert(html, {
      wordwrap: 130,
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to,
      subject,
      text: textVersion, // Plain text fallback
      html,
      //   headers: {
      //     "Content-Type": "text/html; charset=utf-8", // Explicitly set content type
      //   },
    };

    await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export default sendEmail;
///////////////////////////////////////////////////////////////////////////////////////////
// import { transporter } from "../Config/emailConfig.js";

// const sendEmail = async (to, subject, text, html) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL,
//       to,
//       subject,
//       text,
//       html,
//     };
//     await transporter.sendMail(mailOptions);
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.log("error sending email: ", error.message);
//   }
// };

// export default sendEmail;
