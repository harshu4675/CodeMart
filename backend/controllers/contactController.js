const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Private
exports.sendContactEmail = async (req, res) => {
  try {
    const { subject, message, phone } = req.body;

    // Get user info from authenticated user
    const userName = req.user.name;
    const userEmail = req.user.email;

    // Validation
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    // Email to admin (harshubusiness21@gmail.com - YOUR BUSINESS EMAIL)
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // ✅ Changed from EMAIL_USER to ADMIN_EMAIL
      replyTo: userEmail,
      subject: `🚀 CodeMart Contact: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-row { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
            .value { color: #333; }
            .message-box { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 New Contact Form Submission</h1>
              <p>CodeMart</p>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">👤 User Name:</span>
                <span class="value">${userName}</span>
              </div>
              <div class="info-row">
                <span class="label">📧 User Email:</span>
                <span class="value"><a href="mailto:${userEmail}">${userEmail}</a></span>
              </div>
              <div class="info-row">
                <span class="label">🆔 User ID:</span>
                <span class="value">${req.user._id}</span>
              </div>
              ${
                phone
                  ? `
              <div class="info-row">
                <span class="label">📱 Phone:</span>
                <span class="value">${phone}</span>
              </div>
              `
                  : ""
              }
              <div class="info-row">
                <span class="label">📝 Subject:</span>
                <span class="value">${subject}</span>
              </div>
              <div class="message-box">
                <span class="label">💬 Message:</span>
                <p class="value">${message.replace(/\n/g, "<br>")}</p>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>Received on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              <p>Reply directly to this email to respond to ${userName}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Auto-reply to USER
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "✨ Thanks for contacting CodeMart!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ Thank You, ${userName}!</h1>
              <p>Your message has been received</p>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              <p>Thank you for reaching out to CodeMart! I've received your message and will get back to you within 24-48 hours at <strong>${userEmail}</strong></p>
              
              <div class="highlight-box">
                <p><strong>Your message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
              </div>

              <p>While you wait, feel free to explore our collection of premium digital projects:</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/products" class="button">🛍️ Browse Projects</a>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 13px;">
              <p><strong>Harsh - CodeMart</strong></p>
              <p>Building production-ready digital projects</p>
              <p style="margin-top: 10px; font-size: 11px; color: #aaa;">
                This is an automated response. I'll reply personally within 24-48 hours.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send both emails
    console.log("📧 Sending admin email to:", process.env.ADMIN_EMAIL);
    console.log("📧 Sending auto-reply to:", userEmail);

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    console.log("✅ Both emails sent successfully");

    res.status(200).json({
      success: true,
      message:
        "Message sent successfully! We'll get back to you within 24-48 hours.",
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
    });
  }
};
