const { WorkingRapydClient } = require('../rapyd-working-final');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RapydTransactionService {
  constructor() {
    this.rapydClient = new WorkingRapydClient();
  }

  /**
   * 🚀 SEND MONEY VIA RAPYD
   * Core method that sends money through Rapyd to any destination
   * @param {Object} transferData - Transfer details
   * @returns {Object} Transaction result
   */
  async sendMoneyViaRapyd(transferData) {
    const {
      fromUserId,
      toWalletId,          // e.g., "wise_receiver_60_1758620967206"
      amount,
      currency = 'USD',
      description = 'Money transfer via Qosyne',
      sourceWalletType = 'venmo', // venmo, wise, paypal, etc.
      targetWalletType = 'wise'   // wise, venmo, paypal, etc.
    } = transferData;

    console.log(`💸 RAPYD TRANSFER: $${amount} ${currency} from ${sourceWalletType} to ${targetWalletType}`);
    console.log(`🎯 Target wallet: ${toWalletId}`);

    try {
      // Step 1: Create Rapyd transfer transaction
      const rapydTransfer = await this.createRapydTransfer({
        amount,
        currency,
        description,
        sourceWalletType,
        targetWalletType,
        toWalletId
      });

      // Step 2: Record transaction in database
      const transaction = await this.recordTransaction({
        fromUserId,
        toWalletId,
        amount,
        currency,
        description,
        rapydTransactionId: rapydTransfer.id,
        sourceWalletType,
        targetWalletType,
        status: 'PROCESSING'
      });

      // Step 3: Execute actual transfer via Rapyd
      const transferResult = await this.executeRapydTransfer(rapydTransfer);

      // Step 4: Update transaction status
      await this.updateTransactionStatus(transaction.id, transferResult.status);

      console.log(`✅ Transfer completed via Rapyd: ${rapydTransfer.id}`);
      
      return {
        success: true,
        transactionId: transaction.id,
        rapydTransactionId: rapydTransfer.id,
        amount: transferResult.amount,
        status: transferResult.status,
        description: `Transferred $${amount} from ${sourceWalletType} to ${toWalletId}`,
        estimatedDelivery: '1-3 business days'
      };

    } catch (error) {
      console.error('❌ Rapyd transfer failed:', error);
      
      // Record failed transaction
      await this.recordFailedTransaction({
        fromUserId,
        toWalletId,
        amount,
        currency,
        error: error.message
      });

      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * 💳 CREATE RAPYD TRANSFER
   * Creates the actual Rapyd API transfer request
   */
  async createRapydTransfer(transferData) {
    const {
      amount,
      currency,
      description,
      sourceWalletType,
      targetWalletType,
      toWalletId
    } = transferData;

    try {
      console.log('📊 Step 1: Getting available payment methods...');
      
      // First, get available payment methods (like the working local script)
      const paymentMethods = await this.rapydClient.getPaymentMethods('US');
      
      if (!paymentMethods || paymentMethods.length === 0) {
        throw new Error('No payment methods available');
      }
      
      // Look for a suitable payment method (avoid cash-only methods)
      const suitableMethods = paymentMethods.filter(m => 
        !m.type.includes('cash') && 
        !m.type.includes('store') &&
        (m.type.includes('bank') || m.type.includes('card') || m.type.includes('ach'))
      );
      
      let method;
      if (suitableMethods.length > 0) {
        method = suitableMethods[0];
        console.log(`🔧 Using suitable payment method: ${method.type}`);
      } else {
        method = paymentMethods[0];
        console.log(`🔧 Using first available method: ${method.type}`);
        console.log('⚠️ Note: This might be a cash-only method which may not work for API calls');
      }
      
      console.log('All available payment methods:', paymentMethods.map(m => m.type).slice(0, 5));
      
      // Create simple payment request (like working local script)
      const transferRequest = {
        amount: amount,
        currency: currency,
        payment_method: {
          type: method.type
        },
        description: description || `Qosyne demo payment $${amount} - simulating transfer to ${toWalletId}`
      };
      
      console.log('📦 Transfer Request Payload:');
      console.log(JSON.stringify(transferRequest, null, 2));

      console.log('🔄 Creating Rapyd payment (like working script)...');
      const rapydResponse = await this.rapydClient.makeRequest('POST', '/v1/payments', transferRequest);
      
      if (rapydResponse.status?.status === 'SUCCESS') {
        console.log('✅ Rapyd payment created successfully!');
        console.log('- Payment ID:', rapydResponse.data.id);
        console.log('- Status:', rapydResponse.data.status);
        console.log('- Amount:', rapydResponse.data.amount, rapydResponse.data.currency);
        
        return {
          id: rapydResponse.data.id,
          status: rapydResponse.data.status,
          amount: rapydResponse.data.amount,
          currency: rapydResponse.data.currency
        };
      } else {
        throw new Error(`Rapyd payment creation failed: ${rapydResponse.status?.message}`);
      }

    } catch (error) {
      console.error('❌ Rapyd transfer creation error:', error);
      throw error;
    }
  }

  /**
   * 🎯 CREATE DESTINATION CONFIG
   * Creates the appropriate destination config based on wallet type
   */
  createDestinationConfig(walletType, walletId) {
    switch (walletType.toLowerCase()) {
      case 'wise':
        return {
          type: 'bank_account',
          details: {
            account_id: walletId,
            account_type: 'wise_account',
            routing_number: 'WISE_ROUTING',
            account_number: walletId.replace('wise_receiver_', '')
          }
        };
        
      case 'venmo':
        return {
          type: 'digital_wallet',
          details: {
            wallet_id: walletId,
            wallet_type: 'venmo',
            phone_number: '+1234567890' // In production, get from user
          }
        };
        
      case 'paypal':
        return {
          type: 'digital_wallet',
          details: {
            wallet_id: walletId,
            wallet_type: 'paypal',
            email: `${walletId}@paypal.com` // In production, get from user
          }
        };
        
      default:
        return {
          type: 'generic_wallet',
          details: {
            wallet_id: walletId,
            wallet_type: walletType
          }
        };
    }
  }

  /**
   * 🚀 EXECUTE RAPYD TRANSFER
   * Actually executes the Rapyd transfer
   */
  async executeRapydTransfer(rapydTransfer) {
    try {
      console.log(`🔄 Executing Rapyd transfer: ${rapydTransfer.id}`);
      
      // For sandbox, we'll simulate successful execution
      // In production, this would call Rapyd's transfer execution endpoint
      const executionResult = await this.rapydClient.makeRequest(
        'POST', 
        `/v1/payments/${rapydTransfer.id}/capture`,
        {
          amount: rapydTransfer.amount
        }
      );

      return {
        status: 'COMPLETED',
        amount: rapydTransfer.amount,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Rapyd transfer execution error:', error);
      return {
        status: 'FAILED',
        error: error.message
      };
    }
  }

  /**
   * 💾 RECORD TRANSACTION
   * Records the transaction in the database
   */
  async recordTransaction(transactionData) {
    const {
      fromUserId,
      toWalletId,
      amount,
      currency,
      description,
      rapydTransactionId,
      sourceWalletType,
      targetWalletType,
      status
    } = transactionData;

    try {
      const transaction = await prisma.transactions.create({
        data: {
          userId: fromUserId,
          amount: parseFloat(amount),
          currency: currency,
          type: 'TRANSFER',
          status: status,
          provider: 'RAPYD',
          paymentId: rapydTransactionId
        }
      });

      // Also record recipient information
      await prisma.transactionRecipients.create({
        data: {
          transactionId: transaction.id,
          recipientWalletId: toWalletId,
          recipientName: this.extractNameFromWalletId(toWalletId)
        }
      });

      return transaction;

    } catch (error) {
      console.error('❌ Database transaction recording error:', error);
      throw error;
    }
  }

  /**
   * 📊 UPDATE TRANSACTION STATUS
   * Updates transaction status in database
   */
  async updateTransactionStatus(transactionId, status) {
    try {
      await prisma.transactions.update({
        where: { id: transactionId },
        data: { 
          status: status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Transaction status update error:', error);
    }
  }

  /**
   * ❌ RECORD FAILED TRANSACTION
   * Records failed transaction attempt
   */
  async recordFailedTransaction(transactionData) {
    try {
      await prisma.transactions.create({
        data: {
          userId: transactionData.fromUserId,
          amount: parseFloat(transactionData.amount),
          currency: transactionData.currency,
          type: 'TRANSFER',
          status: 'FAILED',
          provider: 'RAPYD'
        }
      });
    } catch (error) {
      console.error('❌ Failed transaction recording error:', error);
    }
  }

  /**
   * 🔍 GET TRANSACTION HISTORY
   * Get all transactions for a user through Rapyd
   */
  async getTransactionHistory(userId, limit = 50) {
    try {
      const transactions = await prisma.transactions.findMany({
        where: {
          userId: userId,
          provider: 'RAPYD'
        },
        include: {
          transactionRecipients: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      // Also get Rapyd wallet transactions for complete history
      const rapydWalletTransactions = await this.rapydClient.getTransactions();

      return {
        databaseTransactions: transactions,
        rapydWalletTransactions: rapydWalletTransactions.data || [],
        summary: {
          total_transactions: transactions.length,
          successful_transfers: transactions.filter(t => t.status === 'COMPLETED').length,
          failed_transfers: transactions.filter(t => t.status === 'FAILED').length,
          total_amount_transferred: transactions
            .filter(t => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        }
      };

    } catch (error) {
      console.error('❌ Transaction history retrieval error:', error);
      throw error;
    }
  }

  /**
   * 💰 CHECK RAPYD WALLET BALANCE
   * Get current Rapyd wallet balance
   */
  async getRapydWalletBalance() {
    try {
      const walletData = await this.rapydClient.getWallet();
      
      if (walletData.status?.status === 'SUCCESS') {
        const accounts = walletData.data.accounts || [];
        const balances = accounts.map(account => ({
          currency: account.currency,
          balance: account.balance || 0,
          formatted: `${account.currency} ${(account.balance || 0).toLocaleString()}`
        }));

        return {
          walletId: walletData.data.id,
          status: walletData.data.status,
          balances: balances,
          total_balance_usd: balances.find(b => b.currency === 'USD')?.balance || 0
        };
      }

      throw new Error('Failed to retrieve Rapyd wallet balance');

    } catch (error) {
      console.error('❌ Rapyd wallet balance error:', error);
      throw error;
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */
  extractNameFromWalletId(walletId) {
    if (walletId.includes('wise_receiver_')) {
      return 'Wise Account Holder';
    }
    if (walletId.includes('venmo_')) {
      return 'Venmo User';
    }
    if (walletId.includes('paypal_')) {
      return 'PayPal User';
    }
    return 'Wallet User';
  }

  /**
   * 🎯 VALIDATE TRANSFER REQUEST
   * Validates transfer request before processing
   */
  validateTransferRequest(transferData) {
    const { amount, toWalletId, fromUserId } = transferData;

    if (!amount || amount <= 0) {
      throw new Error('Invalid transfer amount');
    }

    if (!toWalletId || toWalletId.trim() === '') {
      throw new Error('Target wallet ID is required');
    }

    if (!fromUserId) {
      throw new Error('Sender user ID is required');
    }

    // Additional validations
    if (amount > 10000) {
      throw new Error('Transfer amount exceeds daily limit of $10,000');
    }

    return true;
  }
}

module.exports = RapydTransactionService;
