const { validationResult } = require('express-validator');
const User = require('../models/User');
const Account = require('../models/Account');
const generateToken = require('../utils/generateToken');

/* ---------- Cookie options ---------- */
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:
    (parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 7) * 24 * 60 * 60 * 1000,
});

/* ---------- POST /api/auth/register ---------- */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { firstName, lastName, email, phone, password, accountType } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
  });

  const account = await Account.create({
    user: user._id,
    accountType: accountType || 'savings',
    balance: 1000,
  });

  const token = generateToken(user._id);
  res.cookie('token', token, cookieOptions());

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    account: {
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
    },
  });
};

/* ---------- POST /api/auth/login ---------- */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res
      .status(403)
      .json({ success: false, message: 'Account suspended' });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  res.cookie('token', token, cookieOptions());

  return res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
};

/* ---------- POST /api/auth/logout ---------- */
const logout = (req, res) => {
  res.cookie('token', '', { ...cookieOptions(), maxAge: 0 });
  return res.json({ success: true, message: 'Logged out' });
};

/* ---------- GET /api/auth/me ---------- */
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: 'User not found' });
  }

  return res.json({
    success: true,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
};

module.exports = { register, login, logout, getMe };