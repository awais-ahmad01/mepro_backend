import mongoose from 'mongoose';

const scratchCardSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Basic info
    cardName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    campaignTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160
    },

    // Points required to scratch this card
    requiredPoints: {
      type: Number,
      required: true,
      min: 1
    },

    // Duration in weeks (converted to startDate/endDate)
    durationWeeks: {
      type: Number,
      required: true,
      min: 1,
      max: 520 // ~10 years max
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

    // Reward type and conditional fields
    rewardType: {
      type: String,
      enum: ['fixed_points', 'random_points', 'discount', 'free_item', 'try_again'],
      required: true
    },

    // Conditional fields based on rewardType
    fixedPointsAmount: {
      type: Number,
      min: 0
    },
    minPoints: {
      type: Number,
      min: 0
    },
    maxPoints: {
      type: Number,
      min: 0
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    freeItemDescription: {
      type: String,
      trim: true,
      maxlength: 200
    },

    // VIP exclusivity
    isVIPOnly: {
      type: Boolean,
      default: false
    },

    // Card design image
    cardImage: {
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
scratchCardSchema.index({ merchantId: 1, status: 1 });
scratchCardSchema.index({ merchantId: 1, endDate: 1 });
scratchCardSchema.index({ merchantId: 1, isDeleted: 1 });

export default mongoose.model('ScratchCard', scratchCardSchema);

