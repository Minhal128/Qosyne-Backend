const express = require('express');
const axios = require('axios');
const {
  processStripePayment,
  addPaymentMethod,
  getPayPalToken,
  getPayPalAuthUrl,
  payPalCallback,
  createOrder,
  authorizePayment,
  paymentCapture,
  getTransactions,
  attachPaymentMethod,
payPalCallbackAuthorize,
  getRecipients,
  getBankAccounts,
  generateClientToken,
  createRecipientToken,
  getWiseProfiles,
  changeTransactionStatus,
} = require('../controllers/paymentController');
const walletIntegrationController = require('../controllers/walletIntegrationController');

const {
  getAllTransactions,
  getTransactionStats,
} = require('../simple-endpoints');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

router.post('/stripe', authMiddleware, tryCatch(processStripePayment));
router.get('/braintree-token', authMiddleware, tryCatch(generateClientToken));
router.get(
  '/stripe/bank-accounts/:customerId',
  authMiddleware,
  tryCatch(getBankAccounts),
);

router.post('/add-payment-method', authMiddleware, tryCatch(addPaymentMethod));
router.get('/paypal-token',  tryCatch(getPayPalToken));
router.get('/paypal-auth-url', authMiddleware, tryCatch(getPayPalAuthUrl))
router.get('/paypal/callback', tryCatch(payPalCallback));
// Support legacy/new frontend redirect URL for Venmo OAuth callbacks.
// Some clients redirect to /api/payment/venmo/callback after browser-based OAuth.
// Forward those requests to the wallet integration controller so the wallet
// is persisted in the same place as other wallet-integration callbacks.
router.get('/venmo/callback', tryCatch(walletIntegrationController.handleVenmoOAuthCallback));
router.get('/venmo/oauth/callback', tryCatch(walletIntegrationController.handleVenmoOAuthCallback));
router.post('/paypal/callback', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { accessToken, refreshToken, userInfo } = req.body;

    // Check if PayPal already connected
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const existingPayPal = await prisma.connectedWallets.findFirst({
      where: {
        userId: userId,
        provider: 'PAYPAL',
        isActive: true
      }
    });

    if (existingPayPal) {
      return res.status(400).json({
        message: 'PayPal wallet is already connected',
        status_code: 400
      });
    }

    // Create PayPal wallet connection
    const connectedWallet = await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'PAYPAL',
        walletId: userInfo.payerInfo.payerId,
        accountEmail: userInfo.payerInfo.email,
        fullName: `${userInfo.payerInfo.firstName} ${userInfo.payerInfo.lastName}`,
        currency: 'USD',
        isActive: true,
        accessToken: accessToken,
        refreshToken: refreshToken,
        updatedAt: new Date()
      }
    });

    return res.status(201).json({
      message: 'PayPal wallet connected successfully',
      data: {
        walletId: connectedWallet.id,
        provider: 'PayPal',
        email: userInfo.payerInfo.email
      },
      status_code: 201
    });

  } catch (error) {
    console.error('❌ PayPal callback error:', error);
    return res.status(500).json({
      message: error.message,
      status_code: 500
    });
  }
});
router.get('/paypal/callback/authorize', tryCatch(payPalCallbackAuthorize));
router.post(
  '/create-order/:paymentMethod',
  authMiddleware,
  tryCatch(createOrder),
);
router.post(
  '/authorize-payment/:paymentMethod',
  authMiddleware,
  tryCatch(authorizePayment),
);
router.post(
  '/capture-payment/:paymentMethod',
  authMiddleware,
  tryCatch(paymentCapture),
);

router.post(
  '/attach-payment-method/:paymentMethod',
  authMiddleware,
  tryCatch(attachPaymentMethod),
);

router.get('/transactions', authMiddleware, getTransactions);
router.get('/generateClientToken', generateClientToken);
router.get('/braintree/client-token', authMiddleware, generateClientToken);
router.get('/transactions-recipients', authMiddleware, getRecipients);

router.get('/paypal/success', (req, res) => {
  res.status(200).json({
    message: 'Success URL hit',
    status_code: 200
  });
});

router.get('/paypal/failure', (req, res) => {
  res.status(200).json({
    message: 'Failure URL hit',
    status_code: 200
  });
});

router.post(
  '/payout/google-pay',
  authMiddleware,
  tryCatch(async (req, res) => {
    const { amount, currency, paymentData } = req.body;
    const { recipientEmail } = paymentData.transferDetails;

    // Process the payout using PayPal's payout API
    const payoutResult = await paypalGateway.createPayout({
      amount,
      currency,
      recipientEmail,
      senderBatchId: `GPAY_${Date.now()}`,
      paymentSource: 'google_pay',
      paymentToken: paymentData.paymentToken
    });

    res.json(payoutResult);
  })
);

router.post('/create-recipient-token/wise', authMiddleware, tryCatch(createRecipientToken));
router.get('/wise/profiles', authMiddleware, tryCatch(getWiseProfiles));

router.get('/admin/transactions', getAllTransactions);
router.get('/admin/transactions/stats', getTransactionStats);
router.patch('/change-status/:id', changeTransactionStatus);

// Money Transfer Endpoint with Wallet Validation
router.post('/transfer', authMiddleware, async (req, res) => {
  console.log('🎯 /transfer endpoint HIT!');
  console.log('📦 Request body:', req.body);
  try {
    const userId = req.user.userId;
    const { amount, senderWallet, recipientWallet, recipientDetails, connectedWalletId } = req.body;

    // Validate required fields
    if (!amount || !senderWallet || !recipientWallet || !recipientDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, senderWallet, recipientWallet, recipientDetails'
      });
    }

    // Validate cross-wallet transfer
    // Wise can send to any bank (international transfers)
    // PayPal, Venmo, and Square must match exactly
    if (senderWallet.toLowerCase() !== 'wise' && 
        senderWallet.toLowerCase() !== recipientWallet.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: `${senderWallet} can only send to ${senderWallet} users. Cross-wallet transfers are not supported (except Wise for international transfers).`
      });
    }

    // Verify wallet connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log('🔍 Looking for wallet with userId:', userId, 'provider:', senderWallet.toUpperCase());
    let connectedWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: userId,
        provider: senderWallet.toUpperCase(),
        isActive: true
      }
    });
    console.log('🔍 First wallet query result:', connectedWallet);

    // If wallet not found in DB but connectedWalletId is provided (from localStorage),
    // try to find by ID (for cases where wallet exists but query doesn't return it)
    if (!connectedWallet && connectedWalletId) {
      console.log('🔍 Trying to find by ID:', connectedWalletId, 'userId:', userId);
      connectedWallet = await prisma.connectedWallets.findFirst({
        where: {
          id: parseInt(connectedWalletId),
          userId: userId,
          isActive: true
        }
      });
      console.log('🔍 Found wallet by ID:', connectedWallet);
    }
    
    // If still not found, let's check if the wallet exists but is inactive
    if (!connectedWallet && connectedWalletId) {
      const walletCheck = await prisma.connectedWallets.findUnique({
        where: { id: parseInt(connectedWalletId) }
      });
      console.log('🔍 Wallet exists in DB (any user/status):', walletCheck);
      
      // If wallet exists but is inactive, activate it
      if (walletCheck && walletCheck.userId === userId && !walletCheck.isActive) {
        console.log('🔄 Reactivating inactive wallet...');
        connectedWallet = await prisma.connectedWallets.update({
          where: { id: parseInt(connectedWalletId) },
          data: { 
            isActive: true,
            updatedAt: new Date()
          }
        });
        console.log('✅ Wallet reactivated:', connectedWallet.id);
      }
    }

    if (!connectedWallet) {
      return res.status(404).json({
        success: false,
        message: `${senderWallet} wallet is not connected. Please connect your wallet first.`
      });
    }

    // Create transaction record
    const transaction = await prisma.transactions.create({
      data: {
        userId: userId,
        amount: parseFloat(amount),
        currency: 'USD',
        provider: senderWallet.toUpperCase(),
        status: 'PENDING',
        recipientName: recipientDetails.username || recipientDetails.email,
        recipientEmail: recipientDetails.email || '',
        recipientPhone: recipientDetails.phone || '',
        recipientAccountNumber: recipientDetails.accountNumber || '',
        recipientCountry: recipientDetails.country || '',
        recipientSwiftCode: recipientDetails.swiftCode || '',
        recipientIban: recipientDetails.iban || '',
        recipientRoutingNumber: recipientDetails.routingNumber || '',
        metadata: JSON.stringify({
          recipientWallet: recipientWallet,
          recipientDetails: recipientDetails,
          connectedWalletId: connectedWalletId
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // In sandbox mode, simulate successful transfer
    // In production, you would integrate with actual payment gateway APIs
    const updatedTransaction = await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Transfer completed: $${amount} from ${senderWallet} to ${recipientWallet}`);

    return res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transactionId: updatedTransaction.id,
        amount: updatedTransaction.amount,
        status: updatedTransaction.status,
        provider: updatedTransaction.provider,
        recipientName: updatedTransaction.recipientName,
        createdAt: updatedTransaction.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Transfer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Transfer failed',
      error: error.message
    });
  }
});

// Simple Braintree Venmo endpoints for public access
router.get('/client_token', async (req, res) => {
  try {
    // Use the existing VenmoGateway class that's already configured
    const VenmoGateway = require('../paymentGateways/gateways/VenmoGateway');
    const venmoGateway = new VenmoGateway();
    
    const response = await venmoGateway.gateway.clientToken.generate({});
    
    console.log('✅ Successfully generated client token for Venmo');
    res.json({ clientToken: response.clientToken });
  } catch (error) {
    console.error('❌ Error generating client token:', error);
    res.status(500).json({ error: 'Failed to generate client token' });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { paymentMethodNonce, amount } = req.body;
    
    if (!paymentMethodNonce || !amount) {
      return res.status(400).json({ error: 'Payment method nonce and amount are required' });
    }

    // Use the existing VenmoGateway class
    const VenmoGateway = require('../paymentGateways/gateways/VenmoGateway');
    const venmoGateway = new VenmoGateway();

    const result = await venmoGateway.gateway.transaction.sale({
      amount: amount,
      paymentMethodNonce: paymentMethodNonce,
      options: { submitForSettlement: true },
    });

    if (result.success) {
      console.log('✅ Payment processed successfully:', result.transaction.id);
      res.json({
        success: true,
        transaction: {
          id: result.transaction.id,
          amount: result.transaction.amount,
          status: result.transaction.status,
          type: result.transaction.type,
          createdAt: result.transaction.createdAt
        }
      });
    } else {
      console.log('❌ Payment failed:', result.message);
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error processing checkout:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process payment' 
    });
  }
});

// PayPal OAuth Connect Routes
router.get('/paypal/connect', (req, res) => {
  try {
    const queryParams = new URLSearchParams({
      client_id: process.env.PAYPAL_CLIENT_ID,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: process.env.PAYPAL_REDIRECT_URI,
      state: 'random_state_string' // Add state for security
    });

    const paypalAuthUrl = `https://www.sandbox.paypal.com/signin/authorize?${queryParams.toString()}`;
    console.log('✅ Generated PayPal OAuth URL:', paypalAuthUrl);
    
    res.json({ url: paypalAuthUrl });
  } catch (error) {
    console.error('❌ Error generating PayPal OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate PayPal OAuth URL' });
  }
});

// PayPal OAuth Callback Route
router.post('/paypal/callback', async (req, res) => {
  const { code } = req.body;

  try {
    console.log('🔄 Processing PayPal OAuth callback with code:', code);
    
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    // Exchange code for access token
    const tokenResponse = await axios.post(
      process.env.PAYPAL_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('✅ Got PayPal access token');

    // Get user info
    const userInfoResponse = await axios.get(
      'https://api-m.sandbox.paypal.com/v1/identity/openidconnect/userinfo/?schema=openid',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`,
        },
      }
    );

    console.log('✅ Got PayPal user info:', userInfoResponse.data);

    res.json({
      success: true,
      access_token: tokenResponse.data.access_token,
      user: userInfoResponse.data,
    });
  } catch (error) {
    console.error('❌ PayPal OAuth callback error:', error.response?.data || error);
    res.status(400).json({ 
      success: false, 
      error: 'PayPal OAuth failed',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;
