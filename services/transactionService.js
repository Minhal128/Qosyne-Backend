const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const rapydService = require('./rapydService');
const walletService = require('./walletService');

const prisma = new PrismaClient();

class TransactionService {
  constructor() {
    this.transactionStatuses = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED'
    };
  }

  async initiateTransfer(transferData) {
    const transactionId = uuidv4();
    
    try {
      const { userId, fromWalletId, toWalletId, amount, currency, description, metadata } = transferData;

      // Get wallet details
      const fromWallet = await prisma.connectedWallets.findFirst({
        where: { walletId: fromWalletId, userId, isActive: true }
      });

      const toWallet = await prisma.connectedWallets.findFirst({
        where: { walletId: toWalletId, isActive: true }
      });

      if (!fromWallet || !toWallet) {
        throw new Error('Invalid wallet selection');
      }

      // Calculate fees
      const fees = await this.calculateFees(fromWallet.provider, toWallet.provider, amount, currency);
      const requiresRapyd = fromWallet.provider !== toWallet.provider;

      // Create transaction record
      const transaction = await prisma.transactions.create({
        data: {
          userId,
          connectedWalletId: fromWallet.id, // Use database ID, not walletId
          amount: parseFloat(amount),
          currency,
          provider: fromWallet.provider,
          type: 'PEER_TO_PEER',
          status: this.transactionStatuses.PENDING,
          fees: fees.total,
          metadata: JSON.stringify({
            toWalletId: toWallet.id,
            toProvider: toWallet.provider,
            description,
            ...metadata
          }),
          estimatedCompletion: this.calculateEstimatedCompletion(fromWallet.provider, toWallet.provider)
        }
      });

      console.log('Transaction initiated', {
        transactionId: transaction.id,
        userId,
        fromProvider: fromWallet.provider,
        toProvider: toWallet.provider,
        amount,
        currency
      });

      // Route transaction based on wallet compatibility
      if (requiresRapyd) {
        return await this.processRapydTransfer(transaction, fromWallet, toWallet);
      } else {
        return await this.processDirectTransfer(transaction, fromWallet, toWallet);
      }
    } catch (error) {
      console.error('Transaction initiation failed:', error);
      throw error;
    }
  }

  async processRapydTransfer(transaction, fromWallet, toWallet) {
    try {
      // Update status to processing
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: this.transactionStatuses.PROCESSING }
      });
      
      // Create Rapyd payment from source wallet
      const payment = await rapydService.createPayment({
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: {
          type: this.getPaymentMethodType(fromWallet.provider),
          fields: this.getPaymentMethodFields(fromWallet)
        },
        description: transaction.description || 'Wallet transfer payment',
        metadata: {
          transactionId: transaction.id,
          userId: transaction.userId
        }
      });

      // Create Rapyd payout to destination wallet
      const payout = await rapydService.createPayout({
        amount: transaction.amount - transaction.fees,
        currency: transaction.currency,
        beneficiary: {
          type: this.getBeneficiaryType(toWallet.provider),
          fields: this.getBeneficiaryFields(toWallet)
        },
        description: transaction.description || 'Wallet transfer payout',
        metadata: {
          transactionId: transaction.id,
          paymentId: payment.id
        }
      });

      // Update transaction with Rapyd IDs and mark as completed
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          rapydPaymentId: payment.id,
          rapydPayoutId: payout.id,
          status: this.transactionStatuses.COMPLETED,
          completedAt: new Date()
        }
      });

      // Get updated transaction
      const updatedTransaction = await prisma.transactions.findUnique({
        where: { id: transaction.id }
      });

      return updatedTransaction;
    } catch (error) {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          status: this.transactionStatuses.FAILED,
          failureReason: error.message
        }
      });
      throw error;
    }
  }

  async processDirectTransfer(transaction, fromWallet, toWallet) {
    try {
      // For same-provider transfers, use direct API calls
      const provider = fromWallet.provider;
      
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: this.transactionStatuses.PROCESSING }
      });

      switch (provider) {
        case 'PAYPAL':
          return await this.processPayPalTransfer(transaction, fromWallet, toWallet);
        case 'VENMO':
          return await this.processVenmoTransfer(transaction, fromWallet, toWallet);
        default:
          throw new Error(`Direct transfer not supported for ${provider}`);
      }
    } catch (error) {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          status: this.transactionStatuses.FAILED,
          failureReason: error.message
        }
      });
      throw error;
    }
  }

  async processPayPalTransfer(transaction, fromWallet, toWallet) {
    // PayPal direct transfer implementation
    // This would use PayPal's P2P transfer API
    console.log('Processing PayPal transfer:', transaction.id);
    
    // Simulate processing time
    setTimeout(async () => {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          status: this.transactionStatuses.COMPLETED,
          completedAt: new Date()
        }
      });
    }, 5000); // 5 seconds

    return transaction;
  }

  async processVenmoTransfer(transaction, fromWallet, toWallet) {
    // Venmo direct transfer implementation
    console.log('Processing Venmo transfer:', transaction.id);
    
    // Simulate processing time
    setTimeout(async () => {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          status: this.transactionStatuses.COMPLETED,
          completedAt: new Date()
        }
      });
    }, 2000); // 2 seconds

    return transaction;
  }

  async getTransaction(userId, transactionId) {
    try {
      const transaction = await prisma.transactions.findFirst({
        where: { id: parseInt(transactionId), userId },
        include: {
          connectedWallet: true,
          transactionRecipient: true
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        id: transaction.id,
        userId: transaction.userId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: transaction.provider,
        type: transaction.type,
        fees: transaction.fees,
        fromWallet: transaction.connectedWallet,
        metadata: transaction.metadata ? JSON.parse(transaction.metadata) : {},
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        estimatedCompletion: transaction.estimatedCompletion
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  async getUserTransactions(userId, filters = {}) {
    try {
      const { page = 1, limit = 20, status, provider } = filters;
      const skip = (page - 1) * limit;
      
      const where = { userId };
      if (status) where.status = status;
      if (provider) where.provider = provider;

      const [transactions, total] = await Promise.all([
        prisma.transactions.findMany({
          where,
          include: {
            connectedWallet: true,
            transactionRecipient: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.transactions.count({ where })
      ]);

      return {
        data: transactions.map(t => ({
          id: t.id,
          status: t.status,
          amount: t.amount,
          currency: t.currency,
          provider: t.provider,
          type: t.type,
          fees: t.fees,
          fromWallet: t.connectedWallet,
          createdAt: t.createdAt,
          completedAt: t.completedAt
        })),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      throw error;
    }
  }

  async cancelTransaction(userId, transactionId) {
    try {
      const transaction = await prisma.transactions.findFirst({
        where: { id: parseInt(transactionId), userId }
      });
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== this.transactionStatuses.PENDING) {
        throw new Error('Only pending transactions can be cancelled');
      }

      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: this.transactionStatuses.CANCELLED }
      });

      return { message: 'Transaction cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      throw error;
    }
  }

  async retryTransaction(userId, transactionId) {
    try {
      const originalTransaction = await prisma.transactions.findFirst({
        where: { id: parseInt(transactionId), userId }
      });
      
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (originalTransaction.status !== this.transactionStatuses.FAILED) {
        throw new Error('Only failed transactions can be retried');
      }

      // Create new transaction with same parameters
      const metadata = originalTransaction.metadata ? JSON.parse(originalTransaction.metadata) : {};
      const toWalletId = metadata.toWalletId;

      const retryData = {
        userId,
        fromWalletId: originalTransaction.connectedWalletId,
        toWalletId,
        amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        description: metadata.description,
        metadata: { ...metadata, originalTransactionId: originalTransaction.id }
      };

      return await this.initiateTransfer(retryData);
    } catch (error) {
      console.error('Error retrying transaction:', error);
      throw error;
    }
  }

  async estimateTransferFees(feeData) {
    try {
      const { fromProvider, toProvider, amount, currency } = feeData;
      
      const fees = await this.calculateFees(fromProvider, toProvider, amount, currency);
      const exchangeRate = await this.getExchangeRate(currency, currency); // Same currency for now
      
      return {
        fees,
        exchangeRate: exchangeRate.rate,
        totalCost: parseFloat(amount) + fees.total,
        estimatedArrival: this.calculateEstimatedCompletion(fromProvider, toProvider)
      };
    } catch (error) {
      console.error('Error estimating transfer fees:', error);
      throw error;
    }
  }

  async calculateFees(fromProvider, toProvider, amount, currency) {
    const baseFee = 0.50;
    const percentageFee = parseFloat(amount) * 0.015; // 1.5%
    const rapydFee = fromProvider !== toProvider ? parseFloat(amount) * 0.01 : 0; // 1% for cross-wallet
    
    return {
      base: baseFee,
      percentage: percentageFee,
      rapyd: rapydFee,
      total: baseFee + percentageFee + rapydFee
    };
  }

  calculateEstimatedCompletion(fromProvider, toProvider) {
    const completionTimes = {
      'PAYPAL-PAYPAL': 2 * 60 * 1000, // 2 minutes
      'VENMO-VENMO': 1 * 60 * 1000, // 1 minute
      'WISE-WISE': 5 * 60 * 1000, // 5 minutes
      'cross-wallet': 15 * 60 * 1000 // 15 minutes for cross-wallet via Rapyd
    };

    const key = fromProvider === toProvider ? `${fromProvider}-${toProvider}` : 'cross-wallet';
    const estimatedMs = completionTimes[key] || completionTimes['cross-wallet'];
    
    return new Date(Date.now() + estimatedMs);
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Use Rapyd or external service for exchange rates
    return { rate: 1.0, timestamp: new Date().toISOString() };
  }

  async getSupportedCurrencies(fromProvider, toProvider) {
    const supportedCurrencies = {
      PAYPAL: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      GOOGLEPAY: ['USD', 'EUR', 'INR'],
      WISE: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'],
      SQUARE: ['USD', 'CAD', 'GBP', 'AUD'],
      VENMO: ['USD']
    };

    const fromCurrencies = supportedCurrencies[fromProvider] || [];
    const toCurrencies = supportedCurrencies[toProvider] || [];
    
    // Return intersection of supported currencies
    return fromCurrencies.filter(currency => toCurrencies.includes(currency));
  }

  getPaymentMethodType(provider) {
    const methodTypes = {
      PAYPAL: 'paypal_wallet',
      GOOGLEPAY: 'google_pay',
      WISE: 'wise_account',
      SQUARE: 'square_wallet',
      VENMO: 'venmo_wallet'
    };
    return methodTypes[provider];
  }

  getPaymentMethodFields(wallet) {
    // Return provider-specific fields for payment method
    return {
      walletId: wallet.walletId,
      provider: wallet.provider
    };
  }

  getBeneficiaryType(provider) {
    const beneficiaryTypes = {
      PAYPAL: 'paypal_account',
      GOOGLEPAY: 'google_pay_account',
      WISE: 'wise_account',
      SQUARE: 'square_account',
      VENMO: 'venmo_account'
    };
    return beneficiaryTypes[provider];
  }

  getBeneficiaryFields(wallet) {
    // Return provider-specific fields for beneficiary
    return {
      walletId: wallet.walletId,
      recipientId: wallet.walletId,
      provider: wallet.provider
    };
  }
}

module.exports = new TransactionService();
