// gateways/ApplePayGateway.js
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');
const axios = require('axios');

class ApplePayGateway extends MethodBasedPayment {
  constructor() {
    super();
    this.paypalBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        `${this.paypalBaseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error('PayPal auth error:', error.response?.data || error);
      throw new Error('Failed to get PayPal access token');
    }
  }

  async authorizePayment(paymentData) {
    try {
      const { amount, paymentToken, recipient } = paymentData;
      console.log('Processing Apple Pay payment:', { amount, recipient });

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
                value: amount
              }
            }
          ],
          payment_source: {
            apple_pay: {
              payment_token: paymentToken,
              name: recipient.name,
              email: recipient.email,
              phone: {
                country_code: '1',
                national_number: recipient.phone.replace(/\D/g, '')
              },
              experience_context: {
                payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
                brand_name: "Qosyne",
                locale: "en-US",
                landing_page: "NO_PREFERENCE",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW"
              }
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `APPLEPAY_${Date.now()}`,
            Prefer: 'return=representation'
          }
        }
      );

      // Capture the payment immediately
      const captureResponse = await axios.post(
        `${this.paypalBaseUrl}/v2/checkout/orders/${orderResponse.data.id}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `APPLEPAY_CAPTURE_${Date.now()}`,
            Prefer: 'return=representation'
          }
        }
      );

      return {
        paymentId: captureResponse.data.id,
        payedAmount: parseFloat(amount),
        response: captureResponse.data
      };

    } catch (error) {
      console.error('Apple Pay payment error:', error.response?.data || error);
      const errorDetails = error.response?.data?.details?.[0] || {};
      throw new Error(`Apple Pay payment failed: ${errorDetails.description || error.message}`);
    }
  }
}

module.exports = ApplePayGateway;
