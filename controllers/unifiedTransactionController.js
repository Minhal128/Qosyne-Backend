/**
 * Unified Transaction Controller
 * Handles all payment transactions through the routing engine
 * Provides single API for all payment providers
 */

const routingEngine = require('../services/routingEngine');
const ledgerService = require('../services/ledgerService');

class UnifiedTransactionController {
  /**
   * Send money from one wallet to another
   * Automatically routes based on provider compatibility
   */
  async sendMoney(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        recipientId,
        amount,
        currency = 'USD',
        fromProvider,
        toProvider,
        recipientEmail,
        recipientDetails,
        note,
      } = req.body;

      // Validate inputs
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      if (!fromProvider || !toProvider) {
        return res.status(400).json({ 
          error: 'Provider information required (fromProvider, toProvider)' 
        });
      }

      // Check if route is supported
      if (!routingEngine.isRouteSupported(fromProvider, toProvider)) {
        return res.status(400).json({ 
          error: `Transfer not supported: ${fromProvider} → ${toProvider}`,
          supportedRoutes: routingEngine.getSupportedRoutes(),
        });
      }

      // Execute transaction through routing engine
      const result = await routingEngine.routeTransaction({
        fromUserId: userId,
        toUserId: recipientId,
        amount: parseFloat(amount),
        currency,
        fromProvider: fromProvider.toUpperCase(),
        toProvider: toProvider.toUpperCase(),
        metadata: {
          recipientEmail,
          recipientDetails,
          note,
          description: note,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Transaction initiated successfully',
        transaction: result,
      });
    } catch (error) {
      console.error('Send money error:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to send money' 
      });
    }
  }

  /**
   * Get user balance
   */
  async getBalance(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const balance = await ledgerService.getBalance(userId);
      const connectedWallets = await ledgerService.getConnectedWallets(userId);

      return res.status(200).json({
        internalBalance: balance,
        connectedWallets: connectedWallets.map(wallet => ({
          provider: wallet.provider,
          balance: parseFloat(wallet.balance),
          currency: wallet.currency,
          accountEmail: wallet.accountEmail,
          isActive: wallet.isActive,
        })),
      });
    } catch (error) {
      console.error('Get balance error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve balance' 
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        limit = 50, 
        offset = 0, 
        provider, 
        status 
      } = req.query;

      const transactions = await ledgerService.getTransactions(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        provider: provider?.toUpperCase(),
        status: status?.toUpperCase(),
      });

      return res.status(200).json({
        transactions: transactions.map(tx => ({
          id: tx.id,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          provider: tx.provider,
          type: tx.type,
          status: tx.status,
          createdAt: tx.createdAt,
          paymentId: tx.paymentId,
          recipient: tx.transactionRecipients,
          connectedWallet: tx.connectedWallets,
        })),
        total: transactions.length,
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve transactions' 
      });
    }
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionById(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { transactionId } = req.params;

      const transaction = await ledgerService.getTransactionById(parseInt(transactionId));

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Check if user owns this transaction
      if (transaction.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json({
        transaction: {
          id: transaction.id,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency,
          provider: transaction.provider,
          type: transaction.type,
          status: transaction.status,
          createdAt: transaction.createdAt,
          paymentId: transaction.paymentId,
          recipient: transaction.transactionRecipients,
          connectedWallet: transaction.connectedWallets,
          user: transaction.users,
        },
      });
    } catch (error) {
      console.error('Get transaction error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve transaction' 
      });
    }
  }

  /**
   * Connect wallet (PayPal, Venmo, Square, Wise)
   */
  async connectWallet(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        provider,
        paymentMethodNonce,
        accountDetails,
      } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }

      const providerUpper = provider.toUpperCase();
      const connector = routingEngine.getConnectorInstance(providerUpper);

      if (!connector) {
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
      }

      // Get or create customer in provider
      const user = await this._getUser(userId);
      let customerId;
      let paymentMethodToken;

      if (providerUpper === 'PAYPAL' || providerUpper === 'VENMO') {
        // PayPal/Venmo via Braintree
        const customer = await connector.createCustomer({
          name: user.name,
          email: user.email,
        });
        customerId = customer.customerId;

        if (paymentMethodNonce) {
          const paymentMethod = await connector.addPaymentMethod(customerId, paymentMethodNonce);
          paymentMethodToken = paymentMethod.token;
        }
      } else if (providerUpper === 'SQUARE') {
        // Square
        const customer = await connector.createCustomer({
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        });
        customerId = customer.customerId;

        if (paymentMethodNonce) {
          const card = await connector.addPaymentMethod(customerId, paymentMethodNonce);
          paymentMethodToken = card.cardId;
        }
      } else if (providerUpper === 'WISE') {
        // Wise doesn't need customer creation
        customerId = `wise-${userId}`;
        paymentMethodToken = 'wise-account';
      }

      // Save to database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const connectedWallet = await prisma.connectedWallets.create({
        data: {
          userId: userId,
          provider: providerUpper,
          walletId: customerId,
          customerId: customerId,
          accountEmail: accountDetails?.email || user.email,
          fullName: accountDetails?.name || user.name,
          balance: 0,
          currency: accountDetails?.currency || 'USD',
          isActive: true,
          updatedAt: new Date(),
          paymentMethodToken: paymentMethodToken,
        },
      });

      return res.status(200).json({
        success: true,
        message: `${provider} wallet connected successfully`,
        wallet: {
          id: connectedWallet.id,
          provider: connectedWallet.provider,
          accountEmail: connectedWallet.accountEmail,
          currency: connectedWallet.currency,
          customerId: connectedWallet.customerId,
        },
      });
    } catch (error) {
      console.error('Connect wallet error:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to connect wallet' 
      });
    }
  }

  /**
   * Get client token for frontend (PayPal/Venmo)
   */
  async getClientToken(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { provider } = req.query;

      if (!provider || (provider.toUpperCase() !== 'PAYPAL' && provider.toUpperCase() !== 'VENMO')) {
        return res.status(400).json({ error: 'Invalid provider' });
      }

      const connector = routingEngine.getConnectorInstance('PAYPAL');
      
      // Check if user has existing customer ID
      const existingWallet = await ledgerService.getConnectedWalletByProvider(userId, provider);
      const customerId = existingWallet?.customerId;

      const clientToken = await connector.generateClientToken(customerId);

      return res.status(200).json({
        clientToken,
      });
    } catch (error) {
      console.error('Get client token error:', error);
      return res.status(500).json({ 
        error: 'Failed to generate client token' 
      });
    }
  }

  /**
   * Get supported transfer routes
   */
  async getSupportedRoutes(req, res) {
    try {
      const routes = routingEngine.getSupportedRoutes();
      
      return res.status(200).json({
        routes,
        rules: {
          'PayPal ↔ Venmo': 'Bidirectional transfers supported',
          'Square ↔ Square': 'Internal Square transfers only',
          'Wise → Bank': 'Outbound transfers to bank accounts',
        },
      });
    } catch (error) {
      console.error('Get routes error:', error);
      return res.status(500).json({ 
        error: 'Failed to get supported routes' 
      });
    }
  }

  /**
   * Helper: Get user details
   */
  async _getUser(userId) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

module.exports = new UnifiedTransactionController();
