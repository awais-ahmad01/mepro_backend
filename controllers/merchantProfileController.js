import MerchantProfile from '../models/merchantProfile.js';
import User from '../models/user.js';
import fs from 'fs';
import { validateStepData, prepareResponse, getTimeInMinutes, 
  uploadToCloudinary, deleteFromCloudinary, getNextAction } from '../utils/helpers.js';

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




// 1. Get Current Registration Progress
export const getRegistrationProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📋 Fetching registration progress for user: ${userId}`);
    
    let profile = await MerchantProfile.findOne({ userId })
      .select('-__v -createdAt -updatedAt');
    
    // If no profile exists, create one
    if (!profile) {
      profile = await MerchantProfile.create({ userId });
      console.log(`✅ Created new merchant profile for user: ${userId}`);
    }
    
    // Get user status to determine if they can continue
    const user = await User.findById(userId).select('status');
    
    console.log("user:", user);
    
    // Check if user is at correct stage
    // UPDATE: Allow access if status is 'pending_approval' OR 'active'
    if (!['pending_approval', 'active'].includes(user.status)) {
      return res.status(400).json({
        success: false,
        error: 'Complete password setup first',
        requiredAction: 'set_password'
      });
    }
    
    // LOGIC FIX: If registration was marked complete but user is not at step 6,
    // it means they navigated back - mark as incomplete
    if (profile.isRegistrationComplete && profile.registrationStep < 6) {
      console.log(`⚠️ Registration marked complete but user at step ${profile.registrationStep} - fixing status`);
      profile.isRegistrationComplete = false;
      profile.adminStatus = 'pending_review';
      await profile.save();
    }
    
    const response = prepareResponse(profile);
    
    console.log("response:", response);
    
    // Add suggested services if on step 5
    if (profile.registrationStep === 5 && profile.businessCategory) {
      response.profile.suggestedServices = SERVICE_CATEGORIES[profile.businessCategory] || [];
    }
    
    console.log(`✅ Returning registration progress for step: ${profile.registrationStep}`);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Get registration progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registration progress'
    });
  }
};

// 2. Save Step Data (Updated for new fields)
export const saveStepData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step } = req.params;
    const data = req.body;
    
    const stepNumber = parseInt(step);
    
    console.log(`💾 Saving step ${stepNumber} data for user: ${userId}`);
    
    if (stepNumber < 1 || stepNumber > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step number. Must be between 1 and 6.'
      });
    }
    
    // Validate user can save this step
    const user = await User.findById(userId);
    if (user.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'Complete password setup first'
      });
    }
    
    // Find or create profile
    let profile = await MerchantProfile.findOne({ userId });
    if (!profile) {
      profile = await MerchantProfile.create({ userId });
    }
    
    // IMPORTANT: If saving a step that's BEFORE the current completed step,
    // mark registration as incomplete and reset submission status
    if (stepNumber < profile.registrationStep && profile.isRegistrationComplete) {
      console.log(`⚠️ Editing step ${stepNumber} (completed registration at step ${profile.registrationStep}) - marking incomplete`);
      profile.isRegistrationComplete = false;
      profile.adminStatus = 'pending_review';
      profile.submittedAt = null;
      
      // Also update the registration step to match what we're editing
      profile.registrationStep = stepNumber;
    }
    
    // Validate data for this step
    try {
      validateStepData(stepNumber, data);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }
    
    // Save data based on step
    switch (stepNumber) {
      case 1:
        profile.legalBusinessName = data.legalBusinessName?.trim();
        profile.aboutBusiness = data.aboutBusiness?.trim();
        profile.businessStructure = data.businessStructure;
        
        // Handle VAT registration
        const isVATRegistered = data.isVATRegistered === true || data.isVATRegistered === 'true' || data.isVATRegistered === 1;
        profile.isVATRegistered = isVATRegistered;
        
        if (isVATRegistered) {
          profile.vatRegistrationNumber = data.vatRegistrationNumber?.trim() || null;
        } else {
          // Clear VAT number if not registered
          profile.vatRegistrationNumber = null;
        }
        break;
        
      case 2:
        profile.primaryContactName = data.primaryContactName?.trim();
        profile.businessEmail = data.businessEmail?.trim().toLowerCase();
        profile.businessPhone = data.businessPhone?.trim();
        profile.website = data.website?.trim();
        
        // Update social media
        if (data.socialMedia) {
          profile.socialMedia = {
            facebook: data.socialMedia.facebook?.trim(),
            instagram: data.socialMedia.instagram?.trim(),
            twitter: data.socialMedia.twitter?.trim(),
            linkedin: data.socialMedia.linkedin?.trim()
          };
        }
        break;
        
      case 3:
        profile.address = {
          postcode: data.address.postcode?.trim(),
          buildingNumber: data.address.buildingNumber?.trim(),
          buildingName: data.address.buildingName?.trim(),
          street: data.address.street?.trim(),
          locality: data.address.locality?.trim(),
          townCity: data.address.townCity?.trim(),
          county: data.address.county?.trim(),
          country: data.address.country?.trim() || 'United Kingdom',
          coordinates: data.address.coordinates || [0, 0]
        };
        break;
        
      case 4:
        // Handle opening hours data with single opening/closing time and multiple breaks
        if (data.openingHours) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          days.forEach(day => {
            if (data.openingHours[day]) {
              const dayData = data.openingHours[day];
              
              // If closed, clear all times and breaks
              if (dayData.isClosed === true) {
                profile.openingHours[day] = {
                  isClosed: true,
                  openingTime: null,
                  closingTime: null,
                  breaks: []
                };
              } else {
                // Validate opening and closing times
                if (!dayData.openingTime || !dayData.closingTime) {
                  throw new Error(`Day ${day} must have both opening and closing times when not closed`);
                }
                
                // Validate time format
                const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(dayData.openingTime) || !timeRegex.test(dayData.closingTime)) {
                  throw new Error(`Day ${day} times must be in HH:MM format (24-hour)`);
                }
                
                // Validate time logic
                const openHour = parseInt(dayData.openingTime.split(':')[0]);
                const openMin = parseInt(dayData.openingTime.split(':')[1]);
                const closeHour = parseInt(dayData.closingTime.split(':')[0]);
                const closeMin = parseInt(dayData.closingTime.split(':')[1]);
                
                const openTime = openHour * 60 + openMin;
                const closeTime = closeHour * 60 + closeMin;
                
                if (openTime >= closeTime) {
                  throw new Error(`Day ${day} closing time must be after opening time`);
                }
                
                // Validate and save breaks
                const validatedBreaks = [];
                if (Array.isArray(dayData.breaks)) {
                  for (const breakSlot of dayData.breaks) {
                    if (breakSlot.start && breakSlot.end) {
                      // Validate time format
                      if (!timeRegex.test(breakSlot.start) || !timeRegex.test(breakSlot.end)) {
                        throw new Error(`Day ${day} break times must be in HH:MM format`);
                      }
                      
                      // Validate break is within opening hours
                      const breakStart = getTimeInMinutes(breakSlot.start);
                      const breakEnd = getTimeInMinutes(breakSlot.end);
                      
                      if (breakStart < openTime || breakEnd > closeTime) {
                        throw new Error(`Day ${day} breaks must be within opening hours (${dayData.openingTime}-${dayData.closingTime})`);
                      }
                      
                      if (breakStart >= breakEnd) {
                        throw new Error(`Day ${day} break end time must be after start time`);
                      }
                      
                      validatedBreaks.push({
                        start: breakSlot.start,
                        end: breakSlot.end
                      });
                    }
                  }
                }
                
                profile.openingHours[day] = {
                  isClosed: false,
                  openingTime: dayData.openingTime,
                  closingTime: dayData.closingTime,
                  breaks: validatedBreaks
                };
              }
            }
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Opening hours data is required for step 4'
          });
        }
        break;
        
      case 5:
        profile.businessCategory = data.businessCategory;
        profile.earningRate = data.earningRate || '1:10';
        
        // Save services
        if (data.services && Array.isArray(data.services)) {
          profile.services = data.services.map(service => ({
            name: service.name?.trim(),
            // categorySpecific: service.categorySpecific || false
          }));
        }

        console.log("profile.services:", profile.services);
        break;
        
      case 6:
        profile.loyaltyTiers = {
          bronze: parseInt(data.loyaltyTiers.bronze) || 5000,
          silver: parseInt(data.loyaltyTiers.silver) || 15000,
          gold: parseInt(data.loyaltyTiers.gold) || 30000,
          platinum: parseInt(data.loyaltyTiers.platinum) || 50000,
          champion: parseInt(data.loyaltyTiers.champion) || 5000,
          ultimate: parseInt(data.loyaltyTiers.ultimate) || 50000
        };
        break;
    }
    
    // Update registration step if moving forward
    // Only update if we're not editing a previous step (handled above)
    if (stepNumber > profile.registrationStep) {
      profile.registrationStep = stepNumber;
    }
    
    profile.lastSavedAt = new Date();
    
    await profile.save();
    
    console.log(`✅ Step ${stepNumber} saved successfully for user: ${userId}`);
    console.log(`📊 Registration status: isRegistrationComplete = ${profile.isRegistrationComplete}`);
    console.log(`📊 Current step: ${profile.registrationStep}`);
    
    // Prepare response with updated progress
    const response = prepareResponse(profile);
    response.message = `Step ${stepNumber} saved successfully`;
    
    // If this is step 6 AND all data is complete, mark as ready for submission
    if (stepNumber === 6) {
      // Check if all required fields are filled for step 6
      const hasAllTiers = profile.loyaltyTiers?.bronze && 
                         profile.loyaltyTiers?.silver && 
                         profile.loyaltyTiers?.gold;
      
      if (hasAllTiers) {
        response.nextAction = 'review_submission';
        response.isReadyForSubmission = true;
      } else {
        response.nextAction = 'complete_step';
        response.isReadyForSubmission = false;
      }
    } else {
      response.nextStep = stepNumber + 1;
    }
    
    // Add suggested services if step 5
    if (stepNumber === 5 && profile.businessCategory) {
      response.suggestedServices = SERVICE_CATEGORIES[profile.businessCategory] || [];
    }
    
    // Add warnings if editing after submission
    if (profile.submittedAt && !profile.isRegistrationComplete) {
      response.warning = 'Changes made after submission require re-approval';
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error(`❌ Save step ${req.params.step} error:`, error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data provided'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save step data'
    });
  }
};

// 3. Save Opening Hours (Updated for dynamic breaks)
export const saveOpeningHours = async (req, res) => {
  try {
    const userId = req.user.id;
    const { day, isClosed, openingTime, closingTime, breaks } = req.body;
    
    console.log(`⏰ Saving opening hours for ${day}: user ${userId}`);
    
    // Validate day
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!day || !validDays.includes(day.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Valid day is required. Options: ${validDays.join(', ')}`
      });
    }
    
    const dayKey = day.toLowerCase();
    
    // Find profile
    let profile = await MerchantProfile.findOne({ userId });
    if (!profile) {
      profile = await MerchantProfile.create({ userId });
    }
    
    // If closed, clear all times and breaks
    if (isClosed === true) {
      profile.openingHours[dayKey] = {
        isClosed: true,
        openingTime: null,
        closingTime: null,
        breaks: []
      };
    } else {
      // Validate opening and closing times
      if (!openingTime || !closingTime) {
        return res.status(400).json({
          success: false,
          error: 'Both opening and closing times are required when not closed'
        });
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(openingTime) || !timeRegex.test(closingTime)) {
        return res.status(400).json({
          success: false,
          error: 'Times must be in HH:MM format (24-hour)'
        });
      }
      
      // Convert to minutes and validate time logic
      const openHour = parseInt(openingTime.split(':')[0]);
      const openMin = parseInt(openingTime.split(':')[1]);
      const closeHour = parseInt(closingTime.split(':')[0]);
      const closeMin = parseInt(closingTime.split(':')[1]);
      
      const openTimeMinutes = openHour * 60 + openMin;
      const closeTimeMinutes = closeHour * 60 + closeMin;
      
      if (openTimeMinutes >= closeTimeMinutes) {
        return res.status(400).json({
          success: false,
          error: 'Closing time must be after opening time'
        });
      }
      
      // Validate breaks if provided
      const validatedBreaks = [];
      if (breaks && Array.isArray(breaks)) {
        for (const breakSlot of breaks) {
          if (!breakSlot.start || !breakSlot.end) {
            return res.status(400).json({
              success: false,
              error: 'Each break must have start and end times'
            });
          }
          
          // Validate time format
          if (!timeRegex.test(breakSlot.start) || !timeRegex.test(breakSlot.end)) {
            return res.status(400).json({
              success: false,
              error: 'Break times must be in HH:MM format (24-hour)'
            });
          }
          
          // Convert break times to minutes
          const breakStart = getTimeInMinutes(breakSlot.start);
          const breakEnd = getTimeInMinutes(breakSlot.end);
          
          // Validate break is within opening hours
          if (breakStart < openTimeMinutes || breakEnd > closeTimeMinutes) {
            return res.status(400).json({
              success: false,
              error: `Breaks must be within opening hours (${openingTime}-${closingTime})`
            });
          }
          
          if (breakStart >= breakEnd) {
            return res.status(400).json({
              success: false,
              error: 'Break end time must be after start time'
            });
          }
          
          // Check if break duration is reasonable (max 4 hours)
          if (breakEnd - breakStart > 240) {
            return res.status(400).json({
              success: false,
              error: 'Break duration cannot exceed 4 hours'
            });
          }
          
          validatedBreaks.push({
            start: breakSlot.start,
            end: breakSlot.end
          });
        }
      }
      
      // Check for overlapping breaks
      for (let i = 0; i < validatedBreaks.length; i++) {
        for (let j = i + 1; j < validatedBreaks.length; j++) {
          const breakA = validatedBreaks[i];
          const breakB = validatedBreaks[j];
          
          const aStart = getTimeInMinutes(breakA.start);
          const aEnd = getTimeInMinutes(breakA.end);
          const bStart = getTimeInMinutes(breakB.start);
          const bEnd = getTimeInMinutes(breakB.end);
          
          if ((aStart < bEnd && aEnd > bStart) || (bStart < aEnd && bEnd > aStart)) {
            return res.status(400).json({
              success: false,
              error: 'Break times cannot overlap'
            });
          }
        }
      }
      
      profile.openingHours[dayKey] = {
        isClosed: false,
        openingTime: openingTime,
        closingTime: closingTime,
        breaks: validatedBreaks
      };
    }
    
    // Update step logic
    if (profile.registrationStep <= 4) {
      profile.registrationStep = 5;
    }
    
    profile.lastSavedAt = new Date();
    
    await profile.save();
    
    console.log(`✅ Opening hours saved for ${dayKey}`);
    
    // Helper function to convert time to minutes
    function getTimeInMinutes(timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    res.status(200).json({
      success: true,
      message: `Opening hours for ${dayKey} saved successfully`,
      day: dayKey,
      openingHours: profile.openingHours[dayKey],
      nextStep: profile.registrationStep,
      currentStep: profile.registrationStep
    });
    
  } catch (error) {
    console.error('❌ Save opening hours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save opening hours'
    });
  }
};

// 4. Get Opening Hours for a specific day
export const getDayOpeningHours = async (req, res) => {
  try {
    const userId = req.user.id;
    const { day } = req.params;
    
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid day'
      });
    }
    
    const profile = await MerchantProfile.findOne({ userId })
      .select(`openingHours.${day}`);
    
    if (!profile) {
      return res.status(200).json({
        success: true,
        day: day,
        openingHours: {
          isClosed: false,
          openingSlots: []
        }
      });
    }
    
    res.status(200).json({
      success: true,
      day: day,
      openingHours: profile.openingHours[day] || {
        isClosed: false,
        openingSlots: []
      }
    });
    
  } catch (error) {
    console.error('❌ Get day opening hours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opening hours'
    });
  }
};

// 5. Get Suggested Services for Category
export const getSuggestedServices = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!SERVICE_CATEGORIES[category]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }
    
    res.status(200).json({
      success: true,
      category: category,
      suggestedServices: SERVICE_CATEGORIES[category]
    });
    
  } catch (error) {
    console.error('❌ Get suggested services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggested services'
    });
  }
};

// 6. Validate Time Slot
export const validateTimeSlot = async (req, res) => {
  try {
    const { open, close, isBreak } = req.body;
    
    // Basic validation
    if (!open || !close) {
      return res.status(400).json({
        success: false,
        error: 'Open and close times are required'
      });
    }
    
    // Time format validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(open) || !timeRegex.test(close)) {
      return res.status(400).json({
        success: false,
        error: 'Time must be in HH:MM format (24-hour)'
      });
    }
    
    // Time logic validation
    const openHour = parseInt(open.split(':')[0]);
    const openMin = parseInt(open.split(':')[1]);
    const closeHour = parseInt(close.split(':')[0]);
    const closeMin = parseInt(close.split(':')[1]);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (openTime >= closeTime) {
      return res.status(400).json({
        success: false,
        error: 'Close time must be after open time'
      });
    }
    
    // For breaks, ensure duration is reasonable (not too long)
    if (isBreak && (closeTime - openTime) > 240) { // 4 hours max for break
      return res.status(400).json({
        success: false,
        error: 'Break duration cannot exceed 4 hours'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Time slot is valid',
      open: open,
      close: close,
      durationMinutes: closeTime - openTime
    });
    
  } catch (error) {
    console.error('❌ Validate time slot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate time slot'
    });
  }
};

// 7. Get All Opening Hours
export const getAllOpeningHours = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profile = await MerchantProfile.findOne({ userId })
      .select('openingHours registrationStep');
    
    if (!profile) {
      // Return default structure
      const defaultHours = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        defaultHours[day] = {
          isClosed: false,
          openingSlots: []
        };
      });
      
      return res.status(200).json({
        success: true,
        openingHours: defaultHours,
        currentStep: 1
      });
    }
    
    res.status(200).json({
      success: true,
      openingHours: profile.openingHours,
      currentStep: profile.registrationStep
    });
    
  } catch (error) {
    console.error('❌ Get all opening hours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opening hours'
    });
  }
};

// 8. Check Day Completion Status
export const checkOpeningHoursCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profile = await MerchantProfile.findOne({ userId })
      .select('openingHours');
    
    if (!profile) {
      return res.status(200).json({
        success: true,
        isComplete: false,
        completedDays: [],
        pendingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      });
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const completedDays = [];
    const pendingDays = [];
    
    days.forEach(day => {
      const dayHours = profile.openingHours[day];
      
      // A day is considered completed if:
      // 1. It's marked as closed, OR
      // 2. It has both openingTime and closingTime
      if (dayHours && (dayHours.isClosed || (dayHours.openingTime && dayHours.closingTime))) {
        completedDays.push(day);
      } else {
        pendingDays.push(day);
      }
    });
    
    const isComplete = pendingDays.length === 0;
    
    res.status(200).json({
      success: true,
      isComplete: isComplete,
      completedDays: completedDays,
      pendingDays: pendingDays,
      progress: `${completedDays.length}/${days.length} days configured`
    });
    
  } catch (error) {
    console.error('❌ Check opening hours completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check completion status'
    });
  }
};

// Keep other existing functions (getStepData, updateRegistrationStep, submitForReview, getCompleteProfile)
// They remain mostly the same, just ensure they work with the new schema


// 3. Get Specific Step Data
// Update getStepData function to use correct field names
export const getStepData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step } = req.params;
    
    const stepNumber = parseInt(step);
    
    console.log(`🔍 Fetching step ${stepNumber} data for user: ${userId}`);
    
    if (stepNumber < 1 || stepNumber > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step number'
      });
    }
    
    const profile = await MerchantProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    let stepData = {};
    
    // Return data for the requested step - UPDATED FIELD NAMES
    switch (stepNumber) {
      case 1:
        stepData = {
          legalBusinessName: profile.legalBusinessName,
          aboutBusiness: profile.aboutBusiness,
          businessStructure: profile.businessStructure,
          isVATRegistered: profile.isVATRegistered || false,
          vatRegistrationNumber: profile.vatRegistrationNumber || null
        };
        break;
      case 2:
        stepData = {
          primaryContactName: profile.primaryContactName,
          businessEmail: profile.businessEmail,
          businessPhone: profile.businessPhone,
          website: profile.website,
          socialMedia: profile.socialMedia
        };
        break;
      case 3:
        stepData = {
          address: profile.address
        };
        break;
      case 4:
        stepData = {
          openingHours: profile.openingHours // FIXED: openingHours not branding
        };
        break;
      case 5:
        stepData = {
          businessCategory: profile.businessCategory, // FIXED: businessCategory not category
          earningRate: profile.earningRate, // FIXED: earningRate not fixedEarningRate
          services: profile.services
        };
        break;
      case 6:
        stepData = {
          loyaltyTiers: profile.loyaltyTiers
        };
        break;
    }
    
    res.status(200).json({
      success: true,
      step: stepNumber,
      data: stepData,
      canProceed: stepNumber <= profile.registrationStep
    });
    
  } catch (error) {
    console.error(`❌ Get step ${req.params.step} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch step data'
    });
  }
};

// 4. Update Registration Step (when user navigates back/forth)
export const updateRegistrationStep = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step } = req.body;
    
    const stepNumber = parseInt(step);
    
    console.log(`🔄 Updating registration step to ${stepNumber} for user: ${userId}`);
    
    if (stepNumber < 1 || stepNumber > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step number'
      });
    }
    
    let profile = await MerchantProfile.findOne({ userId });
    
    if (!profile) {
      profile = await MerchantProfile.create({ 
        userId, 
        registrationStep: stepNumber 
      });
    } else {
      // Only allow moving to steps that have been completed or are the next step
      if (stepNumber > profile.registrationStep + 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot skip ahead to this step'
        });
      }
      
      // CRITICAL FIX: If user navigates BACK to edit a step, mark registration as incomplete
      if (stepNumber < profile.registrationStep && profile.isRegistrationComplete) {
        console.log(`⚠️ User navigating back from step ${profile.registrationStep} to step ${stepNumber} - marking registration incomplete`);
        profile.isRegistrationComplete = false;
        profile.adminStatus = 'pending_review'; // Reset admin status
        profile.submittedAt = null; // Clear submission timestamp
      }
      
      profile.registrationStep = stepNumber;
      profile.lastSavedAt = new Date();
      await profile.save();
    }
    
    console.log(`✅ Registration step updated to ${stepNumber}`);
    console.log(`📊 Registration status: isRegistrationComplete = ${profile.isRegistrationComplete}`);
    
    res.status(200).json({
      success: true,
      message: `Navigation to step ${stepNumber} successful`,
      currentStep: profile.registrationStep,
      isRegistrationComplete: profile.isRegistrationComplete
    });
    
  } catch (error) {
    console.error('❌ Update registration step error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update registration step'
    });
  }
};

// 5. Submit for Admin Review (After all steps complete)

export const submitForReview = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📤 Submitting profile for admin review: ${userId}`);
    console.log(`🔍 Checking profile for user: ${userId}`);
    
    const profile = await MerchantProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please complete registration first.'
      });
    }
    
    // Log profile for debugging
    console.log('📊 Profile data:', {
      legalBusinessName: profile.legalBusinessName,
      aboutBusiness: profile.aboutBusiness,
      businessStructure: profile.businessStructure,
      primaryContactName: profile.primaryContactName,
      businessPhone: profile.businessPhone,
      addressPostcode: profile.address?.postcode,
      businessCategory: profile.businessCategory,
      earningRate: profile.earningRate,
      servicesCount: profile.services?.length,
      loyaltyTiers: profile.loyaltyTiers,
      openingHours: profile.openingHours
    });
    
    // FIXED: Use correct field names from your schema
    const requiredFields = [
      { field: profile.legalBusinessName, step: 1, message: 'Legal Business Name' },
      { field: profile.aboutBusiness, step: 1, message: 'About Business' },
      { field: profile.businessStructure, step: 1, message: 'Business Structure' },
      { field: profile.primaryContactName, step: 2, message: 'Primary Contact Name' },
      { field: profile.businessPhone, step: 2, message: 'Business Phone' },
      { field: profile.address?.postcode, step: 3, message: 'Postcode' },
      { field: profile.businessCategory, step: 5, message: 'Business Category' },
      { field: profile.earningRate, step: 5, message: 'Earning Rate' },
      { field: profile.services?.length > 0, step: 5, message: 'Services' },
      { field: profile.loyaltyTiers?.bronze, step: 6, message: 'Loyalty Tiers' }
    ];
    
    console.log('🔍 Required fields check:', requiredFields);
    
    const missingFields = requiredFields.filter(item => !item.field);
    
    console.log('❌ Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      const missingSteps = [...new Set(missingFields.map(item => item.step))];
      return res.status(400).json({
        success: false,
        error: 'Please complete all required fields before submission',
        missingFields: missingFields.map(item => item.message),
        incompleteSteps: missingSteps,
        // Add debug info
        debug: {
          businessCategory: profile.businessCategory,
          earningRate: profile.earningRate,
          servicesCount: profile.services?.length
        }
      });
    }
    
    // Check opening hours completion - UPDATED for new schema
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const pendingOpeningDays = days.filter(day => {
      const dayHours = profile.openingHours[day];
      
      // A day is considered incomplete if:
      // 1. No dayHours object exists, OR
      // 2. Not closed AND (no openingTime OR no closingTime)
      return !dayHours || (!dayHours.isClosed && (!dayHours.openingTime || !dayHours.closingTime));
    });
    
    if (pendingOpeningDays.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Please complete opening hours for all days',
        pendingDays: pendingOpeningDays,
        debug: {
          openingHours: profile.openingHours
        }
      });
    }
    
    // Mark registration as complete
    profile.isRegistrationComplete = true;
    profile.adminStatus = 'pending_review';
    profile.submittedAt = new Date();
    profile.registrationStep = 6; // Keep at final step
    
    await profile.save();
    
    // Update user status
    await User.findByIdAndUpdate(userId, { 
      status: 'pending_approval',
      updatedAt: new Date()
    });
    
    console.log(`✅ Profile submitted for admin review: ${userId}`);
    console.log(`📅 Submitted at: ${profile.submittedAt}`);
    console.log(`📊 Opening hours verified: All ${days.length} days completed`);
    
    res.status(200).json({
      success: true,
      message: 'Profile submitted for admin review successfully',
      submittedAt: profile.submittedAt,
      estimatedReviewTime: '24-48 hours',
      openingHoursStatus: 'All days configured'
    });
    
  } catch (error) {
    console.error('❌ Submit for review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit for review',
      details: error.message
    });
  }
};

// 6. Get Complete Profile (for review screen)
export const getCompleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📄 Fetching complete profile for review: ${userId}`);
    
    const profile = await MerchantProfile.findOne({ userId })
      .select('-__v -createdAt -updatedAt');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    const completeProfile = {
      step1: {
        legalBusinessName: profile.legalBusinessName,
        aboutBusiness: profile.aboutBusiness,
        businessStructure: profile.businessStructure
      },
      step2: {
        primaryContactName: profile.primaryContactName,
        businessEmail: profile.businessEmail,
        businessPhone: profile.businessPhone,
        website: profile.website,
        socialMedia: profile.socialMedia
      },
      step3: {
        address: profile.address
      },
      step4: {
        openingHours: profile.openingHours  // Updated from branding to openingHours
      },
      step5: {
        businessCategory: profile.businessCategory,  // Updated from category
        earningRate: profile.earningRate,  // Updated from fixedEarningRate
        services: profile.services
      },
      step6: {
        loyaltyTiers: profile.loyaltyTiers
      },
      metadata: {
        registrationStep: profile.registrationStep,
        isRegistrationComplete: profile.isRegistrationComplete,
        adminStatus: profile.adminStatus,
        submittedAt: profile.submittedAt,
        lastSavedAt: profile.lastSavedAt
      }
    };
    
    res.status(200).json({
      success: true,
      profile: completeProfile
    });
    
  } catch (error) {
    console.error('❌ Get complete profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complete profile'
    });
  }
};



// controllers/merchantProfileController.js - ADD THESE NEW FUNCTIONS

// 1. Single API to upload both banner and logo
export const uploadBranding = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🎨 Uploading branding images for user: ${userId}`);
    
    // Check if any files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded. Please provide bannerImage or businessLogo.'
      });
    }
    
    // Get or create profile
    let profile = await MerchantProfile.findOne({ userId });
    if (!profile) {
      profile = await MerchantProfile.create({ userId });
    }
    
    const uploadResults = {
      bannerImage: null,
      businessLogo: null,
      errors: []
    };
    
    // Process banner image if uploaded
    if (req.files['bannerImage']) {
      try {
        const bannerFile = req.files['bannerImage'][0];
        
        // Delete old banner if exists
        if (profile.bannerImage && profile.bannerImage.publicId) {
          await deleteFromCloudinary(profile.bannerImage.publicId);
        }
        
        // Store banner info
        profile.bannerImage = {
          url: bannerFile.path,
          publicId: bannerFile.filename,
          uploadedAt: new Date(),
          dimensions: {
            width: bannerFile.width || null,
            height: bannerFile.height || null
          }
        };
        
        uploadResults.bannerImage = {
          url: bannerFile.path,
          dimensions: profile.bannerImage.dimensions,
          uploadedAt: profile.bannerImage.uploadedAt
        };
        
        console.log(`✅ Banner uploaded for user: ${userId}`);
      } catch (bannerError) {
        console.error('❌ Banner upload error:', bannerError);
        uploadResults.errors.push({
          type: 'bannerImage',
          error: bannerError.message
        });
      }
    }
    
    // Process business logo if uploaded
    if (req.files['businessLogo']) {
      try {
        const logoFile = req.files['businessLogo'][0];
        
        // Delete old logo if exists
        if (profile.businessLogo && profile.businessLogo.publicId) {
          await deleteFromCloudinary(profile.businessLogo.publicId);
        }
        
        // Store logo info
        profile.businessLogo = {
          url: logoFile.path,
          publicId: logoFile.filename,
          uploadedAt: new Date(),
          dimensions: {
            width: logoFile.width || null,
            height: logoFile.height || null
          }
        };
        
        uploadResults.businessLogo = {
          url: logoFile.path,
          dimensions: profile.businessLogo.dimensions,
          uploadedAt: profile.businessLogo.uploadedAt
        };
        
        console.log(`✅ Logo uploaded for user: ${userId}`);
      } catch (logoError) {
        console.error('❌ Logo upload error:', logoError);
        uploadResults.errors.push({
          type: 'businessLogo',
          error: logoError.message
        });
      }
    }
    
    // Update branding timestamp
    profile.brandingUpdatedAt = new Date();
    await profile.save();
    
    console.log(`✅ Branding upload completed for user: ${userId}`);
    
    // Prepare response
    const response = {
      success: true,
      message: 'Branding images uploaded successfully',
      uploadedImages: {
        bannerImage: uploadResults.bannerImage ? {
          url: uploadResults.bannerImage.url,
          uploaded: true,
          dimensions: uploadResults.bannerImage.dimensions
        } : { uploaded: false },
        businessLogo: uploadResults.businessLogo ? {
          url: uploadResults.businessLogo.url,
          uploaded: true,
          dimensions: uploadResults.businessLogo.dimensions
        } : { uploaded: false }
      },
      timestamp: new Date().toISOString()
    };
    
    // Add errors if any
    if (uploadResults.errors.length > 0) {
      response.warnings = uploadResults.errors;
      response.partialSuccess = true;
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Branding upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload branding images',
      details: error.message
    });
  }
};

// 2. Single API to remove both banner and logo
export const removeBranding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { removeBanner, removeLogo } = req.body;
    
    console.log(`🗑️ Removing branding images for user: ${userId}`, { removeBanner, removeLogo });
    
    // Validate request
    if (!removeBanner && !removeLogo) {
      return res.status(400).json({
        success: false,
        error: 'Specify what to remove: removeBanner and/or removeLogo'
      });
    }
    
    const profile = await MerchantProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    const removalResults = {
      bannerRemoved: false,
      logoRemoved: false,
      errors: []
    };
    
    // Remove banner if requested
    if (removeBanner && profile.bannerImage) {
      try {
        // Delete from Cloudinary
        if (profile.bannerImage.publicId) {
          await deleteFromCloudinary(profile.bannerImage.publicId);
        }
        
        // Remove from profile
        profile.bannerImage = null;
        removalResults.bannerRemoved = true;
        console.log(`✅ Banner removed for user: ${userId}`);
      } catch (bannerError) {
        console.error('❌ Banner removal error:', bannerError);
        removalResults.errors.push({
          type: 'bannerImage',
          error: bannerError.message
        });
      }
    } else if (removeBanner && !profile.bannerImage) {
      removalResults.errors.push({
        type: 'bannerImage',
        error: 'No banner image found to remove'
      });
    }
    
    // Remove logo if requested
    if (removeLogo && profile.businessLogo) {
      try {
        // Delete from Cloudinary
        if (profile.businessLogo.publicId) {
          await deleteFromCloudinary(profile.businessLogo.publicId);
        }
        
        // Remove from profile
        profile.businessLogo = null;
        removalResults.logoRemoved = true;
        console.log(`✅ Logo removed for user: ${userId}`);
      } catch (logoError) {
        console.error('❌ Logo removal error:', logoError);
        removalResults.errors.push({
          type: 'businessLogo',
          error: logoError.message
        });
      }
    } else if (removeLogo && !profile.businessLogo) {
      removalResults.errors.push({
        type: 'businessLogo',
        error: 'No logo found to remove'
      });
    }
    
    // Update branding timestamp if anything was removed
    if (removalResults.bannerRemoved || removalResults.logoRemoved) {
      profile.brandingUpdatedAt = new Date();
      await profile.save();
    }
    
    console.log(`✅ Branding removal completed for user: ${userId}`);
    
    // Prepare response
    const response = {
      success: true,
      message: 'Branding images removed successfully',
      removedImages: {
        bannerImage: removalResults.bannerRemoved,
        businessLogo: removalResults.logoRemoved
      },
      timestamp: new Date().toISOString()
    };
    
    // Add errors if any
    if (removalResults.errors.length > 0) {
      response.warnings = removalResults.errors;
      if (removalResults.errors.length === (removeBanner ? 1 : 0) + (removeLogo ? 1 : 0)) {
        // All operations failed
        response.success = false;
        response.message = 'Failed to remove branding images';
      } else {
        // Partial success
        response.partialSuccess = true;
      }
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Branding removal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove branding images',
      details: error.message
    });
  }
};

// 3. Enhanced getBrandingImages function (keep existing)
export const getBrandingImages = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profile = await MerchantProfile.findOne({ userId })
      .select('bannerImage businessLogo brandingUpdatedAt');
    
    if (!profile) {
      return res.status(200).json({
        success: true,
        bannerImage: null,
        businessLogo: null,
        brandingUpdatedAt: null,
        hasBanner: false,
        hasLogo: false
      });
    }
    
    res.status(200).json({
      success: true,
      bannerImage: profile.bannerImage ? {
        url: profile.bannerImage.url,
        dimensions: profile.bannerImage.dimensions,
        uploadedAt: profile.bannerImage.uploadedAt
      } : null,
      businessLogo: profile.businessLogo ? {
        url: profile.businessLogo.url,
        dimensions: profile.businessLogo.dimensions,
        uploadedAt: profile.businessLogo.uploadedAt
      } : null,
      brandingUpdatedAt: profile.brandingUpdatedAt || null,
      hasBanner: !!profile.bannerImage,
      hasLogo: !!profile.businessLogo
    });
    
  } catch (error) {
    console.error('❌ Get branding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branding images'
    });
  }
};

// 9. Get Merchant Status and Next Actions
export const getMerchantStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('status userType email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if merchant profile exists and progress
    const profile = await MerchantProfile.findOne({ userId })
      .select('registrationStep isRegistrationComplete adminStatus submittedAt');
    
    // LOGIC FIX: If registration marked complete but not at step 6, fix it
    let isRegistrationComplete = profile?.isRegistrationComplete || false;
    if (isRegistrationComplete && profile?.registrationStep < 6) {
      isRegistrationComplete = false;
    }
    
    res.status(200).json({
      success: true,
      status: user.status,
      userType: user.userType,
      email: user.email,
      canAccessRegistration: user.status === 'pending_approval',
      canAccessDashboard: user.status === 'active',
      registration: {
        step: profile?.registrationStep || 1,
        isComplete: isRegistrationComplete,
        hasProfile: !!profile,
        adminStatus: profile?.adminStatus || 'pending_review',
        submittedAt: profile?.submittedAt || null
      },
      nextAction: getNextAction(user.status, profile, isRegistrationComplete)
    });
    
  } catch (error) {
    console.error('❌ Get merchant status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
};

