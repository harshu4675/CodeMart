const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");

// Initialize express
const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://yourscodemart.netlify.app",
].filter(Boolean);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy does not allow access from origin ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Debug routes
app.get("/api/debug/razorpay", (req, res) => {
  res.json({
    hasKeyId: !!process.env.RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 12),
    keyIdLength: process.env.RAZORPAY_KEY_ID?.length,
    secretLength: process.env.RAZORPAY_KEY_SECRET?.length,
    nodeEnv: process.env.NODE_ENV,
    isLiveKey: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live"),
    isTestKey: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test"),
  });
});

// ✅ ADD THIS DEBUG ROUTE
app.get("/api/debug/email", (req, res) => {
  res.json({
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
    emailUser: process.env.EMAIL_USER,
    passwordLength: process.env.EMAIL_APP_PASSWORD?.length,
    envLoaded: process.env.NODE_ENV,
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/contact", contactRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "CodeMart API is running",
    environment: process.env.NODE_ENV,
    razorpayMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live")
      ? "LIVE"
      : "TEST",
  });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("join-admin", () => {
    socket.join("admin-room");
    console.log("👨‍💼 Admin joined admin-room");
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler - KEEP THIS LAST
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(
        `💳 Razorpay Mode: ${process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "LIVE 🟢" : "TEST 🟡"}`,
      );
      console.log(`📡 Allowed origins:`, allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });
