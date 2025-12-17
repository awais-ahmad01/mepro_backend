import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
      maxlength: 60
    },
    value: {
      type: String,
      trim: true,
      maxlength: 120
    }
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'addToCart',
        'bookNow',
        'orderNow',
        'buyNow',
        'subscribeNow',
        'viewDetails',
        'enrollNow'
      ]
    },
    label: {
      type: String,
      trim: true,
      maxlength: 40
    }
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const priceListItemSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceListCategory',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600
    },
    priceListType: {
      type: String,
      enum: ['regular', 'vip'],
      default: 'regular'
    },
    regularPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discountedPrice: {
      type: Number,
      min: 0
    },
    image: imageSchema,
    attributes: [attributeSchema],
    action: actionSchema,
    isAvailable: {
      type: Boolean,
      default: true
    },
    sortOrder: {
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

priceListItemSchema.index({ merchantId: 1, categoryId: 1, sortOrder: 1 });

export default mongoose.model('PriceListItem', priceListItemSchema);


