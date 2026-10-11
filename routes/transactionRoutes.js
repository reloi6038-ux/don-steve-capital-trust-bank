const express = require('express');
const router = express.Router();

const { getMyTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', protect, asyncHandler(getMyTransactions));

module.exports = router;