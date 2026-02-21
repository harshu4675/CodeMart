const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// ============ EMAIL SERVICE ============

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send OTP Email
const sendOTPEmail = async (email, name, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"CodeMart" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify Your Email - CodeMart",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">⚡ CodeMart</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #f1f5f9;">Verify Your Email</h2>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                      Hi <strong style="color: #e2e8f0;">${name}</strong>,
                    </p>
                    <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                      Welcome to CodeMart! Use the verification code below to complete your registration:
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border: 2px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <p style="margin: 0; font-size: 40px; font-weight: 700; color: #818cf8; letter-spacing: 8px;">${otp}</p>
                    </div>
                    
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #64748b;">
                      ⏱️ This code will expire in <strong style="color: #f59e0b;">10 minutes</strong>.
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                      If you didn't create an account with CodeMart, please ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #111827; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                      © ${new Date().getFullYear()} CodeMart. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return { success: false, error: error.message };
  }
};

// Send Welcome Email (after verification)
const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"CodeMart" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Welcome to CodeMart! 🎉",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 16px; overflow: hidden;">
                
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <h1 style="margin: 0; font-size: 48px;">🎉</h1>
                    <h2 style="margin: 16px 0 0; font-size: 24px; font-weight: 700; color: #ffffff;">Welcome to CodeMart!</h2>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                      Hi <strong style="color: #e2e8f0;">${name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                      Your email has been verified successfully! You can now explore thousands of premium digital products.
                    </p>
                    <a href="${process.env.FRONTEND_URL}/products" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">
                      Start Shopping
                    </a>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 24px 40px; background-color: #111827; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                      © ${new Date().getFullYear()} CodeMart. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("❌ Welcome email error:", error);
    return { success: false, error: error.message };
  }
};

// Generic send email function
const sendEmail = async ({ email, subject, html }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"CodeMart" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

// ============ AUTH CONTROLLERS ============

// @desc    Register user & send OTP
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email }).select(
      "+otp +otpExpires +lastOtpSent",
    );

    if (existingUser) {
      // If user exists but not verified, allow re-registration with new OTP
      if (!existingUser.isVerified) {
        // Check cooldown
        const cooldownCheck = existingUser.canResendOTP();
        if (!cooldownCheck.canResend) {
          return res.status(429).json({
            success: false,
            message: `Please wait ${cooldownCheck.waitTime} seconds before requesting a new OTP`,
            retryAfter: cooldownCheck.waitTime,
          });
        }

        // Update user info and generate new OTP
        existingUser.name = name;
        existingUser.password = password;
        existingUser.phone = phone || "";

        const otp = existingUser.generateOTP();
        await existingUser.save();

        // Send OTP email
        const emailResult = await sendOTPEmail(email, name, otp);

        if (!emailResult.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to send verification email. Please try again.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Verification code sent to your email",
          data: {
            email: existingUser.email,
            requiresVerification: true,
          },
        });
      }

      // User exists and is verified
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone: phone || "",
      isVerified: false,
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, name, otp);

    if (!emailResult.success) {
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Verification code sent to your email",
      data: {
        email: user.email,
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({ email }).select(
      "+otp +otpExpires +otpAttempts +password",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
    }

    // Verify OTP
    const verifyResult = await user.verifyOTP(otp);

    if (!verifyResult.valid) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
      });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.clearOTP();
    await user.save({ validateBeforeSave: false });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("❌ Welcome email failed:", err),
    );

    // Send token response
    sendTokenResponse(user, 200, res, "Email verified successfully! 🎉");
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user
    const user = await User.findOne({ email }).select("+lastOtpSent");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
    }

    // Check cooldown
    const cooldownCheck = user.canResendOTP();
    if (!cooldownCheck.canResend) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldownCheck.waitTime} seconds before requesting a new OTP`,
        retryAfter: cooldownCheck.waitTime,
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    const emailResult = await sendOTPEmail(email, user.name, otp);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "New verification code sent to your email",
    });
  } catch (error) {
    console.error("❌ Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Check user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ CHECK IF EMAIL IS VERIFIED
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    sendTokenResponse(user, 200, res, "Login successful!");
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("purchasedProducts")
      .populate("wishlist");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, avatar },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, "Password updated successfully!");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update password",
      error: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: "CodeMart - Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0; padding: 40px; border-radius: 16px;">
          <h1 style="color: #6366f1;">🔐 Password Reset</h1>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>You requested a password reset. Click the button below:</p>
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600;">Reset Password</a>
          <p style="color: #94a3b8;">This link expires in <strong style="color: #f59e0b;">30 minutes</strong>.</p>
          <p style="color: #64748b;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send reset email",
      error: error.message,
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:token
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendTokenResponse(user, 200, res, "Password reset successful!");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, message = null) => {
  const token = user.getSignedJwtToken();

  const response = {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
    },
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};
