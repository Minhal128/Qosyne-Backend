const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');

class SquareGateway extends MethodBasedPayment {
  constructor() {
    super();

    // Select Square environment via dedicated var to avoid NODE_ENV mismatch
    const sqEnv = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
    const isProd = sqEnv === 'production';

    this.baseUrl = isProd
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    this.accessToken = process.env.SQUARE_ACCESS_TOKEN;
    this.locationId = process.env.SQUARE_LOCATION_ID;
    this.applicationId = process.env.SQUARE_APPLICATION_ID;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        'Square-Version': process.env.SQUARE_VERSION || '2024-06-20',
      },
    });
  }

  async createOrGetCustomer({ email, name }) {
    try {
      // 1. Search Customer by email
      const searchRes = await this.axiosInstance.post('/customers/search', {
        query: {
          filter: {
            email_address: {
              exact: email,
            },
          },
        },
      });

      if (searchRes.data?.customers?.length > 0) {
        return searchRes.data.customers[0].id;
      }

      // 2. If not found, create new customer
      const createRes = await this.axiosInstance.post('/customers', {
        given_name: name,
        email_address: email,
      });

      return createRes.data.customer.id;
    } catch (err) {
      console.error(
        '❌ Customer creation/search failed:',
        err?.response?.data || err.message,
      );
      throw new Error('Failed to create or find customer');
    }
  }

  async storeCardOnFile(customerId, sourceId, cardholderName) {
    try {
      const res = await this.axiosInstance.post('/cards', {
        idempotency_key: uuidv4(),
        source_id: sourceId,
        card: {
          customer_id: customerId,
          ...(cardholderName ? { cardholder_name: cardholderName } : {}),
        },
      });

      return res.data.card.id;
    } catch (err) {
      console.error('❌ Storing card failed:', err?.response?.data || err.message);
      const msg = err?.response?.data?.errors?.[0]?.detail || err.message;
      throw new Error(`Failed to store card on file: ${msg}`);
    }
  }

  async attachBankAccount({ userId, paymentMethodId, bankAccount }) {
    const customerId = await this.createOrGetCustomer(bankAccount);
    const cardId = await this.storeCardOnFile(customerId, paymentMethodId, bankAccount?.name);

    return {
      attachedPaymentMethodId: cardId,
      connectedWalletId: customerId,
      customerDetails: {
        name: bankAccount?.name || 'Square User',
        currency: bankAccount?.currency || 'USD',
        email: bankAccount?.email,
        squareCustomerId: customerId,
      },
    };
  }

  async authorizePayment({
    amount,
    currency,
    paymentToken,
    connectedWalletId,
    recipient,
    walletDeposit = false,
    useQosyneBalance = false,
  }) {
    try {
      // Check for cross-platform transfer first
      if (connectedWalletId && !walletDeposit) {
        // Cross-platform transfer (Square → Other Wallet)
        console.log('Processing cross-platform transfer from Square to connected wallet:', connectedWalletId);
        
        const transferId = uuidv4();
        return {
          paymentId: `square_cross_platform_${transferId.substring(0, 8)}`,
          payedAmount: parseFloat(amount),
          response: {
            id: `cross_platform_${transferId}`,
            status: 'cross_platform_pending',
            sourceValue: amount,
            sourceCurrency: currency || 'USD',
            targetValue: amount,
            targetCurrency: currency || 'USD',
            source: 'SQUARE_CROSS_PLATFORM',
            connectedWalletId: connectedWalletId,
            transferType: 'CROSS_PLATFORM'
          }
        };
      }

      const idempotencyKey = uuidv4();

      const res = await this.axiosInstance.post('/payments', {
        source_id: paymentToken,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: Math.round(parseFloat(amount) * 100),
          currency: 'USD',
        },
        location_id: this.locationId,
        customer_id: connectedWalletId,
        note: walletDeposit
          ? 'Wallet Deposit'
          : `Transfer to ${recipient?.email || 'Recipient'}`,
        autocomplete: true,
      });

      return {
        paymentId: res.data.payment.id,
        payedAmount: res.data.payment.amount_money.amount / 100,
        response: res.data.payment,
      };
    } catch (err) {
      console.error('❌ Payment failed:', err?.response?.data || err.message);
      const msg = err?.response?.data?.errors?.[0]?.detail || err.message;
      throw new Error(`Square payment failed: ${msg}`);
    }
  }

  async createPaymentToken(cardDetails) {
    throw new Error(
      'Use Square Web SDK on frontend to generate payment token (nonce).',
    );
  }

  async createOrder({ userId, price, currency, state }) {
    return {
      orderID: `square_order_${Date.now()}`,
      links: [
        {
          href: `https://example.com/square/approve?token=dummy_token&state=${state}`,
          rel: 'approve',
        },
      ],
    };
  }
}

module.exports = SquareGateway;
