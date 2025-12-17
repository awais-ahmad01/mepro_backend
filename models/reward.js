import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
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
    pointsRequired: {
      type: Number,
      required: true,
      min: 1
    },
    // Where the reward can be used
    usageType: {
      type: String,
      enum: ['instore', 'online', 'both'],
      default: 'instore'
    },
    // Inventory
    unlimitedStock: {
      type: Boolean,
      default: false
    },
    stockQuantity: {
      type: Number,
      min: 0
    },
    // Loyalty tiers allowed
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
    // Schedule
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    allTime: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired'],
      default: 'draft',
      index: true
    },
    infinityActive: {
      // multiple use allowed
      type: Boolean,
      default: false
    },
    restDays: [
      {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }
    ],
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

rewardSchema.index({ merchantId: 1, pointsRequired: 1 });
rewardSchema.index({ merchantId: 1, endDate: 1 });

export default mongoose.model('Reward', rewardSchema);


