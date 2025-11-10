/**
 * Unified Transaction Routes
 * RESTful API endpoints for all payment operations
 */

const express = require('express');
const router = express.Router();
const unifiedTransactionController = require('../controllers/unifiedTransactionController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/transactions/send
 * @desc    Send money from one wallet to another
 * @access  Private
 */
router.post('/send', unifiedTransactionController.sendMoney.bind(unifiedTransactionController));

/**
 * @route   GET /api/transactions/balance
 * @desc    Get user's balance across all wallets
 * @access  Private
 */
router.get('/balance', unifiedTransactionController.getBalance.bind(unifiedTransactionController));

/**
 * @route   GET /api/transactions/supported-routes
 * @desc    Get list of supported transfer routes
 * @access  Private
 */
router.get('/supported-routes', unifiedTransactionController.getSupportedRoutes.bind(unifiedTransactionController));

/**
 * @route   GET /api/transactions/client-token
 * @desc    Get client token for frontend (PayPal/Venmo)
 * @access  Private
 */
router.get('/client-token', unifiedTransactionController.getClientToken.bind(unifiedTransactionController));

/**
 * @route   POST /api/transactions/connect-wallet
 * @desc    Connect a payment provider wallet
 * @access  Private
 */
router.post('/connect-wallet', unifiedTransactionController.connectWallet.bind(unifiedTransactionController));

/**
 * @route   GET /api/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/', unifiedTransactionController.getTransactions.bind(unifiedTransactionController));

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get transaction details by ID
 * @access  Private
 */
router.get('/:transactionId', unifiedTransactionController.getTransactionById.bind(unifiedTransactionController));

module.exports = router;
