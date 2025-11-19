const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const prisma = new PrismaClient();

// Helper function to get PayPal access token
const getPayPalAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'grant_type=client_credentials'
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('PayPal OAuth error:', error.response?.data || error.message);
    throw new Error('Failed to get PayPal access token');
  }
};

// Note: PayPal connection is handled through the wallet integration API with OAuth flow
// Users must connect their PayPal account through the proper OAuth process

// @route   POST /api/paypal/send
// @desc    Send money via PayPal Payouts API
// @access  Private
router.post(
  '/send',
  authMiddleware,
  [
    body('recipientEmail').isEmail().withMessage('Valid recipient email is required'),
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

    const { recipientEmail, currency = 'USD', note = 'Payment from Qosyne wallet' } = req.body;
    const amount = parseFloat(req.body.amount);
    const userId = req.user.userId;

    // Get user's PayPal wallet (must be connected via OAuth)
    const paypalWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "PAYPAL",
        isActive: true,
      },
    });

    if (!paypalWallet) {
      return res.status(400).json({
        success: false,
        message: 'PayPal account not connected. Please connect your PayPal account first through the wallet integration.'
      });
    }

    // Verify that the wallet has a valid access token (from OAuth flow)
    if (!paypalWallet.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'PayPal account not properly authenticated. Please reconnect your PayPal account through OAuth.'
      });
    }

    console.log('✅ Found connected PayPal wallet for user:', userId);
    console.log('✅ PayPal account email:', paypalWallet.accountEmail);
    console.log('✅ Wallet ID:', paypalWallet.walletId);

    // Use app-level access token for payouts (user OAuth tokens don't have payout permissions)
    console.log('🔄 Getting app-level PayPal access token for payouts...');
    const { accessToken } = await getPayPalAccessToken();

    // Generate unique sender batch ID
    const senderBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Prepare payout request
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: 'You have a payment from Qosyne',
        email_message: note
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: currency
          },
          receiver: recipientEmail,
          note: note,
          sender_item_id: `item_${Date.now()}`
        }
      ]
    };

    console.log('🚀 Sending PayPal payout:', JSON.stringify(payoutData, null, 2));
    console.log('🔑 Using access token:', accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING');

    // Send payout request to PayPal
    const payoutResponse = await axios({
      method: 'post',
      url: 'https://api-m.sandbox.paypal.com/v1/payments/payouts',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: payoutData
    });

    console.log('✅ PayPal payout response:', JSON.stringify(payoutResponse.data, null, 2));

    // Extract transaction details
    const batchId = payoutResponse.data.batch_header.payout_batch_id;
    const batchStatus = payoutResponse.data.batch_header.batch_status;
    const payoutItemId = payoutResponse.data.items?.[0]?.payout_item_id || `pending_${Date.now()}`;

    // Save transaction to database
    const transaction = await prisma.transactions.create({
      data: {
        userId: parseInt(userId),
        provider: "PAYPAL",
        type: "EXTERNAL_TRANSFER",
        amount: parseFloat(amount),
        currency,
        paymentId: payoutItemId,
        status: batchStatus === 'SUCCESS' ? 'COMPLETED' : 'PENDING',
      },
    });

    // Save recipient details
    await prisma.transactionRecipients.create({
      data: {
        transactionId: transaction.id,
        recipientEmail,
      },
    });

    res.json({
      success: true,
      message: 'Payment sent successfully via PayPal',
      data: {
        transactionId: transaction.id,
        paypalBatchId: batchId,
        paypalItemId: payoutItemId,
        status: transaction.status,
        senderEmail: paypalWallet.accountEmail,
        senderWalletId: paypalWallet.walletId,
        recipientEmail,
        amount,
        currency,
        createdAt: transaction.createdAt
      }
    });
  })
);

// @route   GET /api/paypal/status
// @desc    Check PayPal connection status
// @access  Private
router.get('/status', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.userId;

  const paypalWallet = await prisma.connectedWallets.findFirst({
    where: {
      userId: parseInt(userId),
      provider: "PAYPAL",
      isActive: true,
    },
  });

  res.json({
    success: true,
    data: {
      connected: !!paypalWallet,
      paypalEmail: paypalWallet?.accountEmail,
      walletId: paypalWallet?.walletId
    }
  });
}));

module.exports = router;
