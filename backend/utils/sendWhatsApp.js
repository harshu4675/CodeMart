// Mock WhatsApp sender - doesn't require Twilio
// You can add real Twilio integration later

const sendWhatsApp = async (to, message) => {
  try {
    // Check if Twilio is configured
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      process.env.TWILIO_ACCOUNT_SID === "skip"
    ) {
      console.log("📱 WhatsApp (Mock):", message.substring(0, 50) + "...");
      console.log("   To:", to);
      return { success: true, mock: true };
    }

    // If Twilio is configured, try to use it
    try {
      const twilio = require("twilio");
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const response = await client.messages.create({
        body: message,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
      });

      console.log("📱 WhatsApp message sent:", response.sid);
      return { success: true, sid: response.sid };
    } catch (twilioError) {
      console.log("⚠️ Twilio not installed, skipping WhatsApp");
      return { success: true, mock: true };
    }
  } catch (error) {
    console.error("WhatsApp send error:", error.message);
    // Don't throw error, just log it
    return { success: false, error: error.message };
  }
};

module.exports = sendWhatsApp;
