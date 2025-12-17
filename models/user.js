
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
    required: function () {
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
    type: String
  },
  verificationExpiry: {
    type: Date
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
  },
  // Secure password reset fields (hashed token + expiry)
  passwordResetToken: {
    type: String,
    index: true
  },
  passwordResetExpires: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

userSchema.methods.isVerificationCodeValid = function () {
  if (!this.verificationCode || !this.verificationExpiry) {
    return false;
  }
  return this.verificationExpiry > new Date();
};

export default mongoose.model('User', userSchema);