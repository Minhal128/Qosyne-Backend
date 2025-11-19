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

// Note: Venmo connection is handled through the wallet integration API with OAuth flow
// Users must connect their Venmo account through the proper OAuth process

// @route   POST /api/venmo/send
// @desc    Send money via Venmo (through Braintree)
// @access  Private
router.post(
  '/send',
  authMiddleware,
  [
    body('recipientUsername').isLength({ min: 1 }).withMessage('Valid recipient Venmo username is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
  ],
  tryCatch(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { recipientUsername, currency = 'USD', note = 'Payment from Qosyne wallet' } = req.body;
    const amount = parseFloat(req.body.amount);
    const userId = req.user.userId;

    // Get user's Venmo wallet (must be connected via OAuth)
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
        message: 'Venmo account not connected. Please connect your Venmo account first through the wallet integration.'
      });
    }

    // Verify that the wallet has a valid access token (client token from Braintree)
    if (!venmoWallet.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Venmo account not properly authenticated. Please reconnect your Venmo account through OAuth.'
      });
    }

    console.log('✅ Found connected Venmo wallet for user:', userId);
    console.log('✅ Venmo account email:', venmoWallet.accountEmail);
    console.log('✅ Wallet ID:', venmoWallet.walletId);
    console.log('✅ Client token available:', !!venmoWallet.accessToken);
    console.log('✅ Payment method token:', venmoWallet.paymentMethodToken);

    // Initialize Braintree gateway
    const gateway = getBraintreeGateway();

    // For Venmo payments, we need to use the payment method token or nonce
    // Accept both paymentMethodToken (from database) and paymentMethodNonce (from request body for testing)
    let paymentMethodToken = venmoWallet.paymentMethodToken;
    const paymentMethodNonce = req.body.paymentMethodNonce; // Optional: for testing with Braintree test nonces
    
    // If neither token nor nonce is available, return error
    if (!paymentMethodToken && !paymentMethodNonce) {
      return res.status(400).json({
        success: false,
        message: 'No payment method available. Please add a payment method to your Venmo account first.',
        clientToken: venmoWallet.accessToken // Return client token for frontend to create payment method
      });
    }

    // Create transaction using Braintree
    // Use paymentMethodNonce if provided (for testing), otherwise use paymentMethodToken
    const transactionRequest = {
      amount: amount.toFixed(2),
      ...(paymentMethodNonce ? { paymentMethodNonce: paymentMethodNonce } : { paymentMethodToken: paymentMethodToken }),
      options: {
        submitForSettlement: true,
        venmo: {
          profileId: venmoWallet.customerId || undefined
        }
      }
      // Note: Custom fields removed as they're not supported by Braintree
      // We'll store recipient info in our database instead
    };

    console.log('🚀 Sending Venmo payment via Braintree:', JSON.stringify(transactionRequest, null, 2));

    // Process the transaction
    const result = await gateway.transaction.sale(transactionRequest);

    if (!result.success) {
      console.error('❌ Braintree transaction failed:', result.message);
      throw new Error(result.message || 'Venmo payment failed');
    }

    const transaction = result.transaction;
    console.log('✅ Braintree transaction successful:', transaction.id);
    console.log('✅ Transaction status:', transaction.status);

    // Save transaction to database
    const dbTransaction = await prisma.transactions.create({
      data: {
        userId: parseInt(userId),
        provider: "VENMO",
        type: "EXTERNAL_TRANSFER",
        amount: parseFloat(amount),
        currency,
        paymentId: transaction.id,
        status: transaction.status === 'submitted_for_settlement' ? 'PENDING' : 'COMPLETED',
      },
    });

    // Save recipient details
    await prisma.transactionRecipients.create({
      data: {
        transactionId: dbTransaction.id,
        recipientName: recipientUsername, // Store username in recipientName field
      },
    });

    res.json({
      success: true,
      message: 'Payment sent successfully via Venmo',
      data: {
        transactionId: dbTransaction.id,
        braintreeTransactionId: transaction.id,
        status: dbTransaction.status,
        senderEmail: venmoWallet.accountEmail,
        senderWalletId: venmoWallet.walletId,
        recipientUsername,
        amount,
        currency,
        createdAt: dbTransaction.createdAt
      }
    });
  })
);

// @route   POST /api/venmo/send-test
// @desc    Send money via Venmo (TEST ENDPOINT - No wallet connection required)
// @access  Private
router.post(
  '/send-test',
  authMiddleware,
  [
    body('recipientUsername').isLength({ min: 1 }).withMessage('Valid recipient Venmo username is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('paymentMethodNonce').isLength({ min: 1 }).withMessage('Payment method nonce is required for testing')
  ],
  tryCatch(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { recipientUsername, currency = 'USD', note = 'Test payment from Qosyne', paymentMethodNonce } = req.body;
    const amount = parseFloat(req.body.amount);
    const userId = req.user.userId;

    console.log('🧪 TEST ENDPOINT - Creating Venmo transaction');
    console.log('User ID:', userId);
    console.log('Amount:', amount);
    console.log('Recipient:', recipientUsername);
    console.log('Payment Method Nonce:', paymentMethodNonce);

    // Initialize Braintree gateway
    const gateway = getBraintreeGateway();

    // Create transaction using Braintree with the provided nonce
    const transactionRequest = {
      amount: amount.toFixed(2),
      paymentMethodNonce: paymentMethodNonce,
      options: {
        submitForSettlement: true
      }
    };

    console.log('🚀 Sending test Venmo payment via Braintree:', JSON.stringify(transactionRequest, null, 2));

    try {
      // Process the transaction
      const result = await gateway.transaction.sale(transactionRequest);

      if (!result.success) {
        console.error('❌ Braintree transaction failed:', result.message);
        if (result.errors) {
          console.error('Errors:', result.errors.deepErrors());
        }
        return res.status(400).json({
          success: false,
          message: result.message || 'Venmo payment failed',
          errors: result.errors?.deepErrors()
        });
      }

      const transaction = result.transaction;
      console.log('✅ Braintree transaction successful:', transaction.id);
      console.log('✅ Transaction status:', transaction.status);
      console.log('✅ Payment instrument type:', transaction.paymentInstrumentType);

      // Save transaction to database
      const dbTransaction = await prisma.transactions.create({
        data: {
          userId: parseInt(userId),
          provider: "VENMO",
          type: "EXTERNAL_TRANSFER",
          amount: parseFloat(amount),
          currency,
          paymentId: transaction.id,
          status: transaction.status === 'submitted_for_settlement' ? 'PENDING' : 'COMPLETED',
        },
      });

      // Save recipient details
      await prisma.transactionRecipients.create({
        data: {
          transactionId: dbTransaction.id,
          recipientName: recipientUsername,
        },
      });

      res.json({
        success: true,
        message: 'Test Venmo payment created successfully!',
        data: {
          transactionId: dbTransaction.id,
          braintreeTransactionId: transaction.id,
          status: dbTransaction.status,
          paymentInstrumentType: transaction.paymentInstrumentType,
          recipientUsername,
          amount,
          currency,
          createdAt: dbTransaction.createdAt,
          dashboardUrl: `https://sandbox.braintreegateway.com/merchants/${process.env.BT_MERCHANT_ID}/transactions/${transaction.id}`
        }
      });

    } catch (error) {
      console.error('❌ Error creating test transaction:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create test transaction',
        error: error.message
      });
    }
  })
);

// @route   GET /api/venmo/status
// @desc    Check Venmo connection status
// @access  Private
router.get('/status', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.userId;

  const venmoWallet = await prisma.connectedWallets.findFirst({
    where: {
      userId: parseInt(userId),
      provider: "VENMO",
      isActive: true,
    },
  });

  res.json({
    success: true,
    data: {
      connected: !!venmoWallet,
      venmoEmail: venmoWallet?.accountEmail,
      walletId: venmoWallet?.walletId,
      hasClientToken: !!venmoWallet?.accessToken,
      hasPaymentMethod: !!venmoWallet?.paymentMethodToken,
      clientToken: venmoWallet?.accessToken // Include client token for frontend use
    }
  });
}));

// @route   GET /api/venmo/transaction-status/:transactionId
// @desc    Check Venmo transaction status via Braintree
// @access  Private
router.get('/transaction-status/:transactionId', authMiddleware, tryCatch(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user.userId;

  // Find transaction in database
  const dbTransaction = await prisma.transactions.findFirst({
    where: {
      paymentId: transactionId,
      provider: "VENMO",
      userId: parseInt(userId),
    },
  });

  if (!dbTransaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  // Get transaction status from Braintree
  const gateway = getBraintreeGateway();
  const braintreeTransaction = await gateway.transaction.find(transactionId);

  // Update database status if needed
  let newStatus = dbTransaction.status;
  if (braintreeTransaction.status === 'settled') {
    newStatus = 'COMPLETED';
  } else if (braintreeTransaction.status === 'failed' || braintreeTransaction.status === 'voided') {
    newStatus = 'FAILED';
  }

  if (newStatus !== dbTransaction.status) {
    await prisma.transactions.update({
      where: { id: dbTransaction.id },
      data: { status: newStatus },
    });
  }

  // Get recipient details
  const recipient = await prisma.transactionRecipients.findUnique({
    where: { transactionId: dbTransaction.id },
  });

  res.json({
    success: true,
    message: 'Transaction status retrieved',
    data: {
      transactionId: dbTransaction.id,
      braintreeTransactionId: transactionId,
      status: newStatus,
      braintreeStatus: braintreeTransaction.status,
      amount: dbTransaction.amount,
      recipientUsername: recipient?.recipientName,
      createdAt: dbTransaction.createdAt
    }
  });
}));

module.exports = router;
