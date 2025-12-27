import mongoose from 'mongoose';

const vipMembershipPricingSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: String,
      enum: ['month', 'quarter', 'year'],
      required: true,
      default: 'year'
    },
    currency: {
      type: String,
      default: 'GBP',
      trim: true,
      maxlength: 3
    }
  },
  { timestamps: true }
);

// Ensure one pricing per merchant
vipMembershipPricingSchema.index({ merchantId: 1 }, { unique: true });

export default mongoose.model('VIPMembershipPricing', vipMembershipPricingSchema);

