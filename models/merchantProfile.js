// models/MerchantProfile.js
import mongoose from "mongoose";

const merchantProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Registration Progress Tracking
    registrationStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    isRegistrationComplete: {
      type: Boolean,
      default: false,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },

    // Step 1: Basic Information
    legalBusinessName: {
      type: String,
      trim: true,
    },
    aboutBusiness: {
      type: String,
      trim: true,
    },
    businessStructure: {
      type: String,
      enum: [
        "sole_trader",
        "limited_company",
        "partnership",
        "limited_liability_partnership",
      ],
    },

    // Step 2: Contact Details
    primaryContactName: {
      type: String,
      trim: true,
    },
    businessEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    businessPhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    socialMedia: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },

    // Step 3: Address Details (Updated with new fields)
    address: {
      postcode: {
        type: String,
        trim: true,
      },
      buildingNumber: {
        type: String,
        trim: true,
      },
      buildingName: {
        type: String,
        trim: true,
      },
      street: {
        type: String,
        trim: true,
      },
      locality: {
        type: String,
        trim: true,
      },
      townCity: {
        type: String,
        trim: true,
      },
      county: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
        default: "United Kingdom",
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },

    // Step 4: Opening Hours (Updated with dynamic breaks)
    // Step 4: Opening Hours (Corrected based on UI)
    openingHours: {
      monday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String }, // "09:00" - single opening time
        closingTime: { type: String }, // "17:00" - single closing time
        breaks: [
          {
            start: { type: String }, // "13:00"
            end: { type: String }, // "14:00"
            _id: false,
          },
        ],
      },
      tuesday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
      wednesday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
      thursday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
      friday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
      saturday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
      sunday: {
        isClosed: { type: Boolean, default: false },
        openingTime: { type: String },
        closingTime: { type: String },
        breaks: [],
      },
    },

    // Step 5: Business Services (Updated with categories and dynamic services)
    businessCategory: {
      type: String,
      enum: [
        "food_beverage",
        "retail_shopping",
        "beauty_self_care",
        "entertainment",
        "travel_hospitality",
        "tech_learning",
        "car_home_services",
      ],
    },
    earningRate: {
      type: String,
      default: "1:10", // Default earning rate
    },
    services: [
      {
        name: { type: String, required: true, trim: true },
        categorySpecific: { type: Boolean, default: false },
      },
    ],

    // Step 6: Loyalty Tiers
    loyaltyTiers: {
      bronze: {
        type: Number,
        default: 5000,
        min: 0,
      },
      silver: {
        type: Number,
        default: 15000,
        min: 0,
      },
      gold: {
        type: Number,
        default: 30000,
        min: 0,
      },
    },

  // Business Branding (Optional - Can be added anytime)
bannerImage: {
  url: { type: String, trim: true },
  publicId: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  }
},
businessLogo: {
  url: { type: String, trim: true },
  publicId: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  }
},
brandingUpdatedAt: {
  type: Date
},

    // Admin Approval
    adminStatus: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "changes_requested"],
      default: "pending_review",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },

    // Metadata
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
merchantProfileSchema.index({ userId: 1 });


export default mongoose.model("MerchantProfile", merchantProfileSchema);
