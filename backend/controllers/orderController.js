const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const sendWhatsApp = require("../utils/sendWhatsApp");

// @desc    Create order
// @route   POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { products, paymentDetails, couponCode } = req.body;

    // Calculate totals
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      orderProducts.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity || 1,
      });

      totalAmount += product.price * (item.quantity || 1);
    }

    // Calculate discount
    let discount = 0;
    // Add coupon logic here if needed

    // Calculate tax (18% GST)
    const tax = 0;
    const finalAmount = totalAmount - discount;

    // Create order
    const order = await Order.create({
      user: req.user.id,
      products: orderProducts,
      totalAmount,
      discount,
      tax,
      finalAmount,
      paymentDetails,
      paymentStatus: "completed",
      status: "completed",
      couponCode,
    });

    // Update product sales and user purchases
    for (const item of orderProducts) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalSales: item.quantity },
      });

      await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { purchasedProducts: item.product },
      });
    }

    // Populate order
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("products.product", "name thumbnail downloadFile");

    // Generate download links
    const downloadLinks = populatedOrder.products.map((item) => ({
      product: item.product._id,
      url: item.product.downloadFile?.url || "",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }));

    populatedOrder.downloadLinks = downloadLinks;
    await populatedOrder.save();

    // Send email notification
    try {
      await sendEmail({
        email: req.user.email,
        subject: `Order Confirmed - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Thank You for Your Purchase!</h1>
            <p>Hi ${req.user.name},</p>
            <p>Your order <strong>${order.orderNumber}</strong> has been confirmed.</p>
            <h3>Order Details:</h3>
            <ul>
              ${orderProducts.map((p) => `<li>${p.name} - ₹${p.price}</li>`).join("")}
            </ul>
            <p><strong>Total: ₹${finalAmount}</strong></p>
            <p>You can download your products from your dashboard.</p>
            <a href="${process.env.FRONTEND_URL}/dashboard/purchases" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Go to Downloads</a>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Order email failed:", emailError);
    }

    // Emit socket event for real-time admin dashboard update
    const io = req.app.get("io");
    io.to("admin-room").emit("new-order", {
      order: populatedOrder,
      stats: await getQuickStats(),
    });

    res.status(201).json({
      success: true,
      data: populatedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("products.product", "name thumbnail price")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("products.product", "name thumbnail price downloadFile");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check ownership
    if (
      order.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// @desc    Download product
// @route   GET /api/orders/:orderId/download/:productId
exports.downloadProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if product is in order
    const orderProduct = order.products.find(
      (p) => p.product.toString() === productId,
    );

    if (!orderProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      });
    }

    // Get product download file
    const product = await Product.findById(productId);

    if (!product || !product.downloadFile) {
      return res.status(404).json({
        success: false,
        message: "Download file not available",
      });
    }

    // Update download count
    const downloadLink = order.downloadLinks.find(
      (d) => d.product.toString() === productId,
    );
    if (downloadLink) {
      downloadLink.downloadCount += 1;
      await order.save();
    }

    res.status(200).json({
      success: true,
      data: {
        url: product.downloadFile.url,
        filename: product.downloadFile.filename,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Download failed",
      error: error.message,
    });
  }
};

// Helper function for quick stats
async function getQuickStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalOrders, todayOrders, totalRevenue, todayRevenue] =
    await Promise.all([
      Order.countDocuments({ paymentStatus: "completed" }),
      Order.countDocuments({
        paymentStatus: "completed",
        createdAt: { $gte: today },
      }),
      Order.aggregate([
        { $match: { paymentStatus: "completed" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "completed", createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
    ]);

  return {
    totalOrders,
    todayOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    todayRevenue: todayRevenue[0]?.total || 0,
  };
}
