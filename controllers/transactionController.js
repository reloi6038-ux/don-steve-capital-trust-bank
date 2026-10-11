const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

/* ---------- GET /api/transactions ---------- */
const getMyTransactions = async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).select('_id');
  const ids = accounts.map((a) => a._id);

  const transactions = await Transaction.find({ account: { $in: ids } })
    .populate('account', 'accountNumber accountType')
    .sort({ createdAt: -1 })
    .limit(100);

  return res.json({
    success: true,
    count: transactions.length,
    transactions,
  });
};

module.exports = { getMyTransactions };