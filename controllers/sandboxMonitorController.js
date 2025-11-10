/**
 * Sandbox Monitoring Controller
 * Provides dashboard to view all transactions in their respective sandbox environments
 * Similar to Stripe's transaction viewing experience
 */

const routingEngine = require('../services/routingEngine');
const ledgerService = require('../services/ledgerService');

class SandboxMonitorController {
  /**
   * Get all transactions across all providers
   */
  async getAllTransactions(req, res) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'BUSINESS';

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        limit = 100, 
        offset = 0, 
        provider, 
        status,
        startDate,
        endDate,
      } = req.query;

      // Get transactions from internal ledger
      const transactions = await ledgerService.getTransactions(
        isAdmin ? undefined : userId, 
        {
          limit: parseInt(limit),
          offset: parseInt(offset),
          provider: provider?.toUpperCase(),
          status: status?.toUpperCase(),
        }
      );

      // Format for dashboard view
      const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        internalId: tx.id,
        externalId: tx.paymentId,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        provider: tx.provider,
        type: tx.type,
        status: tx.status,
        createdAt: tx.createdAt,
        sender: {
          id: tx.userId,
          name: tx.users?.name,
          email: tx.users?.email,
        },
        recipient: tx.transactionRecipients ? {
          name: tx.transactionRecipients.recipientName,
          email: tx.transactionRecipients.recipientEmail,
          walletId: tx.transactionRecipients.recipientWalletId,
          account: tx.transactionRecipients.recipientAccount,
        } : null,
        sandboxUrl: this._getSandboxUrl(tx.provider, tx.paymentId),
      }));

      return res.status(200).json({
        transactions: formattedTransactions,
        total: formattedTransactions.length,
        providers: this._getProviderStats(formattedTransactions),
      });
    } catch (error) {
      console.error('Get all transactions error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve transactions' 
      });
    }
  }

  /**
   * Get transactions for specific provider
   */
  async getProviderTransactions(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { provider } = req.params;
      const providerUpper = provider.toUpperCase();

      // Get connector instance
      const connector = routingEngine.getConnectorInstance(providerUpper);
      
      if (!connector) {
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
      }

      // Get user's wallet for this provider
      const wallet = await ledgerService.getConnectedWalletByProvider(userId, providerUpper);
      
      if (!wallet) {
        return res.status(404).json({ 
          error: `${provider} wallet not connected` 
        });
      }

      // Fetch transactions from provider
      let providerTransactions = [];
      
      try {
        providerTransactions = await connector.searchTransactions({
          customerId: wallet.customerId,
          limit: 50,
        });
      } catch (error) {
        console.error(`Error fetching ${provider} transactions:`, error);
      }

      // Get internal transactions for comparison
      const internalTransactions = await ledgerService.getTransactions(userId, {
        provider: providerUpper,
        limit: 50,
      });

      return res.status(200).json({
        provider: providerUpper,
        wallet: {
          id: wallet.id,
          accountEmail: wallet.accountEmail,
          balance: parseFloat(wallet.balance),
          currency: wallet.currency,
        },
        sandboxUrl: connector.getSandboxUrl(),
        transactions: {
          internal: internalTransactions.map(tx => ({
            id: tx.id,
            paymentId: tx.paymentId,
            amount: parseFloat(tx.amount),
            currency: tx.currency,
            status: tx.status,
            type: tx.type,
            createdAt: tx.createdAt,
          })),
          provider: providerTransactions,
        },
      });
    } catch (error) {
      console.error('Get provider transactions error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve provider transactions' 
      });
    }
  }

  /**
   * Get sandbox links for all connected providers
   */
  async getSandboxLinks(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const connectedWallets = await ledgerService.getConnectedWallets(userId);

      const sandboxLinks = connectedWallets.map(wallet => {
        const connector = routingEngine.getConnectorInstance(wallet.provider);
        return {
          provider: wallet.provider,
          accountEmail: wallet.accountEmail,
          sandboxUrl: connector ? connector.getSandboxUrl() : null,
          customerId: wallet.customerId,
        };
      });

      // Add general sandbox links
      const generalLinks = {
        PAYPAL: {
          dashboard: 'https://sandbox.braintreegateway.com/merchants/' + process.env.BT_MERCHANT_ID,
          login: 'https://www.sandbox.paypal.com/',
        },
        WISE: {
          dashboard: `https://sandbox.transferwise.tech/user/account/${process.env.WISE_PROFILE_ID}`,
          api: 'https://sandbox.transferwise.tech/',
        },
        SQUARE: {
          dashboard: 'https://squareupsandbox.com/dashboard/',
          developer: 'https://developer.squareup.com/apps',
        },
      };

      return res.status(200).json({
        connectedProviders: sandboxLinks,
        generalSandboxLinks: generalLinks,
      });
    } catch (error) {
      console.error('Get sandbox links error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve sandbox links' 
      });
    }
  }

  /**
   * Get transaction by provider payment ID
   */
  async getTransactionByPaymentId(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { provider, paymentId } = req.params;
      const providerUpper = provider.toUpperCase();

      // Get connector
      const connector = routingEngine.getConnectorInstance(providerUpper);
      
      if (!connector) {
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
      }

      // Fetch from provider
      const providerTransaction = await connector.getTransaction(paymentId);

      // Find in internal ledger
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const internalTransaction = await prisma.transactions.findFirst({
        where: {
          paymentId: paymentId,
          provider: providerUpper,
        },
        include: {
          transactionRecipients: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        internal: internalTransaction ? {
          id: internalTransaction.id,
          amount: parseFloat(internalTransaction.amount),
          currency: internalTransaction.currency,
          status: internalTransaction.status,
          type: internalTransaction.type,
          createdAt: internalTransaction.createdAt,
          sender: internalTransaction.users,
          recipient: internalTransaction.transactionRecipients,
        } : null,
        provider: providerTransaction,
        sandboxUrl: this._getSandboxUrl(providerUpper, paymentId),
      });
    } catch (error) {
      console.error('Get transaction by payment ID error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve transaction' 
      });
    }
  }

  /**
   * Get system-wide statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'BUSINESS';

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const where = isAdmin ? {} : { userId };

      // Get transaction counts by provider
      const transactionsByProvider = await prisma.transactions.groupBy({
        by: ['provider', 'status'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      });

      // Get total balances
      const wallets = await prisma.wallet.findMany({
        where: isAdmin ? {} : { userId },
      });

      const totalBalance = wallets.reduce((sum, wallet) => 
        sum + parseFloat(wallet.balance), 0
      );

      // Format statistics
      const providerStats = {};
      transactionsByProvider.forEach(stat => {
        if (!providerStats[stat.provider]) {
          providerStats[stat.provider] = {
            total: 0,
            pending: 0,
            completed: 0,
            failed: 0,
            totalAmount: 0,
          };
        }
        providerStats[stat.provider][stat.status.toLowerCase()] = stat._count.id;
        providerStats[stat.provider].total += stat._count.id;
        providerStats[stat.provider].totalAmount += parseFloat(stat._sum.amount || 0);
      });

      return res.status(200).json({
        totalBalance,
        totalWallets: wallets.length,
        providerStats,
        supportedProviders: ['PAYPAL', 'VENMO', 'WISE', 'SQUARE'],
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve statistics' 
      });
    }
  }

  /**
   * Helper: Get sandbox URL for transaction
   */
  _getSandboxUrl(provider, paymentId) {
    const baseUrls = {
      PAYPAL: `https://sandbox.braintreegateway.com/merchants/${process.env.BT_MERCHANT_ID}/transactions/${paymentId}`,
      VENMO: `https://sandbox.braintreegateway.com/merchants/${process.env.BT_MERCHANT_ID}/transactions/${paymentId}`,
      WISE: `https://sandbox.transferwise.tech/user/account/${process.env.WISE_PROFILE_ID}/activity`,
      SQUARE: `https://squareupsandbox.com/dashboard/sales/transactions`,
    };

    return baseUrls[provider] || null;
  }

  /**
   * Helper: Get provider statistics
   */
  _getProviderStats(transactions) {
    const stats = {};
    
    transactions.forEach(tx => {
      if (!stats[tx.provider]) {
        stats[tx.provider] = {
          count: 0,
          totalAmount: 0,
          statuses: {},
        };
      }
      
      stats[tx.provider].count++;
      stats[tx.provider].totalAmount += tx.amount;
      
      if (!stats[tx.provider].statuses[tx.status]) {
        stats[tx.provider].statuses[tx.status] = 0;
      }
      stats[tx.provider].statuses[tx.status]++;
    });

    return stats;
  }
}

module.exports = new SandboxMonitorController();
