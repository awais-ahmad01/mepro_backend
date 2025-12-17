// middlewares/upload.js - UPDATED & FIXED
import multer from 'multer';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const userId = req.user?.id || 'temp';
    const timestamp = Date.now();
    
    // Determine folder based on field name and route
    // Structure:
    // - merchants/<userId>/banners
    // - merchants/<userId>/logos
    // - merchants/<userId>/price-lists
    // - merchants/<userId>/rewards
    // - merchants/<userId>/promotions
    // - merchants/<userId>/loyalty-programs
    // - merchants/<userId>/scratch-cards
    // - merchants/<userId>/diamond-promotions
    // - merchants/<userId> (fallback)
    let folder = `merchants/${userId}`;
    const url = req.originalUrl || req.url || '';
    
    if (file.fieldname === 'bannerImage') {
      folder = `merchants/${userId}/banners`;
    } else if (file.fieldname === 'businessLogo') {
      folder = `merchants/${userId}/logos`;
    } else if (file.fieldname === 'image') {
      // Determine folder based on route path
      if (url.includes('/price-lists')) {
        folder = `merchants/${userId}/price-lists`;
      } else if (url.includes('/rewards')) {
        folder = `merchants/${userId}/rewards`;
      } else if (url.includes('/promotions')) {
        folder = `merchants/${userId}/promotions`;
      } else if (url.includes('/loyalty-programs')) {
        folder = `merchants/${userId}/loyalty-programs`;
      } else if (url.includes('/scratch-cards')) {
        folder = `merchants/${userId}/scratch-cards`;
      } else if (url.includes('/diamond-promotions')) {
        folder = `merchants/${userId}/diamond-promotions`;
      } else {
        // Fallback for any other image uploads
        folder = `merchants/${userId}/items`;
      }
    }
    
    return {
      folder: folder,
      public_id: `${file.fieldname}_${userId}_${timestamp}`,
      format: 'webp', // Convert to webp for better compression
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    };
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer for multiple files
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 2 // Max 2 files (banner + logo)
  },
  fileFilter: fileFilter
});

// Middleware for uploading both banner and logo in single request
const uploadBrandingImages = upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'businessLogo', maxCount: 1 }
]);

// For backward compatibility - single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// For backward compatibility - multiple files upload (if needed elsewhere)
const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

// Custom middleware to handle upload errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB per file.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Maximum 2 files allowed (banner and logo)'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field. Only bannerImage and businessLogo fields are allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
};

// Export only what's defined
export {
  uploadBrandingImages,
  handleUploadErrors,
  uploadSingle,
  uploadMultiple
};