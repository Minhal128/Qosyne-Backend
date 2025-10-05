// 🌐 API Integration Demo for Frontend
// This shows how to create endpoints that your React frontend can call

const express = require('express');
const cors = require('cors');
const { VenmoWiseTransactionSimulation } = require('./venmo-wise-simulation');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Global transaction manager (in production, use database)
const transactionManager = new VenmoWiseTransactionSimulation();

// 🔗 GET /api/wallets - Get connected wallets
app.get('/api/wallets', async (req, res) => {
  try {
    console.log('📱 Frontend requested wallet connections');
    
    // Simulate wallet connections if not already done
    if (transactionManager.walletConnections.size === 0) {
      const { venmoConnection, wiseConnection } = transactionManager.simulateWalletConnections();
    }

    const wallets = Array.from(transactionManager.walletConnections.values()).map(wallet => ({
      id: wallet.id,
      provider: wallet.provider,
      accountName: wallet.accountName,
      accountEmail: wallet.accountEmail,
      balance: transactionManager.walletBalances[wallet.accountId]?.balance || 0,
      currency: transactionManager.walletBalances[wallet.accountId]?.currency || 'USD',
      status: wallet.status,
      connectedAt: wallet.connectedAt,
      // Include provider-specific details
      ...(wallet.provider === 'VENMO' && {
        braintreeCustomerId: wallet.braintreeCustomerId,
        paymentMethodToken: wallet.paymentMethodToken
      }),
      ...(wallet.provider === 'WISE' && {
        wiseProfileId: wallet.wiseProfileId,
        iban: wallet.iban,
        recipientToken: wallet.recipientToken
      })
    }));

    res.json({
      success: true,
      data: wallets,
      count: wallets.length
    });

  } catch (error) {
    console.error('❌ Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 💸 POST /api/transfer - Initiate Venmo to Wise transfer
app.post('/api/transfer', async (req, res) => {
  try {
    const { amount, description, fromWallet, toWallet } = req.body;
    
    console.log('🚀 Frontend initiated transfer:', {
      amount,
      description,
      fromWallet: fromWallet?.provider,
      toWallet: toWallet?.provider
    });

    // Validate request
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    if (fromWallet?.provider !== 'VENMO' || toWallet?.provider !== 'WISE') {
      return res.status(400).json({
        success: false,
        error: 'This demo only supports Venmo to Wise transfers'
      });
    }

    // Check balance
    const venmoBalance = transactionManager.walletBalances.venmo_user1?.balance || 0;
    if (venmoBalance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient Venmo balance. Available: $${venmoBalance.toFixed(2)}`
      });
    }

    // Initiate transfer
    const result = await transactionManager.processVenmoToWiseTransfer(amount, description);

    // Return successful response
    res.json({
      success: true,
      data: {
        transferId: result.id,
        status: result.status,
        originalAmount: result.originalAmount,
        finalAmount: result.finalAmount,
        totalFees: result.totalFees,
        exchangeRate: result.exchangeRate,
        estimatedDuration: '3-5 seconds',
        createdAt: result.createdAt,
        completedAt: result.completedAt,
        components: {
          venmo: result.venmoTransaction,
          rapyd: {
            payment: result.rapydPayment,
            payout: result.rapydPayout
          },
          wise: result.wiseTransaction
        }
      }
    });

  } catch (error) {
    console.error('❌ Transfer failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/transactions - Get transaction history
app.get('/api/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    console.log('📱 Frontend requested transactions');

    let transactions = transactionManager.transactions;

    // Filter by status if provided
    if (status) {
      transactions = transactions.filter(tx => tx.status === status.toUpperCase());
    }

    // Filter by type if provided
    if (type) {
      transactions = transactions.filter(tx => tx.type === type.toUpperCase());
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    // Format for frontend
    const formattedTransactions = paginatedTransactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      description: tx.description,
      originalAmount: tx.originalAmount,
      finalAmount: tx.finalAmount,
      totalFees: tx.totalFees,
      exchangeRate: tx.exchangeRate,
      sourceWallet: tx.sourceWallet,
      targetWallet: tx.targetWallet,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      duration: tx.duration ? Math.round(tx.duration / 1000) : null,
      proxyUsed: tx.proxyUsed,
      crossBorder: tx.crossBorder,
      // Component details for tracking
      components: tx.status === 'COMPLETED' ? {
        venmo: tx.venmoTransaction?.id,
        rapydPayment: tx.rapydPayment?.id,
        rapydPayout: tx.rapydPayout?.id,
        wise: tx.wiseTransaction?.id
      } : null,
      error: tx.error || null
    }));

    res.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        currentPage: parseInt(page),
        totalTransactions: transactions.length,
        totalPages: Math.ceil(transactions.length / limit),
        hasNextPage: endIndex < transactions.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 GET /api/analytics - Get transaction analytics
app.get('/api/analytics', async (req, res) => {
  try {
    console.log('📱 Frontend requested analytics');
    
    const analytics = transactionManager.generateAnalytics();
    
    res.json({
      success: true,
      data: {
        ...analytics,
        walletBalances: {
          venmo: {
            balance: transactionManager.walletBalances.venmo_user1.balance,
            currency: 'USD'
          },
          wise: {
            balance: transactionManager.walletBalances.wise_user1.balance,
            currency: 'EUR'
          },
          rapyd: {
            balance: transactionManager.walletBalances.rapyd_bridge.balance,
            currency: 'USD'
          }
        },
        exchangeRates: transactionManager.exchangeRates,
        proxyStatus: {
          enabled: true,
          workingProxy: 'http://140.174.52.105:8888',
          bypassingRestrictions: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔍 GET /api/transfer/:id - Get specific transfer details
app.get('/api/transfer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📱 Frontend requested transfer details for:', id);

    const transaction = transactionManager.transactions.find(tx => 
      tx.id === id || tx.id.startsWith(id)
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        // Add real-time status for frontend
        realTimeStatus: transaction.status === 'COMPLETED' ? 'settled' : 'processing',
        trackingUrl: `https://qosynebackend.vercel.app/track/${transaction.id}`,
        supportUrl: `https://qosyncefrontend.vercel.app/support?ref=${transaction.id}`
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transfer details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🧪 GET /api/demo/reset - Reset demo data
app.get('/api/demo/reset', async (req, res) => {
  try {
    console.log('🔄 Frontend requested demo reset');
    
    // Reset balances
    transactionManager.walletBalances = {
      venmo_user1: { balance: 1000.00, currency: 'USD' },
      wise_user1: { balance: 850.00, currency: 'EUR' },
      rapyd_bridge: { balance: 10000.00, currency: 'USD' }
    };
    
    // Clear transactions
    transactionManager.transactions = [];
    transactionManager.transactionHistory = [];
    
    // Re-establish wallet connections
    transactionManager.walletConnections.clear();
    const { venmoConnection, wiseConnection } = transactionManager.simulateWalletConnections();
    
    res.json({
      success: true,
      message: 'Demo data reset successfully',
      data: {
        walletsConnected: 2,
        balancesReset: true,
        transactionsCleared: true
      }
    });

  } catch (error) {
    console.error('❌ Error resetting demo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🚀 Frontend Integration Guide Endpoint
app.get('/api/integration-guide', (req, res) => {
  res.json({
    title: 'Venmo to Wise Integration API Guide',
    description: 'Complete API endpoints for frontend integration',
    baseUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    endpoints: {
      wallets: {
        method: 'GET',
        path: '/api/wallets',
        description: 'Get connected wallets with balances',
        response: 'Array of wallet objects'
      },
      transfer: {
        method: 'POST',
        path: '/api/transfer',
        description: 'Initiate Venmo to Wise transfer',
        body: {
          amount: 'number (required)',
          description: 'string (optional)',
          fromWallet: 'object (required)',
          toWallet: 'object (required)'
        }
      },
      transactions: {
        method: 'GET',
        path: '/api/transactions',
        description: 'Get transaction history with pagination',
        queryParams: 'page, limit, status, type'
      },
      analytics: {
        method: 'GET',
        path: '/api/analytics',
        description: 'Get comprehensive transaction analytics'
      },
      transferDetails: {
        method: 'GET',
        path: '/api/transfer/:id',
        description: 'Get specific transfer details'
      }
    },
    features: [
      'Proxy-enabled cross-border transfers',
      'Real-time transaction tracking',
      'Comprehensive fee calculation',
      'Multi-currency support',
      'Complete audit trail',
      'Error handling and recovery'
    ],
    testCredentials: {
      venmo: {
        merchantId: process.env.BT_MERCHANT_ID,
        environment: 'sandbox'
      },
      wise: {
        profileId: process.env.WISE_PROFILE_ID,
        environment: 'sandbox'
      },
      rapyd: {
        environment: 'sandbox',
        proxyEnabled: true
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Venmo-Wise API Server Started');
  console.log('=' .repeat(50));
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔗 Backend URL: ${process.env.BACKEND_URL || \`http://localhost:\${PORT}\`}`);
  console.log('\\n📋 Available Endpoints:');
  console.log('GET  /api/wallets - Get connected wallets');
  console.log('POST /api/transfer - Initiate transfer');
  console.log('GET  /api/transactions - Get transaction history');
  console.log('GET  /api/analytics - Get analytics');
  console.log('GET  /api/transfer/:id - Get transfer details');
  console.log('GET  /api/demo/reset - Reset demo data');
  console.log('GET  /api/integration-guide - Integration guide');
  console.log('\\n🎯 Ready for frontend integration!');
  
  // Initialize wallet connections
  const { venmoConnection, wiseConnection } = transactionManager.simulateWalletConnections();
  console.log('\\n✅ Demo wallets initialized and ready');
});

module.exports = { app, transactionManager };
