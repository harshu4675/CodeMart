const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get counts
    const [
      totalUsers,
      newUsersToday,
      newUsersThisMonth,
      totalProducts,
      activeProducts,
      totalOrders,
      ordersToday,
      ordersThisMonth,
      pendingOrders,
      totalReviews,
      pendingReviews,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ paymentStatus: "completed" }),
      Order.countDocuments({
        paymentStatus: "completed",
        createdAt: { $gte: today },
      }),
      Order.countDocuments({
        paymentStatus: "completed",
        createdAt: { $gte: thisMonth },
      }),
      Order.countDocuments({ status: "pending" }),
      Review.countDocuments(),
      Review.countDocuments({ isApproved: false }),
    ]);

    // Revenue calculations
    const [totalRevenue, todayRevenue, monthlyRevenue, lastMonthRevenue] =
      await Promise.all([
        Order.aggregate([
          { $match: { paymentStatus: "completed" } },
          { $group: { _id: null, total: { $sum: "$finalAmount" } } },
        ]),
        Order.aggregate([
          {
            $match: { paymentStatus: "completed", createdAt: { $gte: today } },
          },
          { $group: { _id: null, total: { $sum: "$finalAmount" } } },
        ]),
        Order.aggregate([
          {
            $match: {
              paymentStatus: "completed",
              createdAt: { $gte: thisMonth },
            },
          },
          { $group: { _id: null, total: { $sum: "$finalAmount" } } },
        ]),
        Order.aggregate([
          {
            $match: {
              paymentStatus: "completed",
              createdAt: { $gte: lastMonth, $lte: lastMonthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: "$finalAmount" } } },
        ]),
      ]);

    // Revenue by category
    const revenueByCategory = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.category",
          revenue: { $sum: "$products.price" },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Revenue trend (last 7 days)
    const revenueTrend = await Order.aggregate([
      {
        $match: {
          paymentStatus: "completed",
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$finalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top products
    const topProducts = await Product.find({ isActive: true })
      .sort("-totalSales")
      .limit(5)
      .select("name thumbnail totalSales price");

    // Recent orders
    const recentOrders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name thumbnail")
      .sort("-createdAt")
      .limit(10);

    // Recent users
    const recentUsers = await User.find()
      .sort("-createdAt")
      .limit(5)
      .select("name email avatar createdAt");

    // Calculate growth
    const currentMonthRevenue = monthlyRevenue[0]?.total || 0;
    const previousMonthRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth =
      previousMonthRevenue > 0
        ? (
            ((currentMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
          ).toFixed(1)
        : 100;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          newUsersToday,
          newUsersThisMonth,
          totalProducts,
          activeProducts,
          totalOrders,
          ordersToday,
          ordersThisMonth,
          pendingOrders,
          totalReviews,
          pendingReviews,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
          thisMonth: currentMonthRevenue,
          lastMonth: previousMonthRevenue,
          growth: parseFloat(revenueGrowth),
        },
        revenueByCategory,
        revenueTrend,
        topProducts,
        recentOrders,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("purchasedProducts", "name")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("purchasedProducts")
      .populate("wishlist");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's orders
    const orders = await Order.find({ user: user._id })
      .populate("products.product", "name thumbnail")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: {
        user,
        orders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, isVerified } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, isVerified },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow deleting admin users
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      startDate,
      endDate,
    } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("products.product", "name thumbnail")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
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

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, paymentStatus, notes },
      { new: true, runValidators: true },
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Emit socket event
    const io = req.app.get("io");
    io.to("admin-room").emit("order-updated", order);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

// @desc    Get all reviews
// @route   GET /api/admin/reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, isApproved } = req.query;

    let query = {};

    if (isApproved !== undefined) {
      query.isApproved = isApproved === "true";
    }

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate("user", "name email avatar")
      .populate("product", "name thumbnail")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// @desc    Approve/Reject review
// @route   PUT /api/admin/reviews/:id
exports.updateReview = async (req, res) => {
  try {
    const { isApproved } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true },
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily revenue
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: "completed",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$finalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // User registrations
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top selling products
    const topSellingProducts = await Order.aggregate([
      {
        $match: { paymentStatus: "completed", createdAt: { $gte: startDate } },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          sales: { $sum: "$products.quantity" },
          revenue: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          thumbnail: "$product.thumbnail",
          sales: 1,
          revenue: 1,
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]);

    // Traffic sources (mock data - integrate with analytics service)
    const trafficSources = [
      { source: "Direct", visits: 45 },
      { source: "Google", visits: 30 },
      { source: "Social Media", visits: 15 },
      { source: "Referral", visits: 10 },
    ];

    // Conversion rate
    const totalVisitors = await Product.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);
    const totalBuyers = await Order.distinct("user", {
      paymentStatus: "completed",
    });
    const conversionRate =
      totalVisitors[0]?.totalViews > 0
        ? ((totalBuyers.length / totalVisitors[0].totalViews) * 100).toFixed(2)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        dailyRevenue,
        userRegistrations,
        topSellingProducts,
        trafficSources,
        conversionRate: parseFloat(conversionRate),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};
