/**
 * PayPal/Venmo Connector
 * Handles PayPal and Venmo transactions via Braintree
 * Supports bidirectional transfers: PayPal ↔ Venmo
 */

const braintree = require('braintree');

class PayPalConnector {
  constructor() {
    // Initialize Braintree gateway (handles both PayPal and Venmo)
    this.gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });

    this.providerName = 'PAYPAL';
  }

  /**
   * Generate client token for frontend
   */
  async generateClientToken(customerId = null) {
    try {
      const options = customerId ? { customerId } : {};
      const response = await this.gateway.clientToken.generate(options);
      return response.clientToken;
    } catch (error) {
      console.error('PayPal: Error generating client token:', error);
      throw new Error('Failed to generate PayPal client token');
    }
  }

  /**
   * Create customer in Braintree
   */
  async createCustomer(userData) {
    try {
      const result = await this.gateway.customer.create({
        firstName: userData.firstName || userData.name,
        lastName: userData.lastName || '',
        email: userData.email,
      });

      if (result.success) {
        return {
          customerId: result.customer.id,
          email: result.customer.email,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('PayPal: Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Add payment method to customer
   */
  async addPaymentMethod(customerId, paymentMethodNonce) {
    try {
      const result = await this.gateway.paymentMethod.create({
        customerId: customerId,
        paymentMethodNonce: paymentMethodNonce,
        options: {
          verifyCard: true,
        },
      });

      if (result.success) {
        return {
          token: result.paymentMethod.token,
          type: result.paymentMethod.constructor.name,
          details: this._extractPaymentDetails(result.paymentMethod),
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('PayPal: Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Send money via PayPal/Venmo
   */
  async sendMoney(params) {
    try {
      const { amount, currency, recipientEmail, paymentMethodToken, description } = params;

      // Create transaction via Braintree
      const result = await this.gateway.transaction.sale({
        amount: amount.toString(),
        paymentMethodToken: paymentMethodToken,
        options: {
          submitForSettlement: true,
          paypal: {
            description: description || 'Payment via Qosyne',
          },
        },
      });

      if (result.success) {
        const transaction = result.transaction;
        return {
          success: true,
          transactionId: transaction.id,
          status: this._mapStatus(transaction.status),
          amount: parseFloat(transaction.amount),
          currency: transaction.currencyIsoCode,
          providerResponse: {
            id: transaction.id,
            status: transaction.status,
            type: transaction.type,
            paymentMethod: transaction.paymentInstrumentType,
            createdAt: transaction.createdAt,
            processorResponse: transaction.processorResponseText,
          },
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('PayPal: Error sending money:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Receive money (process payment)
   */
  async receiveMoney(params) {
    try {
      const { paymentMethodNonce, amount, currency, customerId } = params;

      const transactionParams = {
        amount: amount.toString(),
        paymentMethodNonce: paymentMethodNonce,
        options: {
          submitForSettlement: true,
        },
      };

      if (customerId) {
        transactionParams.customerId = customerId;
      }

      const result = await this.gateway.transaction.sale(transactionParams);

      if (result.success) {
        const transaction = result.transaction;
        return {
          success: true,
          transactionId: transaction.id,
          status: this._mapStatus(transaction.status),
          amount: parseFloat(transaction.amount),
          currency: transaction.currencyIsoCode,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('PayPal: Error receiving money:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId) {
    try {
      const transaction = await this.gateway.transaction.find(transactionId);
      
      return {
        id: transaction.id,
        amount: parseFloat(transaction.amount),
        status: this._mapStatus(transaction.status),
        type: transaction.type,
        currency: transaction.currencyIsoCode,
        createdAt: transaction.createdAt,
        paymentMethod: transaction.paymentInstrumentType,
        details: {
          processorResponse: transaction.processorResponseText,
          merchantAccountId: transaction.merchantAccountId,
        },
      };
    } catch (error) {
      console.error('PayPal: Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Search transactions
   */
  async searchTransactions(params = {}) {
    try {
      const { startDate, endDate, status, customerId } = params;
      
      const search = this.gateway.transaction.search((search) => {
        if (customerId) {
          search.customerId().is(customerId);
        }
        if (status) {
          search.status().is(status);
        }
        if (startDate) {
          search.createdAt().min(startDate);
        }
        if (endDate) {
          search.createdAt().max(endDate);
        }
      });

      const transactions = [];
      await search.each((err, transaction) => {
        if (!err && transaction) {
          transactions.push({
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: this._mapStatus(transaction.status),
            type: transaction.type,
            currency: transaction.currencyIsoCode,
            createdAt: transaction.createdAt,
          });
        }
      });

      return transactions;
    } catch (error) {
      console.error('PayPal: Error searching transactions:', error);
      return [];
    }
  }

  /**
   * Check if this connector supports a transfer route
   */
  canTransfer(fromProvider, toProvider) {
    const supportedProviders = ['PAYPAL', 'VENMO'];
    return supportedProviders.includes(fromProvider.toUpperCase()) && 
           supportedProviders.includes(toProvider.toUpperCase());
  }

  /**
   * Extract payment method details
   */
  _extractPaymentDetails(paymentMethod) {
    if (paymentMethod.constructor.name === 'PayPalAccount') {
      return {
        email: paymentMethod.email,
        payerId: paymentMethod.payerId,
      };
    } else if (paymentMethod.constructor.name === 'VenmoAccount') {
      return {
        username: paymentMethod.username,
        venmoUserId: paymentMethod.venmoUserId,
      };
    }
    return {};
  }

  /**
   * Map Braintree status to internal status
   */
  _mapStatus(braintreeStatus) {
    const statusMap = {
      'authorized': 'PENDING',
      'authorizing': 'PROCESSING',
      'submitted_for_settlement': 'PROCESSING',
      'settling': 'PROCESSING',
      'settled': 'COMPLETED',
      'settlement_confirmed': 'COMPLETED',
      'settlement_pending': 'PROCESSING',
      'settlement_declined': 'FAILED',
      'failed': 'FAILED',
      'gateway_rejected': 'FAILED',
      'processor_declined': 'FAILED',
      'voided': 'CANCELLED',
    };

    return statusMap[braintreeStatus.toLowerCase()] || 'PENDING';
  }

  /**
   * Get provider name
   */
  getProviderName() {
    return this.providerName;
  }

  /**
   * Get sandbox URL for viewing transactions
   */
  getSandboxUrl() {
    return 'https://sandbox.braintreegateway.com/merchants/' + process.env.BT_MERCHANT_ID;
  }
}

module.exports = PayPalConnector;
