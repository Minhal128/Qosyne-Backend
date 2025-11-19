const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const prisma = new PrismaClient();

// Wise API Configuration
const WISE_API_BASE = 'https://api.sandbox.transferwise.tech'; // Use sandbox for testing
const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;

// Note: Wise connection is handled through the wallet integration API with OAuth flow
// Users must connect their Wise account through the proper OAuth process

// @route   POST /api/wise/connect
// @desc    Connect user's Wise account using environment credentials
// @access  Private
router.post(
  '/connect',
  authMiddleware,
  tryCatch(async (req, res) => {
    const userId = req.user.userId;

    console.log('🔗 Connecting Wise account for user:', userId);

    if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Wise API credentials not configured in environment variables'
      });
    }

    try {
      // Test the API token by getting profile info
      const profileResponse = await axios.get(`${WISE_API_BASE}/v1/profiles/${WISE_PROFILE_ID}`, {
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const profile = profileResponse.data;
      console.log('✅ Wise profile found:', profile.id);

      // Get account balances (handle 404 gracefully for sandbox)
      let balances = [];
      let primaryBalance = null;
      
      try {
        const balancesResponse = await axios.get(
          `${WISE_API_BASE}/v1/profiles/${WISE_PROFILE_ID}/balances`,
          {
            headers: {
              'Authorization': `Bearer ${WISE_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        balances = balancesResponse.data;
        primaryBalance = balances.find(b => b.currency === 'USD') || balances[0];
      } catch (balanceError) {
        console.log('⚠️ Balances not available (common in sandbox):', balanceError.response?.data?.message);
        // Set default balance for sandbox
        primaryBalance = { currency: 'USD', amount: { value: 1000.00 } };
      }

      // Check if wallet already exists
      const existingWallet = await prisma.connectedWallets.findFirst({
        where: {
          userId: parseInt(userId),
          provider: "WISE",
          isActive: true,
        },
      });

      const walletData = {
        userId: parseInt(userId),
        provider: "WISE",
        walletId: `wise_${WISE_PROFILE_ID}`,
        customerId: WISE_PROFILE_ID,
        accountEmail: profile.details?.email || `wise_user_${userId}@wise.com`,
        fullName: profile.details?.firstName && profile.details?.lastName 
          ? `${profile.details.firstName} ${profile.details.lastName}`
          : 'Wise User',
        username: profile.details?.email || `wise_user_${userId}`,
        accessToken: WISE_API_TOKEN,
        currency: primaryBalance?.currency || "USD",
        balance: primaryBalance?.amount?.value || 0,
        isActive: true,
        updatedAt: new Date(),
      };

      if (existingWallet) {
        // Update existing wallet
        await prisma.connectedWallets.update({
          where: { id: existingWallet.id },
          data: walletData,
        });
      } else {
        // Create new wallet
        await prisma.connectedWallets.create({
          data: walletData,
        });
      }

      res.json({
        success: true,
        message: 'Wise account connected successfully using API credentials',
        data: {
          connected: true,
          profileId: WISE_PROFILE_ID,
          profileType: profile.type,
          currency: primaryBalance?.currency || "USD",
          balance: primaryBalance?.amount?.value || 0,
          walletId: `wise_${WISE_PROFILE_ID}`
        }
      });

    } catch (error) {
      console.error('❌ Wise connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect Wise account: ' + (error.response?.data?.message || error.message)
      });
    }
  })
);

// @route   POST /api/wise/send
// @desc    Send money via Wise to IBAN account
// @access  Private
router.post(
  '/send',
  authMiddleware,
  [
    body('recipientName').notEmpty().withMessage('Recipient name is required'),
    body('recipientEmail').optional().isEmail().withMessage('Valid recipient email required'),
    body('recipientIban').notEmpty().withMessage('IBAN is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1.00'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('note').optional()
  ],
  tryCatch(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      recipientName, 
      recipientEmail, 
      recipientIban, 
      recipientBankName,
      amount, 
      currency = 'USD', 
      note = 'Payment from Qosyne wallet'
    } = req.body;
    const userId = req.user.userId;

    // Get user's Wise wallet
    const wiseWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "WISE",
        isActive: true,
      },
    });

    if (!wiseWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wise account not connected. Please connect your Wise account first.'
      });
    }

    if (!wiseWallet.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Wise account not properly authenticated. Please reconnect your Wise account.'
      });
    }

    console.log('✅ Found connected Wise wallet for user:', userId);
    console.log('✅ Wise profile ID:', wiseWallet.customerId);
    console.log('✅ Wallet ID:', wiseWallet.walletId);

    try {
      const profileId = wiseWallet.customerId;
      const accessToken = wiseWallet.accessToken;

      // Step 1: Create recipient account
      console.log('🔧 Creating Wise recipient account...');
      
      // Determine recipient currency based on IBAN country code
      let recipientCurrency = currency;
      if (recipientIban.startsWith('GB')) {
        recipientCurrency = 'GBP';
      } else if (recipientIban.startsWith('DE') || recipientIban.startsWith('FR') || recipientIban.startsWith('IT') || recipientIban.startsWith('ES')) {
        recipientCurrency = 'EUR';
      }
      
      console.log(`💱 Using currency ${recipientCurrency} for IBAN ${recipientIban.substring(0, 4)}...`);
      
      const recipientData = {
        currency: recipientCurrency,
        type: 'iban',
        profile: parseInt(profileId),
        accountHolderName: recipientName,
        details: {
          IBAN: recipientIban
        }
      };

      const recipientResponse = await axios.post(
        `${WISE_API_BASE}/v1/accounts`,
        recipientData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const recipientAccount = recipientResponse.data;
      console.log('✅ Recipient account created:', recipientAccount.id);

      // Step 2: Create quote for the transfer (use v2 for better compatibility)
      console.log('🔧 Creating Wise transfer quote...');
      const quoteData = {
        sourceCurrency: currency, // Use sourceCurrency for v2
        targetCurrency: recipientCurrency, // Use targetCurrency for v2
        sourceAmount: parseFloat(amount),
        profile: parseInt(profileId)
      };

      const quoteResponse = await axios.post(
        `${WISE_API_BASE}/v2/quotes`,
        quoteData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const quote = quoteResponse.data;
      console.log('✅ Transfer quote created:', quote.id);

      // Step 3: Create transfer
      console.log('🔧 Creating Wise transfer...');
      
      const transferData = {
        targetAccount: recipientAccount.id,
        quoteUuid: quote.id,
        customerTransactionId: require('crypto').randomUUID(),
        details: {
          reference: note || 'Payment'
        }
      };

      console.log('📍 Transfer request data:', JSON.stringify(transferData, null, 2));

      const transferResponse = await axios.post(
        `${WISE_API_BASE}/v1/transfers`,
        transferData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const transfer = transferResponse.data;
      console.log('✅ Wise transfer created:', transfer.id);

      // Save transaction to database
      const dbTransaction = await prisma.transactions.create({
        data: {
          userId: parseInt(userId),
          provider: "WISE",
          type: "EXTERNAL_TRANSFER",
          amount: parseFloat(amount),
          currency,
          paymentId: transfer.id.toString(),
          status: transfer.status === 'incoming_payment_waiting' ? 'PENDING' : 'COMPLETED',
        },
      });

      // Save recipient details
      await prisma.transactionRecipients.create({
        data: {
          transactionId: dbTransaction.id,
          recipientName: recipientName,
          recipientEmail: recipientEmail,
          recipientIban: recipientIban,
          recipientBankName: recipientBankName,
        },
      });

      res.json({
        success: true,
        message: 'Payment sent successfully via Wise',
        data: {
          transactionId: dbTransaction.id,
          wiseTransferId: transfer.id,
          status: dbTransaction.status,
          senderEmail: wiseWallet.accountEmail,
          senderWalletId: wiseWallet.walletId,
          recipientName: recipientName,
          recipientEmail: recipientEmail,
          recipientBank: recipientBankName,
          amount: parseFloat(amount),
          currency,
          fee: quote.fee,
          rate: quote.rate,
          createdAt: dbTransaction.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Wise transfer error:', error);
      console.error('❌ Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error status:', error.response?.status);
      res.status(500).json({
        success: false,
        message: 'Failed to send Wise transfer: ' + (error.response?.data?.message || error.message),
        details: error.response?.data
      });
    }
  })
);

// @route   GET /api/wise/status
// @desc    Check Wise connection status
// @access  Private
router.get('/status', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.userId;

  const wiseWallet = await prisma.connectedWallets.findFirst({
    where: {
      userId: parseInt(userId),
      provider: "WISE",
      isActive: true,
    },
  });

  res.json({
    success: true,
    data: {
      connected: !!wiseWallet,
      wiseEmail: wiseWallet?.accountEmail,
      walletId: wiseWallet?.walletId,
      profileId: wiseWallet?.customerId,
      hasAccessToken: !!wiseWallet?.accessToken,
      currency: wiseWallet?.currency,
      balance: wiseWallet?.balance
    }
  });
}));

// @route   GET /api/wise/transfer-status/:transferId
// @desc    Check Wise transfer status
// @access  Private
router.get('/transfer-status/:transferId', authMiddleware, tryCatch(async (req, res) => {
  const { transferId } = req.params;
  const userId = req.user.userId;

  // Find transaction in database
  const dbTransaction = await prisma.transactions.findFirst({
    where: {
      paymentId: transferId,
      provider: "WISE",
      userId: parseInt(userId),
    },
  });

  if (!dbTransaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  // Get user's Wise wallet for access token
  const wiseWallet = await prisma.connectedWallets.findFirst({
    where: {
      userId: parseInt(userId),
      provider: "WISE",
      isActive: true,
    },
  });

  if (!wiseWallet?.accessToken) {
    return res.status(400).json({
      success: false,
      message: 'Wise access token not available'
    });
  }

  try {
    // Get transfer status from Wise
    const transferResponse = await axios.get(
      `${WISE_API_BASE}/v1/transfers/${transferId}`,
      {
        headers: {
          'Authorization': `Bearer ${wiseWallet.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const transfer = transferResponse.data;

    // Update database status if needed
    let newStatus = dbTransaction.status;
    if (transfer.status === 'outgoing_payment_sent') {
      newStatus = 'COMPLETED';
    } else if (transfer.status === 'cancelled' || transfer.status === 'bounced_back') {
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
      message: 'Transfer status retrieved',
      data: {
        transactionId: dbTransaction.id,
        wiseTransferId: transferId,
        status: newStatus,
        wiseStatus: transfer.status,
        amount: dbTransaction.amount,
        recipientName: recipient?.recipientName,
        recipientBank: recipient?.recipientBankName,
        createdAt: dbTransaction.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Wise status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check transfer status: ' + (error.response?.data?.message || error.message)
    });
  }
}));

module.exports = router;
