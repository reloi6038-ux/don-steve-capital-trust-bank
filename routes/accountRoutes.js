const express = require('express');
const router = express.Router();

const {
  getMyAccounts,
  createAccount,
  getAccount,
  deposit,
  withdraw,
  transfer,
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router
  .route('/')
  .get(asyncHandler(getMyAccounts))
  .post(asyncHandler(createAccount));

router.get('/:id', asyncHandler(getAccount));
router.post('/:id/deposit', asyncHandler(deposit));
router.post('/:id/withdraw', asyncHandler(withdraw));
router.post('/transfer', asyncHandler(transfer));

module.exports = router;