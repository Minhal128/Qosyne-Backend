const express = require('express');
const { getUserTransactions, getUserConnectedWallets } = require('../controllers/userDataController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

// GET /api/transactions
router.get('/transactions', authMiddleware, tryCatch(getUserTransactions));

// GET /api/wallets
router.get('/wallets', authMiddleware, tryCatch(getUserConnectedWallets));

module.exports = router;


