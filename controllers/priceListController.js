import PriceListCategory from '../models/priceListCategory.js';
import PriceListItem from '../models/priceListItem.js';
import { deleteFromCloudinary } from '../utils/helpers.js';

// ---------- Validation helpers ----------

const ALLOWED_ACTION_TYPES = [
  'addToCart',
  'bookNow',
  'orderNow',
  'buyNow',
  'subscribeNow',
  'viewDetails',
  'enrollNow'
];

const validateCategoryName = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Category name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error('Category name must be at least 2 characters');
  }
  if (trimmed.length > 120) {
    throw new Error('Category name cannot exceed 120 characters');
  }
  return trimmed;
};

const validateItemPayload = (body) => {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('Item name must be at least 2 characters');
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length < 5) {
    errors.push('Description must be at least 5 characters');
  }

  const regularPrice = Number(body.regularPrice);
  const discountedPrice =
    body.discountedPrice !== undefined && body.discountedPrice !== null
      ? Number(body.discountedPrice)
      : undefined;

  if (Number.isNaN(regularPrice) || regularPrice < 0) {
    errors.push('Regular price must be a non-negative number');
  }

  if (discountedPrice !== undefined) {
    if (Number.isNaN(discountedPrice) || discountedPrice < 0) {
      errors.push('Discounted/VIP price must be a non-negative number');
    } else if (discountedPrice > regularPrice) {
      errors.push('Discounted/VIP price cannot be greater than regular price');
    }
  }

  let action;
  if (body.action) {
    const type = body.action.type;
    const label = body.action.label;

    if (type && !ALLOWED_ACTION_TYPES.includes(type)) {
      errors.push('Invalid action type');
    }

    if (label && label.length > 40) {
      errors.push('Action label cannot exceed 40 characters');
    }

    action = {
      type: type || undefined,
      label: label ? label.trim() : undefined
    };
  } else if (body.actionType || body.actionLabel) {
    // Support flatter API for mobile clients
    const type = body.actionType;
    const label = body.actionLabel;

    if (type && !ALLOWED_ACTION_TYPES.includes(type)) {
      errors.push('Invalid action type');
    }

    if (label && label.length > 40) {
      errors.push('Action label cannot exceed 40 characters');
    }

    action = {
      type: type || undefined,
      label: label ? label.trim() : undefined
    };
  }

  let attributes = [];
  if (Array.isArray(body.attributes)) {
    attributes = body.attributes
      .filter((attr) => attr && (attr.key || attr.value))
      .map((attr) => ({
        key: attr.key ? String(attr.key).trim().slice(0, 60) : undefined,
        value: attr.value ? String(attr.value).trim().slice(0, 120) : undefined
      }));
  }

  const isAvailable =
    typeof body.isAvailable === 'boolean'
      ? body.isAvailable
      : body.isAvailable === 'false'
      ? false
      : true;

  if (errors.length) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }

  return {
    name: body.name.trim(),
    description: body.description.trim(),
    priceListType: body.priceListType && ['regular', 'vip'].includes(body.priceListType)
      ? body.priceListType
      : 'regular',
    regularPrice,
    discountedPrice,
    attributes,
    action,
    isAvailable
  };
};

// ---------- Category handlers ----------

export const createCategory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const name = validateCategoryName(req.body.name);

    const existing = await PriceListCategory.findOne({
      merchantId,
      name: new RegExp(`^${name}$`, 'i'),
      isDeleted: false
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    const lastCategory = await PriceListCategory.findOne({ merchantId, isDeleted: false })
      .sort({ sortOrder: -1 })
      .lean();

    const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 1;

    const category = await PriceListCategory.create({
      merchantId,
      name,
      sortOrder
    });

    return res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create category'
    });
  }
};

export const listCategories = async (req, res) => {
  try {
    const merchantId = req.user.id;

    const categories = await PriceListCategory.find({
      merchantId,
      isDeleted: false
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId } = req.params;

    const updates = {};

    if (req.body.name !== undefined) {
      updates.name = validateCategoryName(req.body.name);
    }

    if (req.body.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      if (Number.isNaN(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: 'sortOrder must be a number'
        });
      }
      updates.sortOrder = sortOrder;
    }

    const category = await PriceListCategory.findOneAndUpdate(
      { _id: categoryId, merchantId, isDeleted: false },
      updates,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    return res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId } = req.params;

    const category = await PriceListCategory.findOneAndUpdate(
      { _id: categoryId, merchantId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Soft-delete items as well
    await PriceListItem.updateMany(
      { categoryId: category._id, merchantId, isDeleted: false },
      { isDeleted: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};

// ---------- Item handlers ----------

export const createItem = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId } = req.params;

    const category = await PriceListCategory.findOne({
      _id: categoryId,
      merchantId,
      isDeleted: false
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const payload = validateItemPayload(req.body);

    let image;
    if (req.file) {
      image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      });
    }

    const lastItem = await PriceListItem.findOne({
      merchantId,
      categoryId,
      isDeleted: false
    })
      .sort({ sortOrder: -1 })
      .lean();

    const sortOrder = lastItem ? lastItem.sortOrder + 1 : 1;

    const item = await PriceListItem.create({
      merchantId,
      categoryId,
      ...payload,
      image,
      sortOrder
    });

    category.itemCount += 1;
    await category.save();

    return res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create item'
    });
  }
};

export const listItemsByCategory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId } = req.params;

    const category = await PriceListCategory.findOne({
      _id: categoryId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const items = await PriceListItem.find({
      merchantId,
      categoryId,
      isDeleted: false
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      category,
      items
    });
  } catch (error) {
    console.error('List items error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }
};

export const updateItem = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId, itemId } = req.params;

    const item = await PriceListItem.findOne({
      _id: itemId,
      categoryId,
      merchantId,
      isDeleted: false
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const payload = validateItemPayload({
      ...item.toObject(),
      ...req.body
    });

    let image = item.image;
    if (req.file) {
      // Delete old image if exists
      if (image && image.publicId) {
        await deleteFromCloudinary(image.publicId);
      }
      image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    item.name = payload.name;
    item.description = payload.description;
    item.priceListType = payload.priceListType;
    item.regularPrice = payload.regularPrice;
    item.discountedPrice = payload.discountedPrice;
    item.attributes = payload.attributes;
    item.action = payload.action;
    item.isAvailable = payload.isAvailable;
    item.image = image;

    if (req.body.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      if (Number.isNaN(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: 'sortOrder must be a number'
        });
      }
      item.sortOrder = sortOrder;
    }

    await item.save();

    return res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Update item error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update item'
    });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { categoryId, itemId } = req.params;

    const item = await PriceListItem.findOne({
      _id: itemId,
      categoryId,
      merchantId,
      isDeleted: false
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Soft delete the item
    item.isDeleted = true;
    await item.save();

    // Attempt to remove image from Cloudinary (best-effort)
    if (item.image && item.image.publicId) {
      try {
        await deleteFromCloudinary(item.image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for item', item._id, cloudinaryError);
        // Do not fail the request because of storage cleanup issues
      }
    }

    const category = await PriceListCategory.findOne({
      _id: categoryId,
      merchantId,
      isDeleted: false
    });

    if (category && category.itemCount > 0) {
      category.itemCount -= 1;
      await category.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
};


