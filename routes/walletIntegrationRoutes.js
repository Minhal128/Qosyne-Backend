const express = require('express');
const router = express.Router();
const walletIntegrationController = require('../controllers/walletIntegrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

// Wallet Management Routes
router.get('/wallets', authMiddleware, tryCatch(walletIntegrationController.getUserWallets));
router.get('/wallets/available-for-transfer', authMiddleware, tryCatch(walletIntegrationController.getAvailableWalletsForTransfer));
router.post('/wallets/connect', authMiddleware, tryCatch(walletIntegrationController.connectWallet));
router.delete('/wallets/:walletId/disconnect', authMiddleware, tryCatch(walletIntegrationController.disconnectWallet));
router.get('/wallets/:walletId/balance', authMiddleware, tryCatch(walletIntegrationController.getWalletBalance));
router.post('/wallets/:walletId/refresh', authMiddleware, tryCatch(walletIntegrationController.refreshWalletConnection));

// OAuth Routes
router.get('/wallets/auth/:provider/url', authMiddleware, tryCatch(walletIntegrationController.getOAuthUrl));
router.post('/wallets/auth/:provider/callback', authMiddleware, tryCatch(walletIntegrationController.handleOAuthCallback));

// Transaction Routes
router.post('/transactions/transfer', authMiddleware, tryCatch(walletIntegrationController.initiateTransfer));
router.get('/transactions/:transactionId', authMiddleware, tryCatch(walletIntegrationController.getTransaction));
router.get('/transactions', authMiddleware, tryCatch(walletIntegrationController.getUserTransactions));
router.post('/transactions/:transactionId/cancel', authMiddleware, tryCatch(walletIntegrationController.cancelTransaction));
router.post('/transactions/:transactionId/retry', authMiddleware, tryCatch(walletIntegrationController.retryTransaction));
router.post('/transactions/estimate-fees', authMiddleware, tryCatch(walletIntegrationController.estimateTransferFees));
router.get('/transactions/currencies/supported', authMiddleware, tryCatch(walletIntegrationController.getSupportedCurrencies));

// QR Code Routes
router.post('/qr/generate', authMiddleware, tryCatch(walletIntegrationController.generateQRCode));
router.post('/qr/universal', authMiddleware, tryCatch(walletIntegrationController.generateUniversalQR));
router.post('/qr/venmo', authMiddleware, tryCatch(walletIntegrationController.generateVenmoQR));
router.post('/qr/connect-and-generate', authMiddleware, tryCatch(walletIntegrationController.connectWalletAndGenerateQR));
router.get('/qr/:qrId/status', authMiddleware, tryCatch(walletIntegrationController.getQRStatus));
router.post('/qr/scan/:qrId', tryCatch(walletIntegrationController.processQRScan));
router.post('/qr/bank-deposit', authMiddleware, tryCatch(walletIntegrationController.generateBankDepositQR));
router.post('/qr/wallet-connect', authMiddleware, tryCatch(walletIntegrationController.generateWalletConnectQR));
router.delete('/qr/:qrId', authMiddleware, tryCatch(walletIntegrationController.deactivateQR));
router.get('/qr', authMiddleware, tryCatch(walletIntegrationController.getUserQRCodes));

// Rapyd Integration Routes
router.get('/rapyd/payment-methods/:country', authMiddleware, tryCatch(walletIntegrationController.getRapydPaymentMethods));
router.get('/rapyd/exchange-rates', authMiddleware, tryCatch(walletIntegrationController.getRapydExchangeRate));
router.get('/rapyd/countries', authMiddleware, tryCatch(walletIntegrationController.getRapydCountries));
router.get('/rapyd/currencies', authMiddleware, tryCatch(walletIntegrationController.getRapydCurrencies));

module.exports = router;
