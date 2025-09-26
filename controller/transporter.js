import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Load .env

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
  logger: true,
  debug: true,
});

// Verify connection
transporter.verify()
  .then(() => console.log("Mail server ready"))
  .catch(console.error);

export default transporter; // ES module default export
