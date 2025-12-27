import mongoose from 'mongoose';

const vipBenefitSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    benefitType: {
      type: String,
      required: true,
      enum: [
        'vip_enrolment_bonus',
        'double_point_days',
        'triple_point_days',
        'birthday_free_gift',
        'scratch_card_access',
        'first_look_access',
        'bonus_redemption_rate'
      ],
      trim: true
    },
    // Store selection (can be store ID/name as string, or null for all stores)
    storeId: {
      type: String,
      trim: true,
      default: null
    },
    allStores: {
      type: Boolean,
      default: false
    },
    // Flexible fields based on benefit type
    // For VIP Enrolment Bonus
    bonusPoints: {
      type: Number,
      min: 0
    },
    // For Birthday Free Gift
    daysBeforeBirthday: {
      type: Number,
      min: 1,
      max: 365,
      default: 30
    },
    giftPointsValue: {
      type: Number,
      min: 0
    },
    // For Bonus Redemption Rate
    pointReduction: {
      type: Number,
      min: 0
    },
    // Status and metadata
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for efficient queries
vipBenefitSchema.index({ merchantId: 1, isDeleted: 1 });
vipBenefitSchema.index({ merchantId: 1, benefitType: 1, isDeleted: 1 });

export default mongoose.model('VIPBenefit', vipBenefitSchema);

