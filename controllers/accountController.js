const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/* ---------- GET /api/accounts ---------- */
const getMyAccounts = async (req, res) => {
  const accounts = await Account.find({ user: req.user._id });
  return res.json({ success: true, count: accounts.length, accounts });
};

/* ---------- POST /api/accounts ---------- */
const createAccount = async (req, res) => {
  const { accountType } = req.body;
  const account = await Account.create({
    user: req.user._id,
    accountType: accountType || 'savings',
  });
  return res.status(201).json({ success: true, account });
};

/* ---------- GET /api/accounts/:id ---------- */
const getAccount = async (req, res) => {
  const account = await Account.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!account) {
    return res
      .status(404)
      .json({ success: false, message: 'Account not found' });
  }

  const transactions = await Transaction.find({ account: account._id })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ success: true, account, transactions });
};

/* ---------- POST /api/accounts/:id/deposit ---------- */
const deposit = async (req, res) => {
  const { amount, description } = req.body;
  const value = Number(amount);

  if (!value || value <= 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid amount' });
  }

  const account = await Account.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!account) {
    return res
      .status(404)
      .json({ success: false, message: 'Account not found' });
  }

  if (account.status !== 'active') {
    return res
      .status(400)
      .json({ success: false, message: 'Account is not active' });
  }

  account.balance += value;
  await account.save();

  const tx = await Transaction.create({
    account: account._id,
    type: 'deposit',
    amount: value,
    balanceAfter: account.balance,
    description: description || 'Deposit',
    reference: 'DEP' + Date.now() + Math.floor(Math.random() * 1000),
  });

  return res.json({ success: true, account, transaction: tx });
};

/* ---------- POST /api/accounts/:id/withdraw ---------- */
const withdraw = async (req, res) => {
  const { amount, description } = req.body;
  const value = Number(amount);

  if (!value || value <= 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid amount' });
  }

  const account = await Account.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!account) {
    return res
      .status(404)
      .json({ success: false, message: 'Account not found' });
  }

  if (account.status !== 'active') {
    return res
      .status(400)
      .json({ success: false, message: 'Account is not active' });
  }

  if (account.balance < value) {
    return res
      .status(400)
      .json({ success: false, message: 'Insufficient funds' });
  }

  account.balance -= value;
  await account.save();

  const tx = await Transaction.create({
    account: account._id,
    type: 'withdrawal',
    amount: value,
    balanceAfter: account.balance,
    description: description || 'Withdrawal',
    reference: 'WDR' + Date.now() + Math.floor(Math.random() * 1000),
  });

  return res.json({ success: true, account, transaction: tx });
};

/* ---------- POST /api/accounts/transfer ---------- */
const transfer = async (req, res) => {
  const { fromAccountId, toAccountNumber, amount, description } = req.body;
  const value = Number(amount);

  if (!value || value <= 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid amount' });
  }

  const fromAccount = await Account.findOne({
    _id: fromAccountId,
    user: req.user._id,
  });

  if (!fromAccount) {
    return res
      .status(404)
      .json({ success: false, message: 'Source account not found' });
  }

  const toAccount = await Account.findOne({ accountNumber: toAccountNumber });

  if (!toAccount) {
    return res
      .status(404)
      .json({ success: false, message: 'Destination account not found' });
  }

  if (toAccount._id.equals(fromAccount._id)) {
    return res
      .status(400)
      .json({ success: false, message: 'Cannot transfer to same account' });
  }

  if (fromAccount.balance < value) {
    return res
      .status(400)
      .json({ success: false, message: 'Insufficient funds' });
  }

  fromAccount.balance -= value;
  toAccount.balance += value;
  await fromAccount.save();
  await toAccount.save();

  const ref = 'TRF' + Date.now() + Math.floor(Math.random() * 1000);

  const debitTx = await Transaction.create({
    account: fromAccount._id,
    type: 'transfer_out',
    amount: value,
    balanceAfter: fromAccount.balance,
    description: description || `Transfer to ${toAccount.accountNumber}`,
    reference: ref + '-OUT',
  });

  await Transaction.create({
    account: toAccount._id,
    type: 'transfer_in',
    amount: value,
    balanceAfter: toAccount.balance,
    description: description || `Transfer from ${fromAccount.accountNumber}`,
    reference: ref + '-IN',
  });

  return res.json({ success: true, account: fromAccount, transaction: debitTx });
};

module.exports = {
  getMyAccounts,
  createAccount,
  getAccount,
  deposit,
  withdraw,
  transfer,
};