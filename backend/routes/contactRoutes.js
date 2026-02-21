const express = require("express");
const router = express.Router();
const { sendContactEmail } = require("../controllers/contactController");
const { protect } = require("../middleware/authMiddleware"); // Add auth middleware

// @route   POST /api/contact
// @desc    Send contact form email
// @access  Private (logged in users only)
router.post("/", protect, sendContactEmail);

module.exports = router;
