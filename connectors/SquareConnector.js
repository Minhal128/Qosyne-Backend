/**
 * Square Connector
 * Handles Square to Square transfers and payments
 * Transfer rule: Square ↔ Square (bidirectional internal)
 */

const square = require('square');
const { v4: uuidv4 } = require('uuid');

class SquareConnector {
  constructor() {
    try {
      // Initialize Square client
      const { Client, Environment } = square;
      this.client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: Environment.Sandbox,
      });
    } catch (error) {
      console.warn('Square SDK initialization failed:', error.message);
      // Create a mock client for development
      this.client = null;
    }

    this.providerName = 'SQUARE';
  }

  /**
   * Create customer in Square
   */
  async createCustomer(userData) {
    if (!this.client) {
      throw new Error('Square client not initialized');
    }
    
    try {
      const { customersApi } = this.client;

      const response = await customersApi.createCustomer({
        givenName: userData.firstName || userData.name,
        familyName: userData.lastName || '',
        emailAddress: userData.email,
        phoneNumber: userData.phone,
      });

      if (response.result.customer) {
        return {
          customerId: response.result.customer.id,
          email: response.result.customer.emailAddress,
          name: `${response.result.customer.givenName} ${response.result.customer.familyName}`,
        };
      }
    } catch (error) {
      console.error('Square: Error creating customer:', error);
      throw new Error('Failed to create Square customer');
    }
  }

  /**
   * Create payment method (card)
   */
  async addPaymentMethod(customerId, sourceId) {
    if (!this.client) {
      throw new Error('Square client not initialized');
    }
    
    try {
      const { cardsApi } = this.client;

      const response = await cardsApi.createCard({
        idempotencyKey: uuidv4(),
        sourceId: sourceId, // Nonce from frontend
        card: {
          customerId: customerId,
        },
      });

      if (response.result.card) {
        return {
          cardId: response.result.card.id,
          brand: response.result.card.cardBrand,
          last4: response.result.card.last4,
          expMonth: response.result.card.expMonth,
          expYear: response.result.card.expYear,
        };
      }
    } catch (error) {
      console.error('Square: Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Send money via Square payment
   */
  async sendMoney(params) {
    if (!this.client) {
      throw new Error('Square client not initialized');
    }
    
    try {
      const { amount, currency, sourceId, customerId, note } = params;
      const { paymentsApi } = this.client;

      // Amount in cents
      const amountMoney = {
        amount: Math.round(amount * 100),
        currency: currency || 'USD',
      };

      const requestBody = {
        idempotencyKey: uuidv4(),
        sourceId: sourceId,
        amountMoney: amountMoney,
        autocomplete: true,
      };

      if (customerId) {
        requestBody.customerId = customerId;
      }

      if (note) {
        requestBody.note = note;
      }

      const response = await paymentsApi.createPayment(requestBody);

      if (response.result.payment) {
        const payment = response.result.payment;
        return {
          success: true,
          transactionId: payment.id,
          status: this._mapStatus(payment.status),
          amount: payment.amountMoney.amount / 100,
          currency: payment.amountMoney.currency,
          providerResponse: {
            id: payment.id,
            orderId: payment.orderId,
            receiptUrl: payment.receiptUrl,
            status: payment.status,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          },
        };
      }
    } catch (error) {
      console.error('Square: Error sending money:', error);
      return {
        success: false,
        error: error.errors?.[0]?.detail || error.message,
      };
    }
  }

  /**
   * Process payment
   */
  async receiveMoney(params) {
    return this.sendMoney(params); // Same operation for Square
  }

  /**
   * Get payment details
   */
  async getTransaction(paymentId) {
    try {
      const { paymentsApi } = this.client;
      const response = await paymentsApi.getPayment(paymentId);

      if (response.result.payment) {
        const payment = response.result.payment;
        return {
          id: payment.id,
          amount: payment.amountMoney.amount / 100,
          status: this._mapStatus(payment.status),
          currency: payment.amountMoney.currency,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          orderId: payment.orderId,
          receiptUrl: payment.receiptUrl,
          details: {
            sourceType: payment.sourceType,
            cardDetails: payment.cardDetails,
          },
        };
      }
    } catch (error) {
      console.error('Square: Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * List payments
   */
  async searchTransactions(params = {}) {
    try {
      const { beginTime, endTime, locationId, limit = 100 } = params;
      const { paymentsApi } = this.client;

      const requestBody = {
        limit: limit,
      };

      if (beginTime) {
        requestBody.beginTime = beginTime;
      }

      if (endTime) {
        requestBody.endTime = endTime;
      }

      if (locationId) {
        requestBody.locationId = locationId;
      }

      const response = await paymentsApi.listPayments(requestBody);

      if (response.result.payments) {
        return response.result.payments.map(payment => ({
          id: payment.id,
          amount: payment.amountMoney.amount / 100,
          status: this._mapStatus(payment.status),
          currency: payment.amountMoney.currency,
          createdAt: payment.createdAt,
          orderId: payment.orderId,
        }));
      }

      return [];
    } catch (error) {
      console.error('Square: Error searching transactions:', error);
      return [];
    }
  }

  /**
   * Cancel/Refund payment
   */
  async refundPayment(paymentId, amount, reason) {
    try {
      const { refundsApi } = this.client;

      const requestBody = {
        idempotencyKey: uuidv4(),
        paymentId: paymentId,
        amountMoney: {
          amount: Math.round(amount * 100),
          currency: 'USD',
        },
        reason: reason || 'Customer requested refund',
      };

      const response = await refundsApi.refundPayment(requestBody);

      if (response.result.refund) {
        return {
          success: true,
          refundId: response.result.refund.id,
          status: response.result.refund.status,
          amount: response.result.refund.amountMoney.amount / 100,
        };
      }
    } catch (error) {
      console.error('Square: Error refunding payment:', error);
      return {
        success: false,
        error: error.errors?.[0]?.detail || error.message,
      };
    }
  }

  /**
   * Create checkout link for payment
   */
  async createCheckoutLink(params) {
    try {
      const { amount, currency, description, redirectUrl } = params;
      const { checkoutApi } = this.client;

      const requestBody = {
        idempotencyKey: uuidv4(),
        order: {
          locationId: process.env.SQUARE_LOCATION_ID || 'main',
          lineItems: [
            {
              name: description || 'Payment',
              quantity: '1',
              basePriceMoney: {
                amount: Math.round(amount * 100),
                currency: currency || 'USD',
              },
            },
          ],
        },
        checkoutOptions: {
          redirectUrl: redirectUrl,
        },
      };

      const response = await checkoutApi.createPaymentLink(requestBody);

      if (response.result.paymentLink) {
        return {
          checkoutUrl: response.result.paymentLink.url,
          linkId: response.result.paymentLink.id,
        };
      }
    } catch (error) {
      console.error('Square: Error creating checkout link:', error);
      throw error;
    }
  }

  /**
   * Check if this connector supports a transfer route
   */
  canTransfer(fromProvider, toProvider) {
    // Square to Square transfers only
    return fromProvider.toUpperCase() === 'SQUARE' && 
           toProvider.toUpperCase() === 'SQUARE';
  }

  /**
   * Map Square status to internal status
   */
  _mapStatus(squareStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'COMPLETED': 'COMPLETED',
      'CANCELED': 'CANCELLED',
      'FAILED': 'FAILED',
      'APPROVED': 'PROCESSING',
    };

    return statusMap[squareStatus] || 'PENDING';
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
    return 'https://squareupsandbox.com/dashboard/sales/transactions';
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId) {
    try {
      const { customersApi } = this.client;
      const response = await customersApi.retrieveCustomer(customerId);

      if (response.result.customer) {
        const customer = response.result.customer;
        return {
          id: customer.id,
          email: customer.emailAddress,
          name: `${customer.givenName} ${customer.familyName}`,
          phone: customer.phoneNumber,
          createdAt: customer.createdAt,
        };
      }
    } catch (error) {
      console.error('Square: Error getting customer:', error);
      throw error;
    }
  }

  /**
   * List customer's cards
   */
  async listCards(customerId) {
    try {
      const { cardsApi } = this.client;
      const response = await cardsApi.listCards(undefined, customerId);

      if (response.result.cards) {
        return response.result.cards.map(card => ({
          id: card.id,
          brand: card.cardBrand,
          last4: card.last4,
          expMonth: card.expMonth,
          expYear: card.expYear,
          enabled: card.enabled,
        }));
      }

      return [];
    } catch (error) {
      console.error('Square: Error listing cards:', error);
      return [];
    }
  }
}

module.exports = SquareConnector;
