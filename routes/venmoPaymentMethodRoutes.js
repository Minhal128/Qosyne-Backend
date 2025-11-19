const express = require('express');
const router = express.Router();
const braintree = require('braintree');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const prisma = new PrismaClient();

// Initialize Braintree Gateway
const getBraintreeGateway = () => {
  return new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox, // or Production
    merchantId: process.env.BT_MERCHANT_ID,
    publicKey: process.env.BT_PUBLIC_KEY,
    privateKey: process.env.BT_PRIVATE_KEY,
  });
};

// @route   POST /api/venmo/add-payment-method
// @desc    Add payment method to Venmo wallet using payment method nonce
// @access  Private
router.post(
  '/add-payment-method',
  authMiddleware,
  [
    body('paymentMethodNonce').isLength({ min: 1 }).withMessage('Payment method nonce is required')
  ],
  tryCatch(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentMethodNonce } = req.body;
    const userId = req.user.userId;

    // Get user's Venmo wallet
    const venmoWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "VENMO",
        isActive: true,
      },
    });

    if (!venmoWallet) {
      return res.status(400).json({
        success: false,
        message: 'Venmo account not connected. Please connect your Venmo account first.'
      });
    }

    if (!venmoWallet.customerId) {
      return res.status(400).json({
        success: false,
        message: 'Venmo account missing customer ID. Please reconnect your Venmo account.'
      });
    }

    console.log('✅ Found Venmo wallet for user:', userId);
    console.log('✅ Braintree customer ID:', venmoWallet.customerId);

    // Initialize Braintree gateway
    const gateway = getBraintreeGateway();

    try {
      // Create payment method using the nonce
      const paymentMethodResult = await gateway.paymentMethod.create({
        customerId: venmoWallet.customerId,
        paymentMethodNonce: paymentMethodNonce,
        options: {
          makeDefault: true,
          verifyCard: false,
        },
      });

      if (!paymentMethodResult.success) {
        throw new Error(paymentMethodResult.message || 'Failed to create payment method');
      }

      const paymentMethod = paymentMethodResult.paymentMethod;
      console.log('✅ Payment method created:', paymentMethod.token);

      // Update wallet with payment method token
      await prisma.connectedWallets.update({
        where: { id: venmoWallet.id },
        data: {
          paymentMethodToken: paymentMethod.token,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Payment method added successfully to Venmo wallet',
        data: {
          paymentMethodToken: paymentMethod.token,
          paymentMethodType: paymentMethod.constructor.name,
          walletId: venmoWallet.walletId,
          canSendPayments: true
        }
      });

    } catch (error) {
      console.error('❌ Failed to add payment method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add payment method: ' + error.message
      });
    }
  })
);

// @route   GET /api/venmo/create-test-payment-method
// @desc    Create a test payment method for sandbox testing
// @access  Private
router.get(
  '/create-test-payment-method',
  authMiddleware,
  tryCatch(async (req, res) => {
    const userId = req.user.userId;

    // Get user's Venmo wallet
    const venmoWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "VENMO",
        isActive: true,
      },
    });

    if (!venmoWallet) {
      return res.status(400).json({
        success: false,
        message: 'Venmo account not connected. Please connect your Venmo account first.'
      });
    }

    if (!venmoWallet.customerId) {
      return res.status(400).json({
        success: false,
        message: 'Venmo account missing customer ID. Please reconnect your Venmo account.'
      });
    }

    console.log('✅ Creating test payment method for user:', userId);
    console.log('✅ Braintree customer ID:', venmoWallet.customerId);

    // Initialize Braintree gateway
    const gateway = getBraintreeGateway();

    try {
      // Use fake-valid-visa-nonce for sandbox testing
      const paymentMethodResult = await gateway.paymentMethod.create({
        customerId: venmoWallet.customerId,
        paymentMethodNonce: 'fake-valid-visa-nonce', // Braintree test nonce
        options: {
          makeDefault: true,
          verifyCard: false,
        },
      });

      if (!paymentMethodResult.success) {
        throw new Error(paymentMethodResult.message || 'Failed to create test payment method');
      }

      const paymentMethod = paymentMethodResult.paymentMethod;
      console.log('✅ Test payment method created:', paymentMethod.token);

      // Update wallet with payment method token
      await prisma.connectedWallets.update({
        where: { id: venmoWallet.id },
        data: {
          paymentMethodToken: paymentMethod.token,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Test payment method created successfully for Venmo wallet',
        data: {
          paymentMethodToken: paymentMethod.token,
          paymentMethodType: 'Test Visa Card',
          walletId: venmoWallet.walletId,
          canSendPayments: true,
          note: 'This is a test payment method for sandbox testing'
        }
      });

    } catch (error) {
      console.error('❌ Failed to create test payment method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test payment method: ' + error.message
      });
    }
  })
);

module.exports = router;
