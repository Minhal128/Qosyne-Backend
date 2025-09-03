// gateways/GooglePayGateway.js
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class GooglePayGateway extends MethodBasedPayment {
  constructor() {
    super();
    this.paypalBaseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');
      const response = await axios.post(
        `${this.paypalBaseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      console.error('PayPal auth error:', error.response?.data || error);
      throw new Error('Failed to get PayPal access token');
    }
  }

  async attachBankAccount({ userId, paymentMethodId, bankAccount }) {
    try {
      console.log('Attaching Google Pay:', bankAccount);
      return {
        attachedPaymentMethodId: paymentMethodId,
        customerDetails: {
          name: bankAccount?.billingAddress?.name || 'Google Pay User',
          currency: bankAccount?.currency || 'USD',
          email: bankAccount?.email || null,
        },
      };
    } catch (error) {
      console.error('Error attaching Google Pay:', error);
      throw new Error(`Failed to attach Google Pay: ${error.message}`);
    }
  }

  async authorizePayment(paymentData) {
    try {
      const {
        amount,
        paymentToken,
        recipient,
        walletDeposit = false,
      } = paymentData;

      // In production, use the real PayPal integration
      if (process.env.NODE_ENV === 'production') {
        // Keep the existing PayPal integration
        // This assumes you already have the PayPal logic implemented
        // as mentioned in your requirements

        const accessToken = await this.getAccessToken();

        // Create PayPal order
        const orderResponse = await axios.post(
          `${this.paypalBaseUrl}/v2/checkout/orders`,
          {
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: 'USD',
                  value: amount,
                },
              },
            ],
            payment_source: {
              google_pay: {
                payment_token: paymentToken,
                name: recipient.name,
                email: recipient.email,
                phone: {
                  country_code: '1',
                  national_number: recipient.phone.replace(/\D/g, ''),
                },
                experience_context: {
                  payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                  brand_name: 'Your Brand Name',
                  locale: 'en-US',
                  landing_page: 'NO_PREFERENCE',
                  shipping_preference: 'NO_SHIPPING',
                  user_action: 'PAY_NOW',
                },
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'PayPal-Request-Id': `GPAY_${Date.now()}`,
              Prefer: 'return=representation',
            },
          },
        );

        console.log('Order created:', orderResponse.data);

        // Capture the payment immediately
        const captureResponse = await axios.post(
          `${this.paypalBaseUrl}/v2/checkout/orders/${orderResponse.data.id}/capture`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'PayPal-Request-Id': `GPAY_CAPTURE_${Date.now()}`,
              Prefer: 'return=representation',
            },
          },
        );

        console.log('Payment captured:', captureResponse.data);

        return {
          paymentId: captureResponse.data.id,
          payedAmount: parseFloat(amount),
          response: captureResponse.data,
        };
      } else {
        // In non-production environments, return a dummy successful response
        const idempotencyKey = uuidv4();

        const paymentResponse = {
          id: `gpay_${idempotencyKey.substring(0, 8)}`,
          status: 'COMPLETED',
          amount: parseFloat(amount),
          currency: 'USD',
          created_at: new Date().toISOString(),
          payment_method: 'GOOGLE_PAY',
          destination: walletDeposit ? 'BUSINESS_ACCOUNT' : 'RECIPIENT',
          recipient_details: walletDeposit ? null : recipient,
        };

        console.log(
          `Simulated Google Pay payment processed: ${
            walletDeposit ? 'Wallet Deposit' : 'Recipient Transfer'
          }`,
        );

        return {
          paymentId: paymentResponse.id,
          payedAmount: parseFloat(amount),
          response: paymentResponse,
        };
      }
    } catch (error) {
      console.error('Google Pay payment error:', error);
      throw new Error(`Google Pay payment failed: ${error.message}`);
    }
  }
}

module.exports = GooglePayGateway;
