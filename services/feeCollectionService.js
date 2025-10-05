const { PrismaClient } = require('@prisma/client');
const rapydService = require('./rapydService');

const prisma = new PrismaClient();

class FeeCollectionService {
  constructor() {
    // Qosyne admin Rapyd wallet ID from environment
    this.adminRapydWalletId = process.env.RAPYD_WALLET_ID || 'ewallet_29d3dd4cff05ea67d46210d7357c1e09';
    this.adminFeeAmount = 0.75; // Fixed fee of $0.75 per transaction
  }

  /**
   * Collect admin fee after a successful transaction
   * @param {Object} transaction - The completed transaction
   */
  async collectAdminFee(transaction) {
    try {
      console.log(`Collecting admin fee for transaction ${transaction.id}`);

      // Only collect fees for completed transactions
      if (transaction.status !== 'COMPLETED') {
        console.log(`Skipping fee collection - transaction ${transaction.id} not completed`);
        return null;
      }

      // Skip fee collection if transaction amount is less than the fee
      if (parseFloat(transaction.amount) < this.adminFeeAmount) {
        console.log(`Skipping fee collection - transaction amount ${transaction.amount} is less than fee ${this.adminFeeAmount}`);
        return null;
      }

      // Create a payout to admin Rapyd wallet
      const feeCollection = await rapydService.createPayout({
        amount: this.adminFeeAmount,
        currency: transaction.currency || 'USD',
        beneficiary: {
          type: 'rapyd_wallet',
          fields: {
            walletId: this.adminRapydWalletId
          }
        },
        description: `Admin fee collection for transaction ${transaction.id}`,
        metadata: {
          originalTransactionId: transaction.id,
          feeType: 'admin_fee',
          userId: transaction.userId
        }
      });

      // Record the fee collection in database
      const feeRecord = await prisma.transactions.create({
        data: {
          userId: transaction.userId,
          connectedWalletId: transaction.connectedWalletId,
          amount: this.adminFeeAmount,
          currency: transaction.currency || 'USD',
          provider: 'QOSYNE',
          type: 'WITHDRAW',
          status: 'COMPLETED'
        }
      });

      console.log(`Admin fee collected successfully:`, {
        transactionId: transaction.id,
        feeRecordId: feeRecord.id,
        rapydPayoutId: feeCollection.id,
        amount: this.adminFeeAmount
      });

      return {
        feeRecordId: feeRecord.id,
        rapydPayoutId: feeCollection.id,
        amount: this.adminFeeAmount,
        status: 'completed'
      };

    } catch (error) {
      console.error(`Error collecting admin fee for transaction ${transaction.id}:`, error);
      
      // Log the error but don't fail the main transaction
      try {
        await prisma.transactions.create({
          data: {
            userId: transaction.userId,
            connectedWalletId: transaction.connectedWalletId,
            amount: this.adminFeeAmount,
            currency: transaction.currency || 'USD',
            provider: 'QOSYNE',
            type: 'WITHDRAW',
            status: 'FAILED'
          }
        });
      } catch (dbError) {
        console.error('Failed to log fee collection error:', dbError);
      }

      return {
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Get total fees collected for admin dashboard
   */
  async getTotalFeesCollected() {
    try {
      // Since we can't use metadata field, we'll identify admin fees by:
      // provider: QOSYNE, type: WITHDRAW, status: COMPLETED, amount: 0.75
      const result = await prisma.transactions.aggregate({
        where: {
          provider: 'QOSYNE',
          type: 'WITHDRAW',
          status: 'COMPLETED',
          amount: this.adminFeeAmount
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      return {
        totalAmount: result._sum.amount || 0,
        totalTransactions: result._count.id || 0,
        feePerTransaction: this.adminFeeAmount
      };
    } catch (error) {
      console.error('Error getting total fees collected:', error);
      return {
        totalAmount: 0,
        totalTransactions: 0,
        feePerTransaction: this.adminFeeAmount
      };
    }
  }

  /**
   * Get fee collection history
   */
  async getFeeCollectionHistory(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [feeRecords, total] = await Promise.all([
        prisma.transactions.findMany({
          where: {
            provider: 'QOSYNE',
            type: 'WITHDRAW',
            amount: this.adminFeeAmount
          },
          include: {
            connectedWallets: {
              select: {
                provider: true,
                accountEmail: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.transactions.count({
          where: {
            provider: 'QOSYNE',
            type: 'WITHDRAW',
            amount: this.adminFeeAmount
          }
        })
      ]);

      return {
        data: feeRecords.map(record => ({
          id: record.id,
          amount: record.amount,
          currency: record.currency,
          status: record.status,
          createdAt: record.createdAt,
          sourceWallet: record.connectedWallets
        })),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting fee collection history:', error);
      throw error;
    }
  }
}

module.exports = new FeeCollectionService();
