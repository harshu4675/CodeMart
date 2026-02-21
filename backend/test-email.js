const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: "Test Email from CodeMart",
  text: "If you receive this, email is working!",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log("❌ Error:", error);
  } else {
    console.log("✅ Email sent:", info.response);
  }
});
