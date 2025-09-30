import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
  logger: true,  // for logs
  debug: true,   // for debugging
});

// Verify transporter
transporter.verify()
  .then(() => console.log("Mail server ready ✅"))
  .catch(err => console.error("Mail server error ❌", err));

export default transporter;
