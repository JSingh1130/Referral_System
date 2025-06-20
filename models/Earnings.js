const mongoose = require('mongoose');

const earningsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // The user who made the purchase
  referralUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // The user who referred the purchasing user
  amount: { type: Number, required: true },  // The total earnings from the referral
  level: { type: Number, required: true },  // Referral level (Level 1 or Level 2)
  level1Earnings: { type: Number, default: 0 },  // Earnings from Level 1 referrals
  level2Earnings: { type: Number, default: 0 },  // Earnings from Level 2 referrals
  transactionDate: { type: Date, default: Date.now }  // Timestamp for the transaction
});

// Export the model
module.exports = mongoose.model('Earnings', earningsSchema);
