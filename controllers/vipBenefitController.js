import VIPBenefit from '../models/vipBenefit.js';

const BENEFIT_TYPES = [
  'vip_enrolment_bonus',
  'double_point_days',
  'triple_point_days',
  'birthday_free_gift',
  'scratch_card_access',
  'first_look_access',
  'bonus_redemption_rate'
];

const normalizeBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
};

// Helper to build benefit data based on type
const buildBenefitData = (body, merchantId) => {
  const { benefitType, storeId, allStores, bonusPoints, daysBeforeBirthday, giftPointsValue, pointReduction, status, sortOrder } = body;

  const data = {
    merchantId,
    benefitType,
    allStores: normalizeBoolean(allStores, false),
    status: status || 'active',
    sortOrder: sortOrder || 0
  };

  // Handle store selection
  if (data.allStores) {
    data.storeId = null;
  } else if (storeId) {
    data.storeId = typeof storeId === 'string' ? storeId.trim() : storeId;
  } else {
    data.storeId = null;
  }

  // Type-specific fields (store as-is, frontend handles validation)
  if (benefitType === 'vip_enrolment_bonus' && bonusPoints !== undefined) {
    data.bonusPoints = Number(bonusPoints) || 0;
  }

  if (benefitType === 'birthday_free_gift') {
    if (daysBeforeBirthday !== undefined) {
      data.daysBeforeBirthday = Number(daysBeforeBirthday) || 30;
    }
    if (giftPointsValue !== undefined) {
      data.giftPointsValue = Number(giftPointsValue) || null;
    }
  }

  if (benefitType === 'bonus_redemption_rate' && pointReduction !== undefined) {
    data.pointReduction = Number(pointReduction) || 0;
  }

  return data;
};

// Create VIP Benefit
export const createVIPBenefit = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { benefitType } = req.body;

    if (!benefitType || !BENEFIT_TYPES.includes(benefitType)) {
      return res.status(400).json({
        success: false,
        error: `Benefit type is required and must be one of: ${BENEFIT_TYPES.join(', ')}`
      });
    }

    const benefitData = buildBenefitData(req.body, merchantId);
    const benefit = await VIPBenefit.create(benefitData);

    return res.status(201).json({
      success: true,
      message: 'VIP benefit created successfully',
      benefit
    });
  } catch (error) {
    console.error('Create VIP benefit error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create VIP benefit'
    });
  }
};

// List VIP Benefits
export const listVIPBenefits = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { status, benefitType } = req.query;

    const conditions = {
      merchantId,
      isDeleted: false
    };

    if (status) {
      conditions.status = status;
    }

    if (benefitType && BENEFIT_TYPES.includes(benefitType)) {
      conditions.benefitType = benefitType;
    }

    const benefits = await VIPBenefit.find(conditions)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      benefits,
      count: benefits.length
    });
  } catch (error) {
    console.error('List VIP benefits error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch VIP benefits'
    });
  }
};

// Get Single VIP Benefit
export const getVIPBenefit = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { benefitId } = req.params;

    const benefit = await VIPBenefit.findOne({
      _id: benefitId,
      merchantId,
      isDeleted: false
    }).lean();

    if (!benefit) {
      return res.status(404).json({
        success: false,
        error: 'VIP benefit not found'
      });
    }

    return res.status(200).json({
      success: true,
      benefit
    });
  } catch (error) {
    console.error('Get VIP benefit error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid benefit ID'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch VIP benefit'
    });
  }
};

// Update VIP Benefit
export const updateVIPBenefit = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { benefitId } = req.params;

    const benefit = await VIPBenefit.findOne({
      _id: benefitId,
      merchantId,
      isDeleted: false
    });

    if (!benefit) {
      return res.status(404).json({
        success: false,
        error: 'VIP benefit not found'
      });
    }

    // If benefit type is being changed, validate it
    if (req.body.benefitType && req.body.benefitType !== benefit.benefitType) {
      if (!BENEFIT_TYPES.includes(req.body.benefitType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid benefit type. Must be one of: ${BENEFIT_TYPES.join(', ')}`
        });
      }
    }

    // Build update data
    const updateData = buildBenefitData(
      { ...req.body, benefitType: req.body.benefitType || benefit.benefitType },
      merchantId
    );

    // Remove merchantId from update (shouldn't change)
    delete updateData.merchantId;

    // Update fields
    Object.assign(benefit, updateData);
    await benefit.save();

    return res.status(200).json({
      success: true,
      message: 'VIP benefit updated successfully',
      benefit
    });
  } catch (error) {
    console.error('Update VIP benefit error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid benefit ID'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update VIP benefit'
    });
  }
};

// Delete VIP Benefit (Soft Delete)
export const deleteVIPBenefit = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { benefitId } = req.params;

    const benefit = await VIPBenefit.findOne({
      _id: benefitId,
      merchantId,
      isDeleted: false
    });

    if (!benefit) {
      return res.status(404).json({
        success: false,
        error: 'VIP benefit not found'
      });
    }

    // Soft delete
    benefit.isDeleted = true;
    await benefit.save();

    return res.status(200).json({
      success: true,
      message: 'VIP benefit deleted successfully'
    });
  } catch (error) {
    console.error('Delete VIP benefit error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid benefit ID'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to delete VIP benefit'
    });
  }
};

