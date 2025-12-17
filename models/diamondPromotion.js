import mongoose from 'mongoose';

const diamondPromotionSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Basic info
    promotionName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160
    },
    promotionDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },

    // Diamond requirements
    requiredDiamonds: {
      type: Number,
      required: true,
      min: 1
    },

    // Redemption limits
    maxRedemptionsPerUser: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    setOverallRedemptionLimit: {
      type: Boolean,
      default: false
    },
    overallRedemptionLimit: {
      type: Number,
      min: 1
    },

    // Applicable shops
    locations: [
      {
        type: String,
        trim: true,
        maxlength: 80
      }
    ],
    allShops: {
      type: Boolean,
      default: false
    },

    // Applicable tiers
    tiers: [
      {
        type: String,
        trim: true,
        enum: ['gold', 'ultimate', 'basic', 'platinum', 'vip', 'silver', 'champion'],
        lowercase: true
      }
    ],
    allTiers: {
      type: Boolean,
      default: false
    },

    // Approval method
    approvalMethod: {
      type: String,
      enum: ['instore', 'online'],
      default: 'online',
      required: true
    },

    // Stock control
    unlimitedStock: {
      type: Boolean,
      default: false
    },
    totalStock: {
      type: Number,
      min: 0,
      default: 0
    },
    currentStock: {
      type: Number,
      min: 0,
      default: 0
    },

    // Promotion duration
    allTime: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired'],
      default: 'draft',
      index: true
    },

    // Multiple use
    infinityActive: {
      type: Boolean,
      default: false
    },

    // Rest days (days when promotion is not active)
    restDays: [
      {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        lowercase: true
      }
    ],

    // Image
    image: {
      url: {
        type: String,
        trim: true
      },
      publicId: {
        type: String,
        trim: true
      }
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
diamondPromotionSchema.index({ merchantId: 1, status: 1 });
diamondPromotionSchema.index({ merchantId: 1, endDate: 1 });
diamondPromotionSchema.index({ merchantId: 1, isDeleted: 1 });

export default mongoose.model('DiamondPromotion', diamondPromotionSchema);

