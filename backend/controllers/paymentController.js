const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper: Check Razorpay mode
const getRazorpayMode = () => {
  return process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "LIVE" : "TEST";
};

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    // Log Razorpay mode
    const mode = getRazorpayMode();
    console.log(`💳 Razorpay Mode: ${mode}`);

    if (mode === "TEST") {
      console.warn("⚠️ WARNING: Using TEST mode!");
    }

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least ₹1",
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1, // Auto capture
    };

    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay Order Created:", {
      orderId: order.id,
      amount: order.amount / 100,
      mode: mode,
      userId: req.user?._id,
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        mode: mode, // Include mode in response
      },
    });
  } catch (error) {
    console.error("❌ Razorpay order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
      });
    }

    // Create signature for verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    // Verify signature
    if (razorpay_signature === expectedSign) {
      try {
        // Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        console.log("✅ Payment Verified:", {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: payment.amount / 100,
          method: payment.method,
          status: payment.status,
        });

        res.status(200).json({
          success: true,
          message: "Payment verified successfully",
          data: {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paymentMethod: payment.method,
            amount: payment.amount / 100,
            status: payment.status,
          },
        });
      } catch (fetchError) {
        console.error("Error fetching payment details:", fetchError);
        return res.status(500).json({
          success: false,
          message: "Unable to verify payment details",
        });
      }
    } else {
      console.error("❌ Payment Signature Mismatch:", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });

      res.status(400).json({
        success: false,
        message: "Payment verification failed - Invalid signature",
      });
    }
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get payment details
// @route   GET /api/payment/:paymentId
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);

    res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at,
      },
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payment/refund/:paymentId
exports.refundPayment = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const { paymentId } = req.params;

    // Fetch payment first
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: "Only captured payments can be refunded",
      });
    }

    // Create refund
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : payment.amount,
      speed: "normal",
      notes: {
        reason: reason || "Customer request",
        refunded_by: req.user.email,
      },
    });

    console.log("✅ Refund Processed:", {
      paymentId,
      refundId: refund.id,
      amount: refund.amount / 100,
      refundedBy: req.user.email,
    });

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(500).json({
      success: false,
      message: "Refund failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
