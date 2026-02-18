const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  downloadProduct,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrder);
router.get("/:orderId/download/:productId", protect, downloadProduct);

module.exports = router;
