import Reward from '../models/reward.js';
import { deleteFromCloudinary } from '../utils/helpers.js';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIER_VALUES = ['basic', 'silver', 'gold', 'platinum', 'vip', 'champion', 'ultimate'];

// ---------- Validation helpers ----------

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

const validateRewardPayload = (body, isUpdate = false) => {
  const errors = [];

  const title = body.title?.toString().trim();
  const description = body.description?.toString().trim();

  if (!isUpdate || title !== undefined) {
    if (!title || title.length < 2) errors.push('Reward name must be at least 2 characters');
    if (title && title.length > 160) errors.push('Reward name cannot exceed 160 characters');
  }

  if (!isUpdate || description !== undefined) {
    if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
    if (description && description.length > 1000) errors.push('Description cannot exceed 1000 characters');
  }

  let pointsRequired;
  if (body.pointsRequired !== undefined) {
    pointsRequired = Number(body.pointsRequired);
    if (Number.isNaN(pointsRequired) || pointsRequired <= 0) {
      errors.push('Points required must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Points required is mandatory');
  }

  const allShops = normalizeBoolean(body.allShops, false);
  let locations = [];
  if (!allShops) {
    if (Array.isArray(body.locations)) {
      locations = body.locations.map((loc) => loc.toString().trim()).filter((loc) => loc);
    } else if (body.location) {
      // Support single location field from mobile client
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

  const unlimitedStock = normalizeBoolean(body.unlimitedStock, false);
  let stockQuantity;
  if (!unlimitedStock) {
    if (body.stockQuantity !== undefined) {
      stockQuantity = Number(body.stockQuantity);
      if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        errors.push('Stock quantity must be a non-negative number');
      }
    } else if (!isUpdate) {
      errors.push('Stock quantity is required when Unlimited Stock is disabled');
    }
  }

  const allTiers = normalizeBoolean(body.allTiers, false);
  let tiers = [];
  if (!allTiers) {
    if (Array.isArray(body.tiers)) {
      tiers = body.tiers.map((t) => t.toString().toLowerCase());
    } else if (body.tierLevels) {
      tiers = body.tierLevels.toString().split(',').map((t) => t.trim().toLowerCase());
    }
    tiers = tiers.filter((t) => TIER_VALUES.includes(t));
    if (!isUpdate && tiers.length === 0) {
      errors.push('At least one tier is required when All Tiers is disabled');
    }
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
  if (pointsRequired !== undefined) payload.pointsRequired = pointsRequired;
  payload.allShops = allShops;
  if (!allShops) payload.locations = locations;
  payload.usageType = usageType;
  payload.unlimitedStock = unlimitedStock;
  if (!unlimitedStock) payload.stockQuantity = stockQuantity;
  payload.allTiers = allTiers;
  if (!allTiers) payload.tiers = tiers;
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

// ---------- Controllers ----------

export const createReward = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const payload = validateRewardPayload(req.body);

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

    const reward = await Reward.create({
      merchantId,
      ...payload,
      image
    });

    return res.status(201).json({
      success: true,
      reward
    });
  } catch (error) {
    console.error('Create reward error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create reward'
    });
  }
};

export const listRewards = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions = buildListQuery(merchantId, req.query);

    const [items, total] = await Promise.all([
      Reward.find(conditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reward.countDocuments(conditions)
    ]);

    return res.status(200).json({
      success: true,
      rewards: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List rewards error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards'
    });
  }
};

export const getReward = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { rewardId } = req.params;

    const reward = await Reward.findOne({
      _id: rewardId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    return res.status(200).json({
      success: true,
      reward
    });
  } catch (error) {
    console.error('Get reward error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reward'
    });
  }
};

export const updateReward = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { rewardId } = req.params;

    const reward = await Reward.findOne({
      _id: rewardId,
      merchantId,
      isDeleted: false
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    const payload = validateRewardPayload(req.body, true);

    Object.assign(reward, payload);

    if (req.file) {
      if (reward.image && reward.image.publicId) {
        try {
          await deleteFromCloudinary(reward.image.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error for reward', reward._id, cloudinaryError);
        }
      }
      reward.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    await reward.save();

    return res.status(200).json({
      success: true,
      reward
    });
  } catch (error) {
    console.error('Update reward error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update reward'
    });
  }
};

export const deleteReward = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { rewardId } = req.params;

    const reward = await Reward.findOne({
      _id: rewardId,
      merchantId,
      isDeleted: false
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    reward.isDeleted = true;
    await reward.save();

    if (reward.image && reward.image.publicId) {
      try {
        await deleteFromCloudinary(reward.image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for reward', reward._id, cloudinaryError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Reward deleted successfully'
    });
  } catch (error) {
    console.error('Delete reward error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete reward'
    });
  }
};


