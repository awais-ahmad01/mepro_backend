import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';



// Service categories and their common services (for suggestions)
const SERVICE_CATEGORIES = {
  food_beverage: [
    'Dine In', 'Take Away', 'Delivery', 'Catering', 'Alcohol Service',
    'Outdoor Seating', 'Reservations', 'Private Dining'
  ],
  retail_shopping: [
    'In-Store Shopping', 'Online Orders', 'Home Delivery', 'Click & Collect',
    'Personal Shopping', 'Gift Wrapping', 'Returns Accepted'
  ],
  beauty_self_care: [
    'Hair Services', 'Nail Services', 'Skincare', 'Massage', 'Spa Treatments',
    'Makeup', 'Waxing', 'Men\'s Grooming'
  ],
  entertainment: [
    'Live Music', 'Comedy Shows', 'Theater', 'Cinema', 'Arcade Games',
    'Bowling', 'Karaoke', 'Private Events'
  ],
  travel_hospitality: [
    'Room Booking', 'Event Venue', 'Conference Facilities', 'Airport Transfer',
    'Tour Guide', 'Car Rental', 'Travel Insurance'
  ],
  tech_learning: [
    'Workshops', 'Online Courses', 'Tutoring', 'Equipment Rental',
    'Tech Support', 'Software Training', 'Certification'
  ],
  car_home_services: [
    'Car Repair', 'Home Cleaning', 'Plumbing', 'Electrical', 'Gardening',
    'Moving Services', 'Pest Control', 'Handyman'
  ]
};



// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateJWT = (userId, userType, status) => {
  return jwt.sign(
    {
      userId: userId,
      userType: userType,
      status: status, // Include status in token
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    process.env.JWT_SECRET
  );
};


 // Generate temporary token for password setup
export const generateTempToken = (userId, userType) => {
  return jwt.sign(
    { id: userId, type: userType, temp: true },
    process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    { expiresIn: '15m' } // Short-lived for password setup
  );
};





// Add this helper function at the top of the file (after imports)
export const getTimeInMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Then use it in both saveStepData and saveOpeningHours functions

// Helper: Validate step data
export const validateStepData = (step, data) => {
  switch (step) {
    case 1:
      if (!data.legalBusinessName || data.legalBusinessName.trim().length < 2) {
        throw new Error('Legal business name is required (min 2 characters)');
      }
      if (!data.aboutBusiness || data.aboutBusiness.trim().length < 10) {
        throw new Error('Business description is required (min 10 characters)');
      }
      if (!data.businessStructure) {
        throw new Error('Business structure is required');
      }
      if (!['sole_trader', 'limited_company', 'partnership', 'limited_liability_partnership'].includes(data.businessStructure)) {
        throw new Error('Invalid business structure selected');
      }
      break;
      
    case 2:
      if (!data.primaryContactName || data.primaryContactName.trim().length < 2) {
        throw new Error('Primary contact name is required');
      }
      if (!data.businessPhone || data.businessPhone.trim().length < 5) {
        throw new Error('Business phone number is required');
      }
      // Validate email format if provided
      if (data.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.businessEmail)) {
        throw new Error('Invalid business email format');
      }
      break;
      
    case 3:
      if (!data.address?.postcode || data.address.postcode.trim().length < 3) {
        throw new Error('Postcode is required');
      }
      if (!data.address?.street || data.address.street.trim().length < 2) {
        throw new Error('Street name is required');
      }
      if (!data.address?.townCity || data.address.townCity.trim().length < 2) {
        throw new Error('Town/City is required');
      }
      break;
      
    case 4:
       // Opening hours validation
      if (!data.openingHours || typeof data.openingHours !== 'object') {
        throw new Error('Opening hours data is required');
      }
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      days.forEach(day => {
        const dayData = data.openingHours[day];
        if (dayData) {
          // If not closed, must have opening and closing times
          if (dayData.isClosed !== true) {
            if (!dayData.openingTime || !dayData.closingTime) {
              throw new Error(`${day} must have both opening and closing times when not closed`);
            }
            
            if (!timeRegex.test(dayData.openingTime) || !timeRegex.test(dayData.closingTime)) {
              throw new Error(`${day} times must be in HH:MM format (24-hour)`);
            }
            
            // Validate opening time is before closing time
            const getTimeInMinutes = (timeStr) => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              return hours * 60 + minutes;
            };
            
            const openTime = getTimeInMinutes(dayData.openingTime);
            const closeTime = getTimeInMinutes(dayData.closingTime);
            
            if (openTime >= closeTime) {
              throw new Error(`${day} closing time must be after opening time`);
            }
            
            // Validate breaks if they exist
            if (Array.isArray(dayData.breaks)) {
              dayData.breaks.forEach((breakSlot, index) => {
                if (breakSlot.start && breakSlot.end) {
                  if (!timeRegex.test(breakSlot.start) || !timeRegex.test(breakSlot.end)) {
                    throw new Error(`${day} break ${index + 1} times must be in HH:MM format`);
                  }
                  
                  const breakStart = getTimeInMinutes(breakSlot.start);
                  const breakEnd = getTimeInMinutes(breakSlot.end);
                  
                  if (breakStart >= breakEnd) {
                    throw new Error(`${day} break ${index + 1} end time must be after start time`);
                  }
                  
                  if (breakStart < openTime || breakEnd > closeTime) {
                    throw new Error(`${day} break ${index + 1} must be within opening hours`);
                  }
                }
              });
            }
          }
        }
      });
      break;
      
      
    case 5:
      if (!data.businessCategory) {
        throw new Error('Business category is required');
      }
      // if (!SERVICE_CATEGORIES[data.businessCategory]) {
      //   throw new Error('Invalid business category selected');
      // }
      if (!data.services || data.services.length === 0) {
        throw new Error('At least one service must be selected');
      }
      // Validate each service
      data.services.forEach((service, index) => {
        if (!service.name || service.name.trim().length === 0) {
          throw new Error(`Service at position ${index + 1} must have a name`);
        }
      });
      break;
      
    case 6:
      if (!data.loyaltyTiers?.bronze || !data.loyaltyTiers?.silver || !data.loyaltyTiers?.gold) {
        throw new Error('All loyalty tiers are required');
      }
      // Validate tier progression
     const bronze = parseInt(data.loyaltyTiers.bronze);
const silver = parseInt(data.loyaltyTiers.silver);
const gold = parseInt(data.loyaltyTiers.gold);
const platinum = parseInt(data.loyaltyTiers.platinum);
const champion = parseInt(data.loyaltyTiers.champion);
const ultimate = parseInt(data.loyaltyTiers.ultimate);
      
      
      if (isNaN(bronze) || isNaN(silver) || isNaN(gold)) {
        throw new Error('Tier points must be numbers');
      }
      if (bronze <= 0 || silver <= 0 || gold <= 0 || platinum <=0 || champion <=0 || ultimate <=0) {
        throw new Error('Tier points must be positive numbers');
      }
      if (
  bronze >= silver ||
  silver >= gold ||
  gold >= platinum ||
  platinum >= champion ||
  champion >= ultimate
) {
  throw new Error("Tier points must increase: bronze < silver < gold < platinum < champion < ultimate");
}
      break;
  }
};

// Helper: Prepare response with next steps
// Update prepareResponse function
export const prepareResponse = (profile) => {
  const response = {
    success: true,
    profile: {
      registrationStep: profile.registrationStep,
      isRegistrationComplete: profile.isRegistrationComplete,
      lastSavedAt: profile.lastSavedAt,
      // Add admin status for clarity
      adminStatus: profile.adminStatus,
      // Add submission info if exists
      submittedAt: profile.submittedAt
    }
  };
  
  // Include saved data for the current step - UPDATED FIELD NAMES
  switch (profile.registrationStep) {
    case 1:
      response.profile.step1 = {
        legalBusinessName: profile.legalBusinessName,
        aboutBusiness: profile.aboutBusiness,
        businessStructure: profile.businessStructure
      };
      break;
    case 2:
      response.profile.step2 = {
        primaryContactName: profile.primaryContactName,
        businessEmail: profile.businessEmail,
        businessPhone: profile.businessPhone,
        website: profile.website,
        socialMedia: profile.socialMedia
      };
      break;
    case 3:
      response.profile.step3 = {
        address: profile.address
      };
      break;
    case 4:
      response.profile.step4 = {
        openingHours: profile.openingHours // FIXED: openingHours not branding
      };
      break;
    case 5:
      response.profile.step5 = {
        businessCategory: profile.businessCategory, // FIXED
        earningRate: profile.earningRate, // FIXED
        services: profile.services,
        suggestedServices: SERVICE_CATEGORIES[profile.businessCategory] || []
      };
      break;
    case 6:
      response.profile.step6 = {
        loyaltyTiers: profile.loyaltyTiers
      };
      break;
  }
  
  return response;
};



// Helper function to upload to Cloudinary (optimized for mobile)
export const uploadToCloudinary = async (filePath, folder, fileName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `merchant-branding/${folder}`,
      public_id: fileName,
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    // Delete temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    // Clean up temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

// Helper to delete from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn('Cloudinary delete warning:', error.message);
    // Non-critical error
  }
};




export const getNextAction = (status, profile, isRegistrationComplete) => {
  switch (status) {
    case 'pending_verification':
      return { type: 'verify_email', message: 'Verify your email' };
    
    case 'pending_password':
      return { type: 'set_password', message: 'Set your password' };
    
    case 'pending_approval':
      if (!profile) {
        return { type: 'start_registration', message: 'Start business registration' };
      } else if (!isRegistrationComplete) {
        return { 
          type: 'continue_registration', 
          message: `Continue registration from step ${profile.registrationStep}` 
        };
      } else {
        return { type: 'wait_approval', message: 'Waiting for admin approval' };
      }
    
    case 'active':
      return { type: 'access_dashboard', message: 'Go to dashboard' };
    
    case 'rejected':
      return { type: 'contact_support', message: 'Application rejected, contact support' };
    
    default:
      return { type: 'unknown', message: 'Unknown status' };
  }
};