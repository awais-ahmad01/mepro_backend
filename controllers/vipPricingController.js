import VIPMembershipPricing from '../models/vipMembershipPricing.js';

// Get VIP Membership Pricing
export const getVIPPricing = async (req, res) => {
  try {
    const merchantId = req.user.id;

    let pricing = await VIPMembershipPricing.findOne({ merchantId });

    // If no pricing exists, return default structure
    if (!pricing) {
      return res.status(200).json({
        success: true,
        pricing: {
          price: 0,
          duration: 'year',
          currency: 'GBP'
        },
        message: 'No pricing configured yet'
      });
    }

    return res.status(200).json({
      success: true,
      pricing: {
        price: pricing.price,
        duration: pricing.duration,
        currency: pricing.currency || 'GBP'
      }
    });
  } catch (error) {
    console.error('Get VIP pricing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch VIP pricing'
    });
  }
};

// Save/Update VIP Membership Pricing
export const updateVIPPricing = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { price, duration, currency } = req.body;

    // Validation
    if (price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid non-negative number'
      });
    }

    const validDurations = ['month', 'quarter', 'year'];
    const durationValue = duration?.toLowerCase() || 'year';
    if (!validDurations.includes(durationValue)) {
      return res.status(400).json({
        success: false,
        error: `Duration must be one of: ${validDurations.join(', ')}`
      });
    }

    // Find or create pricing
    let pricing = await VIPMembershipPricing.findOne({ merchantId });

    if (pricing) {
      // Update existing
      pricing.price = priceNum;
      pricing.duration = durationValue;
      pricing.currency = currency?.toUpperCase() || 'GBP';
      await pricing.save();
    } else {
      // Create new
      pricing = await VIPMembershipPricing.create({
        merchantId,
        price: priceNum,
        duration: durationValue,
        currency: currency?.toUpperCase() || 'GBP'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'VIP pricing saved successfully',
      pricing: {
        price: pricing.price,
        duration: pricing.duration,
        currency: pricing.currency
      }
    });
  } catch (error) {
    console.error('Update VIP pricing error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Pricing already exists for this merchant'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to save VIP pricing'
    });
  }
};

