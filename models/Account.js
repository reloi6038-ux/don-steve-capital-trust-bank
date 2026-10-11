const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'fixed'],
      default: 'savings',
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

/* Auto-generate a 10-digit account number before validation.
   Sync hook → no `next` parameter, no `next()` call. */
accountSchema.pre('validate', function () {
  if (!this.accountNumber) {
    this.accountNumber =
      '10' + Math.floor(10000000 + Math.random() * 90000000).toString();
  }
});

module.exports = mongoose.model('Account', accountSchema);