import ScratchCard from '../models/scratchCard.js';
import { deleteFromCloudinary } from '../utils/helpers.js';

const REWARD_TYPES = ['fixed_points', 'random_points', 'discount', 'free_item', 'try_again'];

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

const calculateEndDate = (startDate, durationWeeks) => {
  if (!startDate || !durationWeeks) return null;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (durationWeeks * 7));
  return endDate;
};

const validateScratchCardPayload = (body, isUpdate = false) => {
  const errors = [];

  const cardName = body.cardName?.toString().trim();
  const campaignTitle = body.campaignTitle?.toString().trim();

  if (!isUpdate || cardName !== undefined) {
    if (!cardName || cardName.length < 2) errors.push('Card name must be at least 2 characters');
    if (cardName && cardName.length > 120) errors.push('Card name cannot exceed 120 characters');
  }

  if (!isUpdate || campaignTitle !== undefined) {
    if (!campaignTitle || campaignTitle.length < 2) errors.push('Campaign title must be at least 2 characters');
    if (campaignTitle && campaignTitle.length > 160) errors.push('Campaign title cannot exceed 160 characters');
  }

  // Required points validation
  let requiredPoints;
  if (body.requiredPoints !== undefined) {
    requiredPoints = Number(body.requiredPoints);
    if (Number.isNaN(requiredPoints) || requiredPoints <= 0) {
      errors.push('Required points must be a positive number');
    }
  } else if (!isUpdate) {
    errors.push('Required points is mandatory');
  }

  // Duration validation
  let durationWeeks;
  if (body.durationWeeks !== undefined) {
    durationWeeks = Number(body.durationWeeks);
    if (Number.isNaN(durationWeeks) || durationWeeks < 1 || durationWeeks > 520) {
      errors.push('Duration must be between 1 and 520 weeks');
    }
  } else if (!isUpdate) {
    errors.push('Duration is mandatory');
  }

  // Status validation
  const status = body.status?.toString().toLowerCase().trim();
  if (status && !['draft', 'scheduled', 'active', 'paused', 'expired'].includes(status)) {
    errors.push('Invalid status. Must be one of: draft, scheduled, active, paused, expired');
  }

  // Reward type validation
  const rewardType = body.rewardType?.toString().toLowerCase().trim();
  if (!isUpdate || rewardType !== undefined) {
    if (!rewardType || !REWARD_TYPES.includes(rewardType)) {
      errors.push(`Reward type must be one of: ${REWARD_TYPES.join(', ')}`);
    }
  }

  // Conditional validation based on reward type
  if (rewardType) {
    if (rewardType === 'fixed_points') {
      const fixedPointsAmount = body.fixedPointsAmount !== undefined ? Number(body.fixedPointsAmount) : null;
      if (fixedPointsAmount === null || Number.isNaN(fixedPointsAmount) || fixedPointsAmount < 0) {
        errors.push('Fixed points amount is required and must be a non-negative number');
      }
    } else if (rewardType === 'random_points') {
      const minPoints = body.minPoints !== undefined ? Number(body.minPoints) : null;
      const maxPoints = body.maxPoints !== undefined ? Number(body.maxPoints) : null;
      if (minPoints === null || Number.isNaN(minPoints) || minPoints < 0) {
        errors.push('Minimum points is required and must be a non-negative number');
      }
      if (maxPoints === null || Number.isNaN(maxPoints) || maxPoints < 0) {
        errors.push('Maximum points is required and must be a non-negative number');
      }
      if (minPoints !== null && maxPoints !== null && minPoints >= maxPoints) {
        errors.push('Maximum points must be greater than minimum points');
      }
    } else if (rewardType === 'discount') {
      const discountPercentage = body.discountPercentage !== undefined ? Number(body.discountPercentage) : null;
      if (discountPercentage === null || Number.isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        errors.push('Discount percentage is required and must be between 0 and 100');
      }
    } else if (rewardType === 'free_item') {
      const freeItemDescription = body.freeItemDescription?.toString().trim();
      if (!freeItemDescription || freeItemDescription.length === 0) {
        errors.push('Free item description is required');
      }
      if (freeItemDescription && freeItemDescription.length > 200) {
        errors.push('Free item description cannot exceed 200 characters');
      }
    }
    // 'try_again' requires no additional fields
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('. '));
    err.statusCode = 400;
    throw err;
  }

  // Build normalized payload
  const payload = {};
  if (cardName !== undefined) payload.cardName = cardName;
  if (campaignTitle !== undefined) payload.campaignTitle = campaignTitle;
  if (requiredPoints !== undefined) payload.requiredPoints = requiredPoints;
  if (durationWeeks !== undefined) payload.durationWeeks = durationWeeks;
  if (status) payload.status = status;
  payload.infinityActive = normalizeBoolean(body.infinityActive, false);
  if (rewardType) payload.rewardType = rewardType;
  payload.isVIPOnly = normalizeBoolean(body.isVIPOnly, false);

  // Set conditional fields based on reward type
  if (rewardType === 'fixed_points') {
    payload.fixedPointsAmount = Number(body.fixedPointsAmount);
    payload.minPoints = undefined;
    payload.maxPoints = undefined;
    payload.discountPercentage = undefined;
    payload.freeItemDescription = undefined;
  } else if (rewardType === 'random_points') {
    payload.minPoints = Number(body.minPoints);
    payload.maxPoints = Number(body.maxPoints);
    payload.fixedPointsAmount = undefined;
    payload.discountPercentage = undefined;
    payload.freeItemDescription = undefined;
  } else if (rewardType === 'discount') {
    payload.discountPercentage = Number(body.discountPercentage);
    payload.fixedPointsAmount = undefined;
    payload.minPoints = undefined;
    payload.maxPoints = undefined;
    payload.freeItemDescription = undefined;
  } else if (rewardType === 'free_item') {
    payload.freeItemDescription = body.freeItemDescription?.toString().trim();
    payload.fixedPointsAmount = undefined;
    payload.minPoints = undefined;
    payload.maxPoints = undefined;
    payload.discountPercentage = undefined;
  } else if (rewardType === 'try_again') {
    payload.fixedPointsAmount = undefined;
    payload.minPoints = undefined;
    payload.maxPoints = undefined;
    payload.discountPercentage = undefined;
    payload.freeItemDescription = undefined;
  }

  // Calculate dates from duration
  if (durationWeeks && body.startDate) {
    const startDate = parseDateOrNull(body.startDate);
    if (startDate) {
      payload.startDate = startDate;
      payload.endDate = calculateEndDate(startDate, durationWeeks);
    }
  } else if (body.startDate) {
    payload.startDate = parseDateOrNull(body.startDate);
  }

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
      { startDate: { $lte: now }, endDate: { $gte: now } }
    ];
  }

  return conditions;
};

// ---------- Controllers ----------

export const createScratchCard = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const payload = validateScratchCardPayload(req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Card image is required'
      });
    }

    const cardImage = {
      url: req.file.path,
      publicId: req.file.filename
    };

    // If startDate not provided, use current date
    if (!payload.startDate) {
      payload.startDate = new Date();
      if (payload.durationWeeks) {
        payload.endDate = calculateEndDate(payload.startDate, payload.durationWeeks);
      }
    }

    const scratchCard = await ScratchCard.create({
      merchantId,
      ...payload,
      cardImage
    });

    return res.status(201).json({
      success: true,
      scratchCard
    });
  } catch (error) {
    console.error('Create scratch card error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create scratch card'
    });
  }
};

export const listScratchCards = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions = buildListQuery(merchantId, req.query);

    const [items, total] = await Promise.all([
      ScratchCard.find(conditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScratchCard.countDocuments(conditions)
    ]);

    return res.status(200).json({
      success: true,
      scratchCards: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List scratch cards error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scratch cards'
    });
  }
};

export const getScratchCard = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { cardId } = req.params;

    const scratchCard = await ScratchCard.findOne({
      _id: cardId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!scratchCard) {
      return res.status(404).json({
        success: false,
        error: 'Scratch card not found'
      });
    }

    return res.status(200).json({
      success: true,
      scratchCard
    });
  } catch (error) {
    console.error('Get scratch card error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scratch card'
    });
  }
};

export const updateScratchCard = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { cardId } = req.params;

    const scratchCard = await ScratchCard.findOne({
      _id: cardId,
      merchantId,
      isDeleted: false
    });

    if (!scratchCard) {
      return res.status(404).json({
        success: false,
        error: 'Scratch card not found'
      });
    }

    const payload = validateScratchCardPayload(req.body, true);
    
    // Recalculate endDate if durationWeeks or startDate changed
    if (payload.durationWeeks !== undefined || payload.startDate !== undefined) {
      const startDate = payload.startDate || scratchCard.startDate;
      const durationWeeks = payload.durationWeeks || scratchCard.durationWeeks;
      if (startDate && durationWeeks) {
        payload.endDate = calculateEndDate(startDate, durationWeeks);
      }
    }

    Object.assign(scratchCard, payload);

    if (req.file) {
      if (scratchCard.cardImage && scratchCard.cardImage.publicId) {
        try {
          await deleteFromCloudinary(scratchCard.cardImage.publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error for scratch card', scratchCard._id, cloudinaryError);
        }
      }
      scratchCard.cardImage = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    await scratchCard.save();

    return res.status(200).json({
      success: true,
      scratchCard
    });
  } catch (error) {
    console.error('Update scratch card error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to update scratch card'
    });
  }
};

export const deleteScratchCard = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { cardId } = req.params;

    const scratchCard = await ScratchCard.findOne({
      _id: cardId,
      merchantId,
      isDeleted: false
    });

    if (!scratchCard) {
      return res.status(404).json({
        success: false,
        error: 'Scratch card not found'
      });
    }

    scratchCard.isDeleted = true;
    await scratchCard.save();

    if (scratchCard.cardImage && scratchCard.cardImage.publicId) {
      try {
        await deleteFromCloudinary(scratchCard.cardImage.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error for scratch card', scratchCard._id, cloudinaryError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Scratch card deleted successfully'
    });
  } catch (error) {
    console.error('Delete scratch card error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete scratch card'
    });
  }
};

