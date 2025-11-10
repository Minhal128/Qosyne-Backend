/**
 * Internal Ledger Service
 * Manages all internal balances and transaction records
 * Acts as single source of truth for all wallet balances
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LedgerService {
  /**
   * Get user's internal balance
   */
  async getBalance(userId) {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        // Create wallet if doesn't exist
        const newWallet = await prisma.wallet.create({
          data: {
            userId,
            balance: 0
          }
        });
        return parseFloat(newWallet.balance);
      }

      return parseFloat(wallet.balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to retrieve balance');
    }
  }

  /**
   * Credit user's internal ledger
   */
  async credit(userId, amount, metadata = {}) {
    try {
      const wallet = await prisma.wallet.upsert({
        where: { userId },
        update: {
          balance: {
            increment: amount
          }
        },
        create: {
          userId,
          balance: amount
        }
      });

      // Record transaction in ledger
      await this.recordTransaction({
        userId,
        walletId: wallet.id,
        amount,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        ...metadata
      });

      return parseFloat(wallet.balance);
    } catch (error) {
      console.error('Error crediting account:', error);
      throw new Error('Failed to credit account');
    }
  }

  /**
   * Debit user's internal ledger
   */
  async debit(userId, amount, metadata = {}) {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const updatedWallet = await prisma.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: amount
          }
        }
      });

      // Record transaction in ledger
      await this.recordTransaction({
        userId,
        walletId: wallet.id,
        amount,
        type: 'WITHDRAW',
        status: 'COMPLETED',
        ...metadata
      });

      return parseFloat(updatedWallet.balance);
    } catch (error) {
      console.error('Error debiting account:', error);
      throw error;
    }
  }

  /**
   * Transfer between internal wallets
   */
  async transfer(fromUserId, toUserId, amount, metadata = {}) {
    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Debit sender
        const senderWallet = await tx.wallet.findUnique({
          where: { userId: fromUserId }
        });

        if (!senderWallet) {
          throw new Error('Sender wallet not found');
        }

        const senderBalance = parseFloat(senderWallet.balance);
        if (senderBalance < amount) {
          throw new Error('Insufficient balance');
        }

        const updatedSender = await tx.wallet.update({
          where: { userId: fromUserId },
          data: {
            balance: {
              decrement: amount
            }
          }
        });

        // Credit receiver
        const updatedReceiver = await tx.wallet.upsert({
          where: { userId: toUserId },
          update: {
            balance: {
              increment: amount
            }
          },
          create: {
            userId: toUserId,
            balance: amount
          }
        });

        return {
          senderBalance: parseFloat(updatedSender.balance),
          receiverBalance: parseFloat(updatedReceiver.balance)
        };
      });

      // Record transfer transactions
      await this.recordTransaction({
        userId: fromUserId,
        amount,
        type: 'TRANSFER',
        status: 'COMPLETED',
        provider: metadata.provider || 'QOSYNE',
        currency: metadata.currency || 'USD',
        paymentId: metadata.paymentId
      });

      return result;
    } catch (error) {
      console.error('Error transferring funds:', error);
      throw error;
    }
  }

  /**
   * Record transaction in database
   */
  async recordTransaction(data) {
    try {
      const transaction = await prisma.transactions.create({
        data: {
          userId: data.userId,
          walletId: data.walletId,
          connectedWalletId: data.connectedWalletId,
          paymentId: data.paymentId || `TXN-${Date.now()}`,
          amount: data.amount,
          currency: data.currency || 'USD',
          provider: data.provider || 'QOSYNE',
          type: data.type,
          status: data.status || 'PENDING',
        }
      });

      // Add recipient info if exists
      if (data.recipientInfo) {
        await prisma.transactionRecipients.create({
          data: {
            transactionId: transaction.id,
            recipientWalletId: data.recipientInfo.walletId,
            recipientName: data.recipientInfo.name,
            recipientEmail: data.recipientInfo.email,
            recipientAccount: data.recipientInfo.account
          }
        });
      }

      return transaction;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw new Error('Failed to record transaction');
    }
  }

  /**
   * Get all transactions for a user
   */
  async getTransactions(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, provider, status } = options;

      const where = { userId };
      if (provider) where.provider = provider;
      if (status) where.status = status;

      const transactions = await prisma.transactions.findMany({
        where,
        include: {
          transactionRecipients: true,
          connectedWallets: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw new Error('Failed to retrieve transactions');
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId) {
    try {
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        include: {
          transactionRecipients: true,
          connectedWallets: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error('Failed to retrieve transaction');
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId, status, metadata = {}) {
    try {
      const transaction = await prisma.transactions.update({
        where: { id: transactionId },
        data: {
          status,
          paymentId: metadata.paymentId || undefined
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error('Failed to update transaction status');
    }
  }

  /**
   * Get all connected wallets for user
   */
  async getConnectedWallets(userId) {
    try {
      const wallets = await prisma.connectedWallets.findMany({
        where: {
          userId,
          isActive: true
        }
      });

      return wallets;
    } catch (error) {
      console.error('Error getting connected wallets:', error);
      throw new Error('Failed to retrieve connected wallets');
    }
  }

  /**
   * Get connected wallet by provider
   */
  async getConnectedWalletByProvider(userId, provider) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: {
          userId,
          provider: provider.toUpperCase(),
          isActive: true
        }
      });

      return wallet;
    } catch (error) {
      console.error('Error getting connected wallet:', error);
      return null;
    }
  }
}

module.exports = new LedgerService();
