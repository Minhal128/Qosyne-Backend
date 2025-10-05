const express = require('express');
const { getUserTransactions, getUserConnectedWallets, getCurrentUser, clearUserSession } = require('../controllers/userDataController');
const authMiddleware = require('../middlewares/authMiddleware');
const noCacheMiddleware = require('../middlewares/noCacheMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

// GET /api/transactions - with no-cache middleware to prevent stale data
router.get('/transactions', noCacheMiddleware, authMiddleware, tryCatch(getUserTransactions));

// GET /api/wallets - with no-cache middleware to prevent stale data
router.get('/wallets', noCacheMiddleware, authMiddleware, tryCatch(getUserConnectedWallets));

// Debug endpoint to check current user
router.get('/debug/current-user', noCacheMiddleware, authMiddleware, tryCatch(getCurrentUser));

// Clear user session endpoint (call when switching users)
router.post('/clear-session', noCacheMiddleware, authMiddleware, tryCatch(clearUserSession));

module.exports = router;


