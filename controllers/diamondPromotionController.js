import DiamondPromotion from '../models/diamondPromotion.js';
import { deleteFromCloudinary } from '../utils/helpers.js';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIERS = ['gold', 'ultimate', 'basic', 'platinum', 'vip', 'silver', 'champion'];

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

const validateDiamondPromotionPayload = (body, isUpdate = false) => {
  const errors = [];

  // Promotion Name
  const promotionName = body.promotionName?.toString().trim();
  if (!isUpdate || promotionName !== undefined) {
    if (!promotionName || promotionName.length < 2) {
      errors.push('Promotion name must be at least 2 characters');
    }
    if (promotionName && promotionName.length > 160) {
      errors.push('Promotion name cannot exceed 160 characters');
    }
  }

  // Promotion Description
  const promotionDescription = body.promotionDescription?.toString().trim();
  if (!isUpdate || promotionDescription !== undefined) {
    if (!promotionDescription || promotionDescription.length < 10) {
      errors.push('Promotion description must be at least 10 characters');
    }
    if (promotionDescription && promotionDescription.length > 1000) {
      errors.push('Promotion description cannot exceed 1000 characters');
    }
  }

  // Required Diamonds
  let requiredDiamonds;
  if (body.requiredDiamonds !== undefined) {
    requiredDiamonds = Number(body.requiredDiamonds);
    if (Number.isNaN(requiredDiamonds) || requiredDiamonds < 1) {
      errors.push('Required diamonds must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Required diamonds is mandatory');
  }

  // Max Redemptions Per User
  let maxRedemptionsPerUser;
  if (body.maxRedemptionsPerUser !== undefined) {
    maxRedemptionsPerUser = Number(body.maxRedemptionsPerUser);
    if (Number.isNaN(maxRedemptionsPerUser) || maxRedemptionsPerUser < 1) {
      errors.push('Max redemptions per user must be at least 1');
    }
  } else if (!isUpdate) {
    maxRedemptionsPerUser = 1; // Default
  }

  // Overall Redemption Limit
  const setOverallRedemptionLimit = normalizeBoolean(body.setOverallRedemptionLimit, false);
  let overallRedemptionLimit;
  if (setOverallRedemptionLimit) {
    if (body.overallRedemptionLimit !== undefined) {
      overallRedemptionLimit = Number(body.overallRedemptionLimit);
      if (Number.isNaN(overallRedemptionLimit) || overallRedemptionLimit < 1) {
        errors.push('Overall redemption limit must be a positive number when enabled');
      }
    } else if (!isUpdate) {
      errors.push('Overall redemption limit is required when Set Overall Redemption Limit is enabled');
    }
  }

  // Applicable Shops
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

  // Applicable Tiers
  const allTiers = normalizeBoolean(body.allTiers, false);
  let tiers = [];
  if (!allTiers) {
    if (Array.isArray(body.tiers)) {
      tiers = body.tiers
        .map((tier) => tier.toString().trim().toLowerCase())
        .filter((tier) => TIERS.includes(tier));
      if (tiers.length === 0 && !isUpdate) {
        errors.push('At least one valid tier is required when All Tiers is disabled');
      }
      // Validate tier values
      const invalidTiers = body.tiers.filter((t) => !TIERS.includes(t.toString().trim().toLowerCase()));
      if (invalidTiers.length > 0) {
        errors.push(`Invalid tier values: ${invalidTiers.join(', ')}. Valid tiers are: ${TIERS.join(', ')}`);
      }
    } else if (!isUpdate) {
      errors.push('At least one tier is required when All Tiers is disabled');
    }
  }

  // Approval Method
  const approvalMethod = body.approvalMethod?.toString().toLowerCase().trim();
  if (approvalMethod && !['instore', 'online'].includes(approvalMethod)) {
    errors.push('Approval method must be either "instore" or "online"');
  }

  // Stock Control
  const unlimitedStock = normalizeBoolean(body.unlimitedStock, false);
  let totalStock, currentStock;
  if (!unlimitedStock) {
    if (body.totalStock !== undefined) {
      totalStock = Number(body.totalStock);
      if (Number.isNaN(totalStock) || totalStock < 0) {
        errors.push('Total stock must be a non-negative number');
      }
    } else if (!isUpdate) {
      errors.push('Total stock is required when Unlimited Stock is disabled');
    }

    if (body.currentStock !== undefined) {
      currentStock = Number(body.currentStock);
      if (Number.isNaN(currentStock) || currentStock < 0) {
        errors.push('Current stock must be a non-negative number');
      }
      if (totalStock !== undefined && currentStock > totalStock) {
        errors.push('Current stock cannot exceed total stock');
      }
    } else if (!isUpdate && totalStock !== undefined) {
      currentStock = totalStock; // Default to total stock
    }
  }

  // Promotion Duration
  const allTime = normalizeBoolean(body.allTime, false);
  let startDate, endDate;
  if (!allTime) {
    startDate = parseDateOrNull(body.startDate);
    endDate = parseDateOrNull(body.endDate);

    if (!isUpdate || body.startDate !== undefined) {
      if (!startDate) {
        errors.push('Start date is required when not all-time');
      }
    }
    if (!isUpdate || body.endDate !== undefined) {
      if (!endDate) {
        errors.push('End date is required when not all-time');
      }
    }

    if (startDate && endDate && startDate > endDate) {
      errors.push('Start date cannot be after end date');
    }
  }

  // Status
  const status = body.status?.toString().toLowerCase().trim();
  if (status && !['draft', 'scheduled', 'active', 'paused', 'expired'].includes(status)) {
    errors.push('Invalid status. Must be one of: draft, scheduled, active, paused, expired');
  }

  // Rest Days
  let restDays = [];
  if (Array.isArray(body.restDays)) {
    restDays = body.restDays
      .map((day) => day.toString().trim().toLowerCase())
      .filter((day) => WEEK_DAYS.includes(day));
    // Validate rest days
    const invalidDays = body.restDays.filter((d) => !WEEK_DAYS.includes(d.toString().trim().toLowerCase()));
    if (invalidDays.length > 0) {
      errors.push(`Invalid rest day values: ${invalidDays.join(', ')}. Valid days are: ${WEEK_DAYS.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }

  // Build normalized payload
  const payload = {};
  if (promotionName !== undefined) payload.promotionName = promotionName;
  if (promotionDescription !== undefined) payload.promotionDescription = promotionDescription;
  if (requiredDiamonds !== undefined) payload.requiredDiamonds = requiredDiamonds;
  if (maxRedemptionsPerUser !== undefined) payload.maxRedemptionsPerUser = maxRedemptionsPerUser;
  payload.setOverallRedemptionLimit = setOverallRedemptionLimit;
  if (overallRedemptionLimit !== undefined) payload.overallRedemptionLimit = overallRedemptionLimit;
  payload.allShops = allShops;
  if (locations.length > 0 || allShops) payload.locations = locations;
  payload.allTiers = allTiers;
  if (tiers.length > 0 || allTiers) payload.tiers = tiers;
  if (approvalMethod) payload.approvalMethod = approvalMethod;
  payload.unlimitedStock = unlimitedStock;
  if (totalStock !== undefined) payload.totalStock = totalStock;
  if (currentStock !== undefined) payload.currentStock = currentStock;
  payload.allTime = allTime;
  if (startDate) payload.startDate = startDate;
  if (endDate) payload.endDate = endDate;
  if (status) payload.status = status;
  payload.infinityActive = normalizeBoolean(body.infinityActive, false);
  if (restDays.length > 0) payload.restDays = restDays;

  return payload;
};

// ---------- Query builder ----------

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
      {
        $and: [
          { startDate: { $lte: now } },
          { endDate: { $gte: now } }
        ]
      }
    ];
  }

  return conditions;
};

// ---------- Controllers ----------

export const createDiamondPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const payload = validateDiamondPromotionPayload(req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Promotion image is required'
      });
    }

    const image = {
      url: req.file.path,
      publicId: req.file.filename
    };

    // Set default currentStock if not provided
    if (!payload.unlimitedStock && payload.totalStock !== undefined && payload.currentStock === undefined) {
      payload.currentStock = payload.totalStock;
    }

    const diamondPromotion = await DiamondPromotion.create({
      merchantId,
      ...payload,
      image
    });

    return res.status(201).json({
      success: true,
      diamondPromotion
    });
  } catch (error) {
    console.error('❌ Create diamond promotion error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create diamond promotion'
    });
  }
};

export const listDiamondPromotions = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions = buildListQuery(merchantId, req.query);

    const [items, total] = await Promise.all([
      DiamondPromotion.find(conditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DiamondPromotion.countDocuments(conditions)
    ]);

    return res.status(200).json({
      success: true,
      diamondPromotions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ List diamond promotions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch diamond promotions'
    });
  }
};

export const getDiamondPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const diamondPromotion = await DiamondPromotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!diamondPromotion) {
      return res.status(404).json({
        success: false,
        error: 'Diamond promotion not found'
      });
    }

    return res.status(200).json({
      success: true,
      diamondPromotion
    });
  } catch (error) {
    console.error('❌ Get diamond promotion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch diamond promotion'
    });
  }
};

export const updateDiamondPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const diamondPromotion = await DiamondPromotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    });

    if (!diamondPromotion) {
      return res.status(404).json({
        success: false,
        error: 'Diamond promotion not found'
      });
    }

    const payload = validateDiamondPromotionPayload(req.body, true);

    // Handle stock updates
    if (payload.unlimitedStock) {
      payload.totalStock = undefined;
      payload.currentStock = undefined;
    } else {
      // If totalStock is being updated, adjust currentStock if needed
      if (payload.totalStock !== undefined) {
        if (payload.currentStock === undefined) {
          // If currentStock not provided, keep existing or set to new totalStock if it's less
          payload.currentStock = Math.min(diamondPromotion.currentStock || 0, payload.totalStock);
        } else if (payload.currentStock > payload.totalStock) {
          throw new Error('Current stock cannot exceed total stock');
        }
      }
    }

    // Handle overall redemption limit
    if (!payload.setOverallRedemptionLimit) {
      payload.overallRedemptionLimit = undefined;
    }

    // Handle locations
    if (payload.allShops) {
      payload.locations = [];
    }

    // Handle tiers
    if (payload.allTiers) {
      payload.tiers = [];
    }

    Object.assign(diamondPromotion, payload);

    if (req.file) {
      if (diamondPromotion.image && diamondPromotion.image.publicId) {
        try {
          await deleteFromCloudinary(diamondPromotion.image.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error for diamond promotion', diamondPromotion._id, cloudinaryError);
        }
      }
      diamondPromotion.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    await diamondPromotion.save();

    return res.status(200).json({
      success: true,
      diamondPromotion
    });
  } catch (error) {
    console.error('❌ Update diamond promotion error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update diamond promotion'
    });
  }
};

export const deleteDiamondPromotion = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { promotionId } = req.params;

    const diamondPromotion = await DiamondPromotion.findOne({
      _id: promotionId,
      merchantId,
      isDeleted: false
    });

    if (!diamondPromotion) {
      return res.status(404).json({
        success: false,
        error: 'Diamond promotion not found'
      });
    }

    diamondPromotion.isDeleted = true;
    await diamondPromotion.save();

    if (diamondPromotion.image && diamondPromotion.image.publicId) {
      try {
        await deleteFromCloudinary(diamondPromotion.image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for diamond promotion', diamondPromotion._id, cloudinaryError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Diamond promotion deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete diamond promotion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete diamond promotion'
    });
  }
};

