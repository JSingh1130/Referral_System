const mongoose = require('mongoose');

// Define user schema
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },  // Mark name as required

  email: { 
    type: String, 
    required: true, 
    unique: true,  // This creates a unique index automatically
    match: [/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, 'Please fill a valid email address']  // Email regex for validation
  },

  referredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },

  referralLevel: { 
    type: Number, 
    default: 0  // Level 0 is the root user
  },

  earnings: { 
    type: Number, 
    default: 0 
  },  // Total earnings (sum of level 1 and level 2)

  level1Earnings: { 
    type: Number, 
    default: 0 
  },  // Level 1 earnings

  level2Earnings: { 
    type: Number, 
    default: 0 
  },  // Level 2 earnings

  referrals: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
});

// Export the model
module.exports = mongoose.model('User', userSchema);
