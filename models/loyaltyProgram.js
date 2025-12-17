import mongoose from 'mongoose';

const loyaltyProgramSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Basic info
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },

    // Earning rules: "Earn X points per £Y spent"
    earnPoints: {
      type: Number,
      required: true,
      min: 1
    },
    perAmountSpent: {
      type: Number,
      required: true,
      min: 0.01
    },

    // Redemption rules: "Redeem X points for Y benefit"
    pointsRequired: {
      type: Number,
      required: true,
      min: 1
    },
    benefitReward: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    // Location scope
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

    // Tier eligibility
    tiers: [
      {
        type: String,
        enum: ['basic', 'silver', 'gold', 'platinum', 'vip', 'champion', 'ultimate']
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
      default: 'online'
    },

    // Stock management
    unlimitedStock: {
      type: Boolean,
      default: false
    },
    totalStock: {
      type: Number,
      min: 0
    },
    currentStock: {
      type: Number,
      min: 0,
      default: 0
    },

    // Scheduling
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

    // Rest days
    restDays: [
      {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }
    ],

    // Image
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true }
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
loyaltyProgramSchema.index({ merchantId: 1, status: 1 });
loyaltyProgramSchema.index({ merchantId: 1, endDate: 1 });
loyaltyProgramSchema.index({ merchantId: 1, isDeleted: 1 });

export default mongoose.model('LoyaltyProgram', loyaltyProgramSchema);

