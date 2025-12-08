// // models/User.js
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const userSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true
//   },
//   password: {
//     type: String,
//     // Password is required only after OTP verification for merchants
//     required: function() {
//       return this.userType === 'customer' || (this.userType === 'merchant' && this.isEmailVerified);
//     }
//   },
//   userType: {
//     type: String,
//     enum: ['merchant', 'customer', 'admin'],
//     required: true
//   },
//   isEmailVerified: {
//     type: Boolean,
//     default: false
//   },
//   verificationCode: {
//     type: String,
//     // Only for merchants during registration
//   },
//   verificationExpiry: {
//     type: Date,
//     // Only for merchants during registration
//   },
//   status: {
//     type: String,
//     enum: [
//       'pending_verification',  // Email not verified yet (merchant only)
//       'pending_password',      // Email verified, password not set (merchant only)
//       'pending_approval',      // Password set, waiting for admin approval (merchant only)
//       'active',                // Can login (customer) or approved merchant
//       'suspended',             // Account suspended
//       'rejected'               // Merchant application rejected
//     ],
//     default: 'pending_verification'
//   },
//   lastLogin: {
//     type: Date
//   }
// }, {
//   timestamps: true // Adds createdAt and updatedAt automatically
// });

// // Hash password before saving
// userSchema.pre('save', async function(next) {
//   try {
//     // Only hash the password if it's modified and exists
//     if (this.isModified('password') && this.password) {
//       const salt = await bcrypt.genSalt(10);
//       this.password = await bcrypt.hash(this.password, salt);
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });


// // Method to compare password
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   if (!this.password) return false;
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Method to check if verification code is valid
// userSchema.methods.isVerificationCodeValid = function() {
//   if (!this.verificationCode || !this.verificationExpiry) {
//     return false;
//   }
//   return this.verificationExpiry > new Date();
// };

// export default mongoose.model('User', userSchema);



// models/User.js - COMPLETE UPDATED VERSION
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
password: {
  type: String,
  required: function() {
    // For customers: always require password
    if (this.userType === 'customer') {
      return true;
    }
    // For merchants: require password only when status is 'pending_approval' or 'active'
    if (this.userType === 'merchant') {
      return this.status === 'pending_approval' || this.status === 'active';
    }
    // For admins: always require password
    if (this.userType === 'admin') {
      return true;
    }
    return false;
  }
},
  userType: {
    type: String,
    enum: ['merchant', 'customer', 'admin'],
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
  },
  verificationExpiry: {
    type: Date,
  },
  status: {
    type: String,
    enum: [
      'pending_verification',  // Email not verified yet (merchant only)
      'pending_password',      // Email verified, password not set (merchant only)
      'pending_approval',      // Password set, waiting for admin approval (merchant only)
      'active',                // Can login (customer) or approved merchant
      'suspended',             // Account suspended
      'rejected'               // Merchant application rejected
    ],
    default: 'pending_verification'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// REMOVED: pre-save hook for password hashing

// Method to check if verification code is valid
userSchema.methods.isVerificationCodeValid = function() {
  if (!this.verificationCode || !this.verificationExpiry) {
    return false;
  }
  return this.verificationExpiry > new Date();
};

export default mongoose.model('User', userSchema);