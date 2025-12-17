import Promotion from '../models/promotion.js';
import { deleteFromCloudinary } from '../utils/helpers.js';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const normalizeBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const validatePromotionPayload = (body, isUpdate = false) => {
  const errors = [];

  const title = body.title?.toString().trim();
  const description = body.description?.toString().trim();

  if (!isUpdate || title !== undefined) {
    if (!title || title.length < 2) errors.push('Promotion name must be at least 2 characters');
    if (title && title.length > 160) errors.push('Promotion name cannot exceed 160 characters');
  }

  if (!isUpdate || description !== undefined) {
    if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
    if (description && description.length > 1000) errors.push('Description cannot exceed 1000 characters');
  }

  const allShops = normalizeBoolean(body.allShops, false);
  let locations = [];
  if (!allShops) {
    if (Array.isArray(body.locations)) {
      locations = body.locations.map((loc) => loc.toString().trim()).filter((loc) => loc);
    } else if (body.location) {
      locations = [body.location.toString().trim()];
    }
    if (!isUpdate && locations.length === 0) {
      errors.push('At least one location is required when All Shops is disabled');
    }
  }

  let usageType = body.usageType || null;
  if (!usageType) {
    const instoreSelected = normalizeBoolean(body.instore, false);
    const onlineSelected = normalizeBoolean(body.online, false);
    if (instoreSelected && onlineSelected) usageType = 'both';
    else if (onlineSelected) usageType = 'online';
    else usageType = 'instore';
  }
  if (!['instore', 'online', 'both'].includes(usageType)) {
    errors.push('Invalid usage type');
  }

  const allTime = normalizeBoolean(body.allTime, false);
  const startDate = !allTime ? parseDateOrNull(body.startDate) : null;
  const endDate = !allTime ? parseDateOrNull(body.endDate) : null;
  if (!allTime && (!startDate || !endDate)) {
    if (!isUpdate) errors.push('Valid start and end dates are required when All Time is disabled');
  } else if (startDate && endDate && startDate > endDate) {
    errors.push('Start date must be before end date');
  }

  const status = body.status || 'draft';
  if (!['draft', 'scheduled', 'active', 'paused', 'expired'].includes(status)) {
    errors.push('Invalid status');
  }

  const infinityActive = normalizeBoolean(body.infinityActive, false);

  let restDays = [];
  if (Array.isArray(body.restDays)) {
    restDays = body.restDays.map((d) => d.toString().toLowerCase());
  }
  restDays = restDays.filter((d) => WEEK_DAYS.includes(d));

  if (errors.length) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }

  const payload = {};
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  payload.allShops = allShops;
  if (!allShops) payload.locations = locations;
  payload.usageType = usageType;
  payload.allTime = allTime;
  if (!allTime) {
    payload.startDate = startDate;
    payload.endDate = endDate;
  } else {
    payload.startDate = undefined;
    payload.endDate = undefined;
  }
  payload.status = status;
  payload.infinityActive = infinityActive;
  payload.restDays = restDays;

  return payload;
};

const buildListQuery = (merchantId, query) => {
  const conditions = { merchantId, isDeleted: false };

  if (query.status) {
    conditions.status = query.status;
  }

  if (query.activeOnly === 'true') {
    const now = new Date();
    conditions.status = 'active';
    conditions.$or = [
      { allTime: true },
      { $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] }
    ];
  }

  return conditions;
};

export const createPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const payload = validatePromotionPayload(req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      });
    }

    const image = {
      url: req.file.path,
      publicId: req.file.filename
    };

    const promotion = await Promotion.create({
      merchantId,
      ...payload,
      image
    });

    return res.status(201).json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create promotion'
    });
  }
};

export const listPromotions = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions = buildListQuery(merchantId, req.query);

    const [items, total] = await Promise.all([
      Promotion.find(conditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Promotion.countDocuments(conditions)
    ]);

    return res.status(200).json({
      success: true,
      promotions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List promotions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch promotions'
    });
  }
};

export const getPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const promotion = await Promotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }

    return res.status(200).json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Get promotion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch promotion'
    });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const promotion = await Promotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }

    const payload = validatePromotionPayload(req.body, true);

    Object.assign(promotion, payload);

    if (req.file) {
      if (promotion.image && promotion.image.publicId) {
        try {
          await deleteFromCloudinary(promotion.image.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error for promotion', promotion._id, cloudinaryError);
        }
      }
      promotion.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    await promotion.save();

    return res.status(200).json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update promotion'
    });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const promotion = await Promotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }

    promotion.isDeleted = true;
    await promotion.save();

    if (promotion.image && promotion.image.publicId) {
      try {
        await deleteFromCloudinary(promotion.image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for promotion', promotion._id, cloudinaryError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete promotion'
    });
  }
};


