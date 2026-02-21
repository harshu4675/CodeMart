const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    phone: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // ============ OTP FIELDS ============
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lastOtpSent: {
      type: Date,
      select: false,
    },
    // ============ END OTP FIELDS ============
    purchasedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    verificationToken: String,
    verificationExpire: Date,
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", function (next) {
  const user = this;

  // Only hash password if it's modified or new
  if (!user.isModified("password")) {
    return next();
  }

  // Check if password is already hashed
  if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
    return next();
  }

  // Hash the password
  bcrypt.genSalt(10, function (err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || "fallback_secret_key_change_in_production",
    { expiresIn: process.env.JWT_EXPIRE || "30d" },
  );
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken;
};

// ============ OTP METHODS ============

// Generate 6-digit OTP
userSchema.methods.generateOTP = function () {
  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP before storing
  this.otp = bcrypt.hashSync(otp, 10);

  // Set expiry to 10 minutes
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Reset attempts
  this.otpAttempts = 0;

  // Set last OTP sent time
  this.lastOtpSent = new Date();

  // Return plain OTP (to send via email)
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = async function (enteredOTP) {
  // Check if OTP exists
  if (!this.otp || !this.otpExpires) {
    return {
      valid: false,
      message: "No OTP found. Please request a new one.",
    };
  }

  // Check if OTP expired
  if (this.otpExpires < new Date()) {
    return {
      valid: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  // Check attempts (max 5)
  if (this.otpAttempts >= 5) {
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  // Compare OTP
  const isValid = bcrypt.compareSync(enteredOTP, this.otp);

  if (!isValid) {
    // Increment attempts
    this.otpAttempts += 1;
    await this.save({ validateBeforeSave: false });

    const attemptsLeft = 5 - this.otpAttempts;
    return {
      valid: false,
      message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`,
    };
  }

  // OTP is valid
  return { valid: true };
};

// Check if user can resend OTP (60 second cooldown)
userSchema.methods.canResendOTP = function () {
  if (!this.lastOtpSent) {
    return { canResend: true, waitTime: 0 };
  }

  const timeDiff = Date.now() - this.lastOtpSent.getTime();
  const cooldown = 60 * 1000; // 60 seconds

  if (timeDiff >= cooldown) {
    return { canResend: true, waitTime: 0 };
  }

  const waitTime = Math.ceil((cooldown - timeDiff) / 1000);
  return { canResend: false, waitTime };
};

// Clear OTP after successful verification
userSchema.methods.clearOTP = function () {
  this.otp = undefined;
  this.otpExpires = undefined;
  this.otpAttempts = 0;
};

// ============ END OTP METHODS ============

module.exports = mongoose.model("User", userSchema);
