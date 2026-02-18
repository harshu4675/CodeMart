const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide product name"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please provide product description"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please provide product price"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: [true, "Please provide product category"],
      trim: true,
    },

    subcategory: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
      },
    ],
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    thumbnail: {
      type: String,
      default: "",
    },
    downloadFile: {
      url: String,
      filename: String,
      size: Number,
    },
    demoUrl: {
      type: String,
      default: "",
    },
    features: [
      {
        type: String,
      },
    ],
    techStack: [
      {
        type: String,
      },
    ],
    compatibility: [
      {
        type: String,
      },
    ],
    version: {
      type: String,
      default: "1.0.0",
    },
    license: {
      type: String,
      enum: ["personal", "commercial", "extended"],
      default: "personal",
    },
    support: {
      type: String,
      enum: ["none", "3-months", "6-months", "1-year", "lifetime"],
      default: "none",
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Create slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

// Calculate discount
productSchema.pre("save", function (next) {
  if (this.originalPrice > 0 && this.price < this.originalPrice) {
    this.discount = Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100,
    );
  }
  next();
});

// Index for search
productSchema.index({ name: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);
