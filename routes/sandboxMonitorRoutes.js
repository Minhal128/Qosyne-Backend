/**
 * Sandbox Monitor Routes
 * Dashboard endpoints to view all transactions in their respective sandbox environments
 */

const express = require('express');
const router = express.Router();
const sandboxMonitorController = require('../controllers/sandboxMonitorController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/sandbox/transactions
 * @desc    Get all transactions across all providers
 * @access  Private
 * 
 * Query: {
 *   limit?: number,
 *   offset?: number,
 *   provider?: string,
 *   status?: string,
 *   startDate?: string,
 *   endDate?: string
 * }
 */
router.get('/transactions', sandboxMonitorController.getAllTransactions.bind(sandboxMonitorController));

/**
 * @route   GET /api/sandbox/provider/:provider/transactions
 * @desc    Get transactions for specific provider
 * @access  Private
 */
router.get('/provider/:provider/transactions', sandboxMonitorController.getProviderTransactions.bind(sandboxMonitorController));

/**
 * @route   GET /api/sandbox/links
 * @desc    Get sandbox URLs for all connected providers
 * @access  Private
 */
router.get('/links', sandboxMonitorController.getSandboxLinks.bind(sandboxMonitorController));

/**
 * @route   GET /api/sandbox/transaction/:provider/:paymentId
 * @desc    Get transaction details by provider payment ID
 * @access  Private
 */
router.get('/transaction/:provider/:paymentId', sandboxMonitorController.getTransactionByPaymentId.bind(sandboxMonitorController));

/**
 * @route   GET /api/sandbox/stats
 * @desc    Get system-wide statistics
 * @access  Private
 */
router.get('/stats', sandboxMonitorController.getStats.bind(sandboxMonitorController));

module.exports = router;
