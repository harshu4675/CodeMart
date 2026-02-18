const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllOrders,
  updateOrderStatus,
  getAllReviews,
  updateReview,
  deleteReview,
  getAnalytics,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes require admin authentication
router.use(protect);
router.use(authorize("admin"));

// Dashboard
router.get("/dashboard", getDashboardStats);
router.get("/analytics", getAnalytics);

// Users
router.get("/users", getUsers);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Orders
router.get("/orders", getAllOrders);
router.put("/orders/:id", updateOrderStatus);

// Reviews
router.get("/reviews", getAllReviews);
router.put("/reviews/:id", updateReview);
router.delete("/reviews/:id", deleteReview);

module.exports = router;
