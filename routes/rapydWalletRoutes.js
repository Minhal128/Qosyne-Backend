const express = require('express');
const router = express.Router();
const {
  createRapydWallet,
  getRapydWalletBalance,
  getAdminWalletBalance
} = require('../controllers/rapydWalletController');
const {
  testRapydConnection,
  createTestWallet,
  testTransferWithFee
} = require('../controllers/rapydTestController');
const {
  testRapydFromServer,
  testCreateAdminWalletFromServer
} = require('../controllers/rapydTestFromServer');
const {
  testRealWalletIntegration,
  testRealTransferWithFee
} = require('../controllers/rapydRealTestController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

// User wallet management
router.post('/create-rapyd-wallet', authMiddleware, tryCatch(createRapydWallet));
router.get('/rapyd-balance/:walletId', authMiddleware, tryCatch(getRapydWalletBalance));

// Admin wallet management
router.get('/admin/wallet-balance', tryCatch(getAdminWalletBalance));

// Test endpoints for Rapyd integration
router.get('/test/connection', tryCatch(testRapydConnection));
router.post('/test/create-wallet', tryCatch(createTestWallet));
router.post('/test/transfer', tryCatch(testTransferWithFee));

// Server-side tests (bypass geo-restrictions)
router.get('/test/server-connection', tryCatch(testRapydFromServer));
router.get('/test/server-admin-wallet', tryCatch(testCreateAdminWalletFromServer));

// REAL wallet integration tests
router.get('/test/real-wallet-integration', tryCatch(testRealWalletIntegration));
router.post('/test/real-transfer-with-fee', tryCatch(testRealTransferWithFee));

module.exports = router;
