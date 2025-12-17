import mongoose from 'mongoose';

const priceListCategorySchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0
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

priceListCategorySchema.index({ merchantId: 1, sortOrder: 1 });

export default mongoose.model('PriceListCategory', priceListCategorySchema);


