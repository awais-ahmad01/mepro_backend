import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
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
    usageType: {
      // Instore / Online / both
      type: String,
      enum: ['instore', 'online', 'both'],
      default: 'online'
    },
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
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired'],
      default: 'draft',
      index: true
    },
    infinityActive: {
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

promotionSchema.index({ merchantId: 1, endDate: 1 });

export default mongoose.model('Promotion', promotionSchema);


