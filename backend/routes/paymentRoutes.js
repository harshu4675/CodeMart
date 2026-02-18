const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);
router.get("/:paymentId", protect, getPaymentDetails);
router.post("/refund/:paymentId", protect, authorize("admin"), refundPayment);

module.exports = router;
