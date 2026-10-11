const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('phone').trim().isLength({ min: 7 }).withMessage('Valid phone required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be 8+ characters'),
  ],
  asyncHandler(register)
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  asyncHandler(login)
);

router.post('/logout', logout);
router.get('/me', protect, asyncHandler(getMe));

module.exports = router;