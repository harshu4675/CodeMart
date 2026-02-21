const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Create order - requires login
router.post("/create-order", protect, createRazorpayOrder);

// Verify payment - requires login
router.post("/verify", protect, verifyPayment);

// Get payment details - admin only
router.get("/:paymentId", protect, authorize("admin"), getPaymentDetails);

// Refund payment - admin only
router.post("/refund/:paymentId", protect, authorize("admin"), refundPayment);

module.exports = router;
