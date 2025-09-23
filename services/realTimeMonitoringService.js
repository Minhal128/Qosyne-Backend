const { PrismaClient } = require('@prisma/client');
const walletService = require('./walletService');
const cron = require('node-cron');

const prisma = new PrismaClient();

class RealTimeMonitoringService {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.webhookStats = {
      received: 0,
      processed: 0,
      failed: 0,
      lastWebhook: null
    };
  }

  // Start real-time monitoring
  start() {
    if (this.isRunning) {
      console.log('⚠️  Real-time monitoring is already running');
      return;
    }

    console.log('🚀 Starting real-time wallet monitoring service...');
    this.isRunning = true;

    // Monitor wallet connections every 5 minutes
    this.scheduleWalletHealthCheck();
    
    // Monitor balances every 15 minutes
    this.scheduleBalanceSync();
    
    // Monitor stale connections every hour
    this.scheduleStaleConnectionCleanup();

    console.log('✅ Real-time monitoring service started');
  }

  // Stop monitoring
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Real-time monitoring is not running');
      return;
    }

    console.log('🛑 Stopping real-time monitoring service...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Stop all cron jobs
    cron.getTasks().forEach(task => task.stop());
    
    console.log('✅ Real-time monitoring service stopped');
  }

  // Schedule wallet health checks every 5 minutes
  scheduleWalletHealthCheck() {
    cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) return;
      
      console.log('🔍 Running wallet health check...');
      await this.checkWalletHealth();
    });
  }

  // Schedule balance sync every 15 minutes
  scheduleBalanceSync() {
    cron.schedule('*/15 * * * *', async () => {
      if (!this.isRunning) return;
      
      console.log('💰 Syncing wallet balances...');
      await this.syncAllBalances();
    });
  }

  // Schedule stale connection cleanup every hour
  scheduleStaleConnectionCleanup() {
    cron.schedule('0 * * * *', async () => {
      if (!this.isRunning) return;
      
      console.log('🧹 Cleaning up stale connections...');
      await this.cleanupStaleConnections();
    });
  }

  // Check health of all active wallet connections
  async checkWalletHealth() {
    try {
      const activeWallets = await prisma.connectedWallets.findMany({
        where: { isActive: true },
        select: {
          id: true,
          userId: true,
          provider: true,
          walletId: true,
          lastSync: true,
          accessToken: true,
          refreshToken: true
        }
      });

      console.log(`📊 Checking health of ${activeWallets.length} active wallets`);

      const healthResults = {
        healthy: 0,
        needsRefresh: 0,
        disconnected: 0,
        errors: []
      };

      for (const wallet of activeWallets) {
        try {
          // Check if wallet needs refresh (last sync > 1 hour ago)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (!wallet.lastSync || wallet.lastSync < oneHourAgo) {
            console.log(`🔄 Refreshing stale wallet: ${wallet.provider} (${wallet.walletId})`);
            
            const refreshResult = await walletService.refreshWalletConnection(wallet.userId, wallet.walletId);
            
            if (refreshResult.status === 'connected') {
              healthResults.healthy++;
            } else if (refreshResult.status === 'needs_reauth') {
              healthResults.needsRefresh++;
              console.log(`⚠️  Wallet needs re-authentication: ${wallet.provider} (${wallet.walletId})`);
            } else {
              healthResults.disconnected++;
              console.log(`❌ Wallet disconnected: ${wallet.provider} (${wallet.walletId})`);
            }
          } else {
            healthResults.healthy++;
          }
        } catch (error) {
          healthResults.errors.push({
            walletId: wallet.walletId,
            provider: wallet.provider,
            error: error.message
          });
          console.error(`❌ Health check failed for ${wallet.provider} (${wallet.walletId}):`, error.message);
        }
      }

      console.log(`📈 Health check results: ${healthResults.healthy} healthy, ${healthResults.needsRefresh} need refresh, ${healthResults.disconnected} disconnected, ${healthResults.errors.length} errors`);
      
      return healthResults;
    } catch (error) {
      console.error('❌ Wallet health check failed:', error);
      throw error;
    }
  }

  // Sync balances for all active wallets
  async syncAllBalances() {
    try {
      const activeWallets = await prisma.connectedWallets.findMany({
        where: { 
          isActive: true,
          provider: { in: ['PAYPAL', 'WISE', 'SQUARE', 'VENMO'] } // Only providers with balance APIs
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          walletId: true,
          accessToken: true,
          balance: true
        }
      });

      console.log(`💰 Syncing balances for ${activeWallets.length} wallets`);

      const syncResults = {
        synced: 0,
        failed: 0,
        unchanged: 0
      };

      for (const wallet of activeWallets) {
        try {
          const currentBalance = await walletService.getWalletBalance(wallet.userId, wallet.walletId);
          
          if (currentBalance.amount !== wallet.balance) {
            await prisma.connectedWallets.update({
              where: { id: wallet.id },
              data: {
                balance: currentBalance.amount,
                lastSync: new Date(),
                updatedAt: new Date()
              }
            });
            
            syncResults.synced++;
            console.log(`💰 Balance updated for ${wallet.provider} (${wallet.walletId}): ${wallet.balance} → ${currentBalance.amount} ${currentBalance.currency}`);
          } else {
            syncResults.unchanged++;
          }
        } catch (error) {
          syncResults.failed++;
          console.error(`❌ Balance sync failed for ${wallet.provider} (${wallet.walletId}):`, error.message);
        }
      }

      console.log(`📊 Balance sync results: ${syncResults.synced} updated, ${syncResults.unchanged} unchanged, ${syncResults.failed} failed`);
      
      return syncResults;
    } catch (error) {
      console.error('❌ Balance sync failed:', error);
      throw error;
    }
  }

  // Clean up stale connections (inactive for > 24 hours)
  async cleanupStaleConnections() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const staleWallets = await prisma.connectedWallets.findMany({
        where: {
          isActive: true,
          lastSync: {
            lt: twentyFourHoursAgo
          }
        },
        select: {
          id: true,
          provider: true,
          walletId: true,
          lastSync: true
        }
      });

      console.log(`🧹 Found ${staleWallets.length} stale connections`);

      if (staleWallets.length > 0) {
        // Mark as inactive rather than deleting
        const updateResult = await prisma.connectedWallets.updateMany({
          where: {
            id: { in: staleWallets.map(w => w.id) }
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        console.log(`🧹 Marked ${updateResult.count} stale connections as inactive`);
        
        // Log the stale connections for review
        staleWallets.forEach(wallet => {
          console.log(`   • ${wallet.provider} (${wallet.walletId}) - last sync: ${wallet.lastSync}`);
        });
      }

      return staleWallets.length;
    } catch (error) {
      console.error('❌ Stale connection cleanup failed:', error);
      throw error;
    }
  }

  // Record webhook statistics
  recordWebhookEvent(provider, eventType, success = true) {
    this.webhookStats.received++;
    
    if (success) {
      this.webhookStats.processed++;
    } else {
      this.webhookStats.failed++;
    }
    
    this.webhookStats.lastWebhook = {
      provider,
      eventType,
      timestamp: new Date(),
      success
    };

    console.log(`📡 Webhook received: ${provider} - ${eventType} (${success ? 'success' : 'failed'})`);
  }

  // Get monitoring statistics
  getStats() {
    return {
      isRunning: this.isRunning,
      webhooks: { ...this.webhookStats },
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  // Manual trigger for immediate sync
  async triggerImmediateSync() {
    console.log('🚀 Triggering immediate wallet sync...');
    
    const results = await Promise.allSettled([
      this.checkWalletHealth(),
      this.syncAllBalances()
    ]);

    const healthResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const balanceResult = results[1].status === 'fulfilled' ? results[1].value : null;

    console.log('✅ Immediate sync completed');
    
    return {
      health: healthResult,
      balances: balanceResult,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
const realTimeMonitoringService = new RealTimeMonitoringService();

// Auto-start monitoring if in production
if (process.env.NODE_ENV === 'production') {
  realTimeMonitoringService.start();
}

module.exports = realTimeMonitoringService;
