const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// ============ PUBLIC ROUTES ============
router.post("/register", register); // Step 1: Register + Send OTP
router.post("/verify-otp", verifyOTP); // Step 2: Verify OTP + Get Token
router.post("/resend-otp", resendOTP); // Resend OTP
router.post("/login", login); // Login (requires verified email)
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:token", resetPassword);

// ============ PROTECTED ROUTES ============
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);

module.exports = router;
