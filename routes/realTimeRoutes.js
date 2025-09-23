const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');
const realTimeMonitoringService = require('../services/realTimeMonitoringService');
const walletService = require('../services/walletService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get real-time monitoring dashboard
router.get('/dashboard', authMiddleware, tryCatch(async (req, res) => {
  const stats = realTimeMonitoringService.getStats();
  
  // Get active connections count by provider
  const connectionStats = await prisma.connectedWallets.groupBy({
    by: ['provider'],
    where: { isActive: true },
    _count: { id: true }
  });

  // Get recent transactions
  const recentTransactions = await prisma.transactions.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      provider: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Get wallet health summary
  const walletHealth = await prisma.connectedWallets.findMany({
    where: { isActive: true },
    select: {
      provider: true,
      lastSync: true,
      isActive: true
    }
  });

  const healthSummary = walletHealth.reduce((acc, wallet) => {
    if (!acc[wallet.provider]) {
      acc[wallet.provider] = { total: 0, healthy: 0, stale: 0 };
    }
    acc[wallet.provider].total++;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (wallet.lastSync && wallet.lastSync > oneHourAgo) {
      acc[wallet.provider].healthy++;
    } else {
      acc[wallet.provider].stale++;
    }
    
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      monitoring: stats,
      connections: connectionStats.reduce((acc, stat) => {
        acc[stat.provider] = stat._count.id;
        return acc;
      }, {}),
      health: healthSummary,
      recentTransactions,
      timestamp: new Date().toISOString()
    }
  });
}));

// Trigger immediate sync for user's wallets
router.post('/sync', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.id;
  
  // Get user's active wallets
  const userWallets = await prisma.connectedWallets.findMany({
    where: { userId, isActive: true },
    select: { walletId: true, provider: true }
  });

  const syncResults = [];
  
  for (const wallet of userWallets) {
    try {
      const result = await walletService.refreshWalletConnection(userId, wallet.walletId);
      syncResults.push({
        provider: wallet.provider,
        walletId: wallet.walletId,
        status: result.status,
        lastSync: result.lastSync,
        success: true
      });
    } catch (error) {
      syncResults.push({
        provider: wallet.provider,
        walletId: wallet.walletId,
        error: error.message,
        success: false
      });
    }
  }

  res.json({
    success: true,
    data: {
      syncResults,
      totalWallets: userWallets.length,
      successfulSyncs: syncResults.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    }
  });
}));

// Get real-time balance for specific wallet
router.get('/balance/:walletId', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.id;
  const { walletId } = req.params;
  
  const balance = await walletService.getWalletBalance(userId, walletId);
  
  res.json({
    success: true,
    data: {
      walletId,
      balance: balance.amount,
      currency: balance.currency,
      lastUpdated: balance.lastUpdated,
      timestamp: new Date().toISOString()
    }
  });
}));

// Get connection health for user's wallets
router.get('/health', authMiddleware, tryCatch(async (req, res) => {
  const userId = req.user.id;
  
  const wallets = await prisma.connectedWallets.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      provider: true,
      walletId: true,
      lastSync: true,
      isActive: true,
      balance: true,
      currency: true,
      createdAt: true
    }
  });

  const healthData = wallets.map(wallet => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isHealthy = wallet.lastSync && wallet.lastSync > oneHourAgo;
    
    return {
      id: wallet.id,
      provider: wallet.provider,
      walletId: wallet.walletId,
      status: isHealthy ? 'healthy' : 'stale',
      lastSync: wallet.lastSync,
      balance: wallet.balance,
      currency: wallet.currency,
      connectedSince: wallet.createdAt,
      needsRefresh: !isHealthy
    };
  });

  const summary = {
    total: wallets.length,
    healthy: healthData.filter(w => w.status === 'healthy').length,
    stale: healthData.filter(w => w.status === 'stale').length,
    providers: [...new Set(wallets.map(w => w.provider))]
  };

  res.json({
    success: true,
    data: {
      wallets: healthData,
      summary,
      timestamp: new Date().toISOString()
    }
  });
}));

// Start/stop monitoring service (admin only)
router.post('/monitoring/start', authMiddleware, tryCatch(async (req, res) => {
  // Add admin check here if needed
  realTimeMonitoringService.start();
  
  res.json({
    success: true,
    message: 'Real-time monitoring started',
    timestamp: new Date().toISOString()
  });
}));

router.post('/monitoring/stop', authMiddleware, tryCatch(async (req, res) => {
  // Add admin check here if needed
  realTimeMonitoringService.stop();
  
  res.json({
    success: true,
    message: 'Real-time monitoring stopped',
    timestamp: new Date().toISOString()
  });
}));

// Get webhook statistics
router.get('/webhooks/stats', authMiddleware, tryCatch(async (req, res) => {
  const stats = realTimeMonitoringService.getStats();
  
  res.json({
    success: true,
    data: {
      webhooks: stats.webhooks,
      timestamp: new Date().toISOString()
    }
  });
}));

// Test webhook endpoint connectivity
router.post('/webhooks/test', authMiddleware, tryCatch(async (req, res) => {
  const { provider } = req.body;
  
  const webhookUrls = {
    PAYPAL: `${process.env.BACKEND_URL}/api/webhooks/paypal`,
    WISE: `${process.env.BACKEND_URL}/api/webhooks/wise`,
    SQUARE: `${process.env.BACKEND_URL}/api/webhooks/square`,
    VENMO: `${process.env.BACKEND_URL}/api/webhooks/venmo`
  };

  const testResults = {};
  const providersToTest = provider ? [provider] : Object.keys(webhookUrls);

  for (const providerName of providersToTest) {
    try {
      const axios = require('axios');
      const response = await axios.post(webhookUrls[providerName], 
        { test: true, timestamp: new Date().toISOString() }, 
        { 
          timeout: 5000,
          validateStatus: (status) => status < 500 
        }
      );
      
      testResults[providerName] = {
        success: true,
        status: response.status,
        url: webhookUrls[providerName]
      };
    } catch (error) {
      testResults[providerName] = {
        success: false,
        error: error.message,
        url: webhookUrls[providerName]
      };
    }
  }

  res.json({
    success: true,
    data: {
      testResults,
      timestamp: new Date().toISOString()
    }
  });
}));

module.exports = router;
