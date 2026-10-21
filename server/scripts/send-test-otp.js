require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

async function run() {
  const targetEmail = process.argv[2]&&process.argv[2].trim();
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
    let user = null;
    if (targetEmail && targetEmail !== "--latest") {
      user = await User.findOne({ email: targetEmail.toLowerCase() });
      if (!user) {
        const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await sendEmail({ email: targetEmail, subject: "MakaziFlow Test OTP", message: "<b>Test OTP: " + testOtp + "</b>" });
        console.log("Test email sent to " + targetEmail);
        process.exit(0);
      }
    } else {
      user = await User.findOne().sort({ updatedAt: -1, createdAt: -1 });
      if (!user) { console.error("No users found"); process.exit(1); }
      console.log("Using most recent user: " + user.email);
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    console.log("Generated OTP for " + user.email + ": " + otp);
    const html = "<div style=font-family:sans-serif>" +
      "<h1 style=color:#0d2240>MakaziFlow</h1>" +
      "<div style=font-size:36px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f0fafa;border-radius:8px>" + otp + "</div>" +
      "<p style=color:#64748b>Expires in 15 minutes.</p></div>";
    await sendEmail({ email: user.email, subject: "MakaziFlow Your Verification Code", message: html });
    console.log("Email delivered to " + user.email);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
}

run();