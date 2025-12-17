import LoyaltyProgram from '../models/loyaltyProgram.js';
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

const validateLoyaltyProgramPayload = (body, isUpdate = false) => {
  const errors = [];

  const title = body.title?.toString().trim();
  const description = body.description?.toString().trim();

  if (!isUpdate || title !== undefined) {
    if (!title || title.length < 2) errors.push('Program name must be at least 2 characters');
    if (title && title.length > 160) errors.push('Program name cannot exceed 160 characters');
  }

  if (!isUpdate || description !== undefined) {
    if (!description || description.length < 10) errors.push('Program description must be at least 10 characters');
    if (description && description.length > 1000) errors.push('Program description cannot exceed 1000 characters');
  }

  // Earning rules validation
  let earnPoints;
  if (body.earnPoints !== undefined) {
    earnPoints = Number(body.earnPoints);
    if (Number.isNaN(earnPoints) || earnPoints <= 0) {
      errors.push('Earn points must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Earn points is mandatory');
  }

  let perAmountSpent;
  if (body.perAmountSpent !== undefined) {
    perAmountSpent = Number(body.perAmountSpent);
    if (Number.isNaN(perAmountSpent) || perAmountSpent <= 0) {
      errors.push('Per amount spent must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Per amount spent is mandatory');
  }

  // Redemption rules validation
  let pointsRequired;
  if (body.pointsRequired !== undefined) {
    pointsRequired = Number(body.pointsRequired);
    if (Number.isNaN(pointsRequired) || pointsRequired <= 0) {
      errors.push('Points required must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Points required is mandatory');
  }

  const benefitReward = body.benefitReward?.toString().trim();
  if (!isUpdate || benefitReward !== undefined) {
    if (!benefitReward || benefitReward.length === 0) {
      errors.push('Benefit/Reward is mandatory');
    }
    if (benefitReward && benefitReward.length > 200) {
      errors.push('Benefit/Reward cannot exceed 200 characters');
    }
  }

  // Location validation
  const allShops = normalizeBoolean(body.allShops, false);
  let locations = [];
  if (!allShops) {
    if (body.locations) {
      if (Array.isArray(body.locations)) {
        locations = body.locations.map(l => l?.toString().trim()).filter(Boolean);
      } else if (typeof body.locations === 'string') {
        locations = [body.locations.trim()];
      }
    }
    if (!isUpdate && locations.length === 0) {
      errors.push('At least one location is required when "All Shops" is disabled');
    }
  }

  // Tier validation
  const allTiers = normalizeBoolean(body.allTiers, false);
  let tiers = [];
  if (!allTiers) {
    if (body.tiers) {
      if (Array.isArray(body.tiers)) {
        tiers = body.tiers.map(t => t?.toString().toLowerCase().trim()).filter(Boolean);
      } else if (typeof body.tiers === 'string') {
        tiers = body.tiers.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }
      const invalidTiers = tiers.filter(t => !TIER_VALUES.includes(t));
      if (invalidTiers.length > 0) {
        errors.push(`Invalid tier values: ${invalidTiers.join(', ')}`);
      }
    }
    if (!isUpdate && tiers.length === 0) {
      errors.push('At least one tier is required when "All Tiers" is disabled');
    }
  }

  // Approval method
  let approvalMethod = body.approvalMethod?.toString().toLowerCase().trim();
  if (body.instore !== undefined || body.online !== undefined) {
    const instore = normalizeBoolean(body.instore, false);
    const online = normalizeBoolean(body.online, false);
    if (instore && online) {
      approvalMethod = 'online'; // Default to online if both selected
    } else if (instore) {
      approvalMethod = 'instore';
    } else if (online) {
      approvalMethod = 'online';
    }
  }
  if (!approvalMethod || !['instore', 'online'].includes(approvalMethod)) {
    approvalMethod = 'online';
  }

  // Stock validation
  const unlimitedStock = normalizeBoolean(body.unlimitedStock, false);
  let totalStock = null;
  let currentStock = null;
  if (!unlimitedStock) {
    if (body.totalStock !== undefined) {
      totalStock = Number(body.totalStock);
      if (Number.isNaN(totalStock) || totalStock < 0) {
        errors.push('Total stock must be a non-negative number');
      }
    } else if (!isUpdate) {
      errors.push('Total stock is required when "Unlimited Stock" is disabled');
    }
    if (body.currentStock !== undefined) {
      currentStock = Number(body.currentStock);
      if (Number.isNaN(currentStock) || currentStock < 0) {
        errors.push('Current stock must be a non-negative number');
      }
    }
    if (totalStock !== null && currentStock !== null && currentStock > totalStock) {
      errors.push('Current stock cannot exceed total stock');
    }
    if (totalStock !== null && currentStock === null) {
      currentStock = totalStock; // Initialize current stock to total stock
    }
  }

  // Schedule validation
  const allTime = normalizeBoolean(body.allTime, false);
  let startDate = parseDateOrNull(body.startDate);
  let endDate = parseDateOrNull(body.endDate);

  if (!allTime) {
    if (!isUpdate && !startDate) {
      errors.push('Start date is required when "All Time" is disabled');
    }
    if (!isUpdate && !endDate) {
      errors.push('End date is required when "All Time" is disabled');
    }
    if (startDate && endDate && startDate > endDate) {
      errors.push('Start date must be before or equal to end date');
    }
  }

  // Status validation
  const status = body.status?.toString().toLowerCase().trim();
  if (status && !['draft', 'scheduled', 'active', 'paused', 'expired'].includes(status)) {
    errors.push('Invalid status. Must be one of: draft, scheduled, active, paused, expired');
  }

  // Rest days validation
  let restDays = [];
  if (body.restDays) {
    if (Array.isArray(body.restDays)) {
      restDays = body.restDays.map(d => d?.toString().toLowerCase().trim()).filter(Boolean);
    } else if (typeof body.restDays === 'string') {
      restDays = body.restDays.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    }
    const invalidDays = restDays.filter(d => !WEEK_DAYS.includes(d));
    if (invalidDays.length > 0) {
      errors.push(`Invalid rest days: ${invalidDays.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }

  // Build normalized payload
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (earnPoints !== undefined) payload.earnPoints = earnPoints;
  if (perAmountSpent !== undefined) payload.perAmountSpent = perAmountSpent;
  if (pointsRequired !== undefined) payload.pointsRequired = pointsRequired;
  if (benefitReward !== undefined) payload.benefitReward = benefitReward;
  payload.allShops = allShops;
  if (!allShops) payload.locations = locations;
  payload.allTiers = allTiers;
  if (!allTiers) payload.tiers = tiers;
  payload.approvalMethod = approvalMethod;
  payload.unlimitedStock = unlimitedStock;
  if (totalStock !== null) payload.totalStock = totalStock;
  if (currentStock !== null) payload.currentStock = currentStock;
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

export const createLoyaltyProgram = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const payload = validateLoyaltyProgramPayload(req.body);

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

    const program = await LoyaltyProgram.create({
      merchantId,
      ...payload,
      image
    });

    return res.status(201).json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Create loyalty program error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create loyalty program'
    });
  }
};

export const listLoyaltyPrograms = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions = buildListQuery(merchantId, req.query);

    const [items, total] = await Promise.all([
      LoyaltyProgram.find(conditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyProgram.countDocuments(conditions)
    ]);

    return res.status(200).json({
      success: true,
      programs: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List loyalty programs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch loyalty programs'
    });
  }
};

export const getLoyaltyProgram = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { programId } = req.params;

    const program = await LoyaltyProgram.findOne({
      _id: programId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Loyalty program not found'
      });
    }

    return res.status(200).json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Get loyalty program error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch loyalty program'
    });
  }
};

export const updateLoyaltyProgram = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { programId } = req.params;

    const program = await LoyaltyProgram.findOne({
      _id: programId,
      merchantId,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Loyalty program not found'
      });
    }

    const payload = validateLoyaltyProgramPayload(req.body, true);
    Object.assign(program, payload);

    if (req.file) {
      if (program.image && program.image.publicId) {
        try {
          await deleteFromCloudinary(program.image.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error for loyalty program', program._id, cloudinaryError);
        }
      }
      program.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    await program.save();

    return res.status(200).json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Update loyalty program error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to update loyalty program'
    });
  }
};

export const deleteLoyaltyProgram = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { programId } = req.params;

    const program = await LoyaltyProgram.findOne({
      _id: programId,
      merchantId,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Loyalty program not found'
      });
    }

    program.isDeleted = true;
    await program.save();

    if (program.image && program.image.publicId) {
      try {
        await deleteFromCloudinary(program.image.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for loyalty program', program._id, cloudinaryError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Loyalty program deleted successfully'
    });
  } catch (error) {
    console.error('Delete loyalty program error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete loyalty program'
    });
  }
};

