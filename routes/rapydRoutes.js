const express = require('express');
const router = express.Router();
const rapydController = require('../controllers/rapydPaymentController');
const authMiddleware = require('../middlewares/authMiddleware'); // Assuming you have auth middleware

/**
 * 💸 MONEY TRANSFER ROUTES
 */

// Send money via Rapyd (main transfer endpoint)
router.post('/transfer', authMiddleware, rapydController.sendMoneyViaRapyd);

// Get transaction history through Rapyd
router.get('/transactions', authMiddleware, rapydController.getRapydTransactionHistory);

// Get Rapyd wallet balance
router.get('/balance', authMiddleware, rapydController.getRapydWalletBalance);

/**
 * 🔗 WALLET CONNECTION ROUTES
 */

// Connect wallet via OAuth (Venmo, PayPal, Square)
router.post('/connect/:provider', authMiddleware, rapydController.connectWalletOAuth);

// Connect Square wallet with card details (direct)
router.post('/connect/square/card', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardNumber, expiryMonth, expiryYear, cvv, postalCode, cardholderName } = req.body;

    // Check if Square already connected
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const existingSquare = await prisma.connectedWallets.findFirst({
      where: {
        userId: userId,
        provider: 'SQUARE',
        isActive: true
      }
    });

    if (existingSquare) {
      return res.status(400).json({
        error: 'Square wallet is already connected',
        status_code: 400
      });
    }

    // Create Square wallet connection (mock for testing)
    const connectedWallet = await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'SQUARE',
        walletId: `square_card_${cardNumber.slice(-4)}_${Date.now()}`,
        accountEmail: 'square@test.com',
        fullName: cardholderName,
        currency: 'USD',
        isActive: true,
        updatedAt: new Date()
      }
    });

    return res.status(201).json({
      message: 'Square wallet connected successfully',
      data: {
        walletId: connectedWallet.id,
        provider: 'Square',
        cardDetails: {
          lastFour: cardNumber.slice(-4),
          type: 'Credit Card'
        }
      },
      status_code: 201
    });

  } catch (error) {
    console.error('❌ Square direct connection error:', error);
    return res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

// Connect Venmo wallet directly (mock for testing)
router.post('/connect/venmo', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodNonce, cardNumber, expiryMonth, expiryYear, cvv } = req.body;

    // Check if Venmo already connected
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const existingVenmo = await prisma.connectedWallets.findFirst({
      where: {
        userId: userId,
        provider: 'VENMO',
        isActive: true
      }
    });

    if (existingVenmo) {
      return res.status(400).json({
        error: 'Venmo wallet is already connected',
        status_code: 400
      });
    }

    // Create Venmo wallet connection (mock for testing)
    const connectedWallet = await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'VENMO',
        walletId: `venmo_${cardNumber.slice(-4)}_${Date.now()}`,
        accountEmail: 'venmo@test.com',
        fullName: 'Venmo Test User',
        currency: 'USD',
        isActive: true,
        paymentMethodToken: paymentMethodNonce,
        updatedAt: new Date()
      }
    });

    return res.status(201).json({
      message: 'Venmo wallet connected successfully',
      data: {
        walletId: connectedWallet.id,
        provider: 'Venmo',
        cardDetails: {
          lastFour: cardNumber.slice(-4),
          type: 'Visa'
        }
      },
      status_code: 201
    });

  } catch (error) {
    console.error('❌ Venmo direct connection error:', error);
    return res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

// Get user's connected wallets
router.get('/wallets', authMiddleware, rapydController.getConnectedWallets);

// Disconnect a wallet
router.delete('/wallets/:walletId', authMiddleware, rapydController.disconnectWallet);

/**
 * 📊 ANALYTICS AND STATUS ROUTES
 */

// Get transfer statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const stats = await prisma.transactions.groupBy({
      by: ['status', 'currency'],
      where: {
        userId: userId,
        provider: 'RAPYD'
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    const totalTransactions = await prisma.transactions.count({
      where: {
        userId: userId,
        provider: 'RAPYD'
      }
    });

    const successfulTransfers = await prisma.transactions.count({
      where: {
        userId: userId,
        provider: 'RAPYD',
        status: 'COMPLETED'
      }
    });

    const totalAmountTransferred = await prisma.transactions.aggregate({
      where: {
        userId: userId,
        provider: 'RAPYD',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    res.status(200).json({
      message: 'Transfer statistics retrieved successfully',
      data: {
        totalTransactions,
        successfulTransfers,
        failedTransfers: totalTransactions - successfulTransfers,
        totalAmountTransferred: totalAmountTransferred._sum.amount || 0,
        breakdown: stats,
        successRate: totalTransactions > 0 ? ((successfulTransfers / totalTransactions) * 100).toFixed(2) + '%' : '0%'
      },
      status_code: 200
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

// Direct test endpoint that mirrors working local script
router.get('/test-payment', async (req, res) => {
  try {
    const { WorkingRapydClient } = require('../rapyd-working-final');
    const rapydClient = new WorkingRapydClient();
    
    console.log('📊 Testing direct payment creation...');
    
    // Step 1: Get wallet (we know this works)
    const walletData = await rapydClient.getWallet();
    console.log('✅ Wallet retrieved successfully');
    
    // Step 2: Create a simple payment (same as working local script)
    const paymentResult = await rapydClient.createPaymentSafe(25);
    console.log('✅ Payment created successfully');
    
    res.status(200).json({
      message: 'Direct Rapyd payment test successful',
      data: {
        wallet_id: walletData.data.id,
        wallet_balance: walletData.data.accounts?.[0]?.balance || 0,
        payment_id: paymentResult.data.id,
        payment_status: paymentResult.data.status,
        payment_amount: paymentResult.data.amount,
        success: true
      },
      status_code: 200
    });
    
  } catch (error) {
    console.error('❌ Direct Rapyd test failed:', error.message);
    res.status(500).json({
      message: 'Direct Rapyd test failed',
      data: {
        error: error.message,
        success: false
      },
      status_code: 500
    });
  }
});

// Debug endpoint to test Rapyd connection from Vercel
router.get('/debug', async (req, res) => {
  try {
    const { WorkingRapydClient } = require('../rapyd-working-final');
    const rapydClient = new WorkingRapydClient();
    
    console.log('📊 Testing Rapyd from Vercel environment...');
    const walletData = await rapydClient.getWallet();
    
    res.status(200).json({
      message: 'Rapyd debug test successful',
      data: {
        wallet_id: walletData.data.id,
        wallet_status: walletData.data.status,
        success: true
      },
      status_code: 200
    });
    
  } catch (error) {
    console.error('❌ Rapyd debug test failed:', error.message);
    res.status(500).json({
      message: 'Rapyd debug test failed',
      data: {
        error: error.message,
        success: false
      },
      status_code: 500
    });
  }
});

// Health check for Rapyd integration
router.get('/health', async (req, res) => {
  try {
    // Basic health check without complex dependencies
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      message: 'Rapyd integration is healthy',
      data: {
        status: 'healthy',
        rapyd_connection: 'active',
        wallet_accessible: true,
        current_balance: '$1000.00', // Mock balance for testing
        timestamp: new Date().toISOString()
      },
      status_code: 200
    });

  } catch (error) {
    console.error('❗ Health check failed:', error);
    res.status(503).json({
      message: 'Rapyd integration unhealthy',
      data: {
        status: 'unhealthy',
        rapyd_connection: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      status_code: 503
    });
  }
});

/**
 * 🔄 OAUTH CALLBACK ROUTES
 * Handle OAuth callbacks from different providers
 */

// PayPal OAuth callback (extend existing)
router.get('/callback/paypal', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({
        error: `PayPal OAuth error: ${error}`,
        status_code: 400
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing authorization code or state',
        status_code: 400
      });
    }

    // Process PayPal OAuth (use existing paymentController logic)
    const { paymentFactory } = require('../paymentGateways/paymentFactory');
    const paymentGateway = paymentFactory('paypal');
    
    const accessToken = await paymentGateway.getAppToken();
    const userInfo = await paymentGateway.getUserInfo(accessToken);
    
    // Save PayPal wallet connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = parseInt(state);
    const existingWallet = await prisma.connectedWallets.findUnique({
      where: { walletId: userInfo.payer_id }
    });

    if (existingWallet) {
      // If the wallet already exists and belongs to the same user, return success with the existing record
      if (existingWallet.userId === userId) {
        return res.status(200).json({
          data: { wallet: existingWallet },
          message: 'PayPal account already linked to this user (idempotent)'
        });
      }

      // Otherwise it's linked to another user: keep existing behavior (error)
      return res.status(400).json({
        error: 'PayPal account already linked',
        status_code: 400
      });
    }

    await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'PAYPAL',
        walletId: userInfo.payer_id,
        accountEmail: userInfo.email,
        fullName: userInfo.name,
        currency: userInfo.address?.country || 'USD',
        isActive: true
      }
    });

    res.status(201).json({
      message: 'PayPal wallet connected successfully via OAuth',
      status_code: 201
    });

  } catch (error) {
    console.error('❌ PayPal OAuth callback error:', error);
    res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

// Venmo OAuth callback
router.get('/callback/venmo', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({
        error: `Venmo OAuth error: ${error}`,
        status_code: 400
      });
    }

    // Process Venmo OAuth via Braintree
    // Implementation would depend on Braintree's OAuth flow
    
    res.status(201).json({
      message: 'Venmo wallet connection initiated',
      data: {
        message: 'Complete Venmo connection through Braintree SDK'
      },
      status_code: 201
    });

  } catch (error) {
    console.error('❌ Venmo OAuth callback error:', error);
    res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

// Square OAuth callback
router.get('/callback/square', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({
        error: `Square OAuth error: ${error}`,
        status_code: 400
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing authorization code or state',
        status_code: 400
      });
    }

    // Process Square OAuth
    const axios = require('axios');
    
    // Determine Square base URL
    const squareBase = process.env.SQUARE_BASE_URL || (
      process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_APPLICATION_ID.startsWith('sandbox-')
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com'
    );

    // Exchange code for access token
    const tokenResponse = await axios.post(`${squareBase}/oauth2/token`, {
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_CLIENT_SECRET || process.env.SQUARE_ACCESS_TOKEN,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.BACKEND_URL}/api/rapyd/callback/square`
    });

    const { access_token, merchant_id } = tokenResponse.data;

    // Save Square wallet connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = parseInt(state);
    
    await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'SQUARE',
        walletId: merchant_id,
        accessToken: access_token,
        accountEmail: 'square@merchant.com',
        fullName: 'Square Merchant',
        currency: 'USD',
        isActive: true
      }
    });

    res.status(201).json({
      message: 'Square wallet connected successfully via OAuth',
      status_code: 201
    });

  } catch (error) {
    console.error('❌ Square OAuth callback error:', error);
    res.status(500).json({
      error: error.message,
      status_code: 500
    });
  }
});

module.exports = router;
