// PayPalClient.js
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from .env (if needed)
dotenv.config();

class PayPalGateway {
  constructor() {
    // Load credentials from environment
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.redirectUri = process.env.PAYPAL_REDIRECT_URI;
    this.authUrl = process.env.PAYPAL_AUTH_URL;
    this.tokenUrl = process.env.PAYPAL_TOKEN_URL;

    // Decide sandbox vs. production
    this.paypalBaseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    // Base64-encoded "client_id:client_secret"
    this.auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
  }

  /**
   * Creates a reusable Axios instance pointing to PayPal APIs.
   * Optionally include a Bearer token if you need to make
   * user-specific requests (e.g., userinfo).
   */
  paypalAxiosInstance(accessToken) {
    const instance = axios.create({
      baseURL: this.paypalBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If there's a user access token, add it
    if (accessToken) {
      instance.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${accessToken}`;
    }

    // Optional: Add a request interceptor for logging / debugging
    instance.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['PayPal-Request-Id'] = new Date().toISOString();
      return config;
    });

    return instance;
  }

  /**
   * Retrieve an application-level token using client_credentials.
   * This token is used for PayPal REST APIs on behalf of the *app*.
   * It does NOT allow you to fetch *user* info (like email).
   */
  async getAppToken() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('MISSING_API_CREDENTIALS');
    }

    const paypalAxios = this.paypalAxiosInstance(); // No user token needed yet

    // Client Credentials request body
    const requestBody = 'grant_type=client_credentials';
    const headers = {
      Authorization: `Basic ${this.auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await paypalAxios.post('/v1/oauth2/token', requestBody, {
      headers,
    });
    // Typically you'll see: { access_token, token_type, expires_in, ... }
    const { access_token } = response.data;

    // You may choose to store it on the instance
    this.appToken = access_token;
    console.log('accress_token: in line 83', access_token);
    return access_token;
  }

  /**
   * Exchange an authorization code for a *user-specific* token
   * (OpenID Connect). This is how you get the token that can
   * fetch the user's info (like email, name, etc.).
   */
  async exchangeAuthorizationCodeForToken(code, redirectUri) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('MISSING_API_CREDENTIALS');
    }

    const instance = axios.create({
      baseURL: this.paypalBaseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${this.auth}`,
      },
    });

    // Build the request body
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri, // Must match what's set in PayPal dashboard
    });

    // POST /v1/identity/openidconnect/tokenservice
    const { data } = await instance.post(
      '/v1/identity/openidconnect/tokenservice',
      body,
    );
    // data will have: { access_token, refresh_token, id_token, etc. }
    return data;
  }

  /**
   * Fetch user info from the OpenID userinfo endpoint, given a user-specific token.
   */
  async getUserInfo(userAccessToken) {
    const instance = this.paypalAxiosInstance(userAccessToken);
    // GET /v1/identity/openidconnect/userinfo?schema=openid
    const response = await instance.get(
      '/v1/identity/openidconnect/userinfo?schema=openid',
    );
    return response.data; // e.g., { email, name, etc. }
  }

  async createOrder({ userId, price, currency = 'USD', state }) {
    const token = await this.getAppToken();
    const paypalAxios = this.paypalAxiosInstance(token);
    const orderDetails = {
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: price },
        },
      ],
      application_context: {
        return_url: `https://qosynebackend.vercel.app/api/payment/paypal/callback/authorize?state=${state}`,
        cancel_url: 'https://qosynebackend.vercel.app/api/payment/paypal/failure',
        brand_name: 'Qosyne',
        user_action: 'PAY_NOW',
      },
    };

    const response = await paypalAxios.post(
      '/v2/checkout/orders',
      orderDetails,
      {
        headers: { Prefer: 'return=representation' },
      },
    );

    return {
      orderID: response?.data?.id,
      links: response?.data?.links || [],
    };
  }

  /**
   * AUTHORIZE PAYMENT:
   * Option A: Capture or authorize an existing PayPal Order
   * Option B: Send a Payout to another PayPal user (recipient)
   */
  async authorizePayment({
    orderID,
    amount,
    currency = 'USD',
    recipient,
    walletDeposit,
    useQosyneBalance = false,
    connectedWalletId,
  }) {
    const token = await this.getAppToken();
    const paypalAxios = this.paypalAxiosInstance(token);

    if (!orderID && !useQosyneBalance) {
      throw new Error('Missing orderID. Cannot authorize payment.');
    }

    // Validate that walletDeposit and useQosyneBalance are mutually exclusive
    if (walletDeposit && useQosyneBalance) {
      throw new Error('walletDeposit and useQosyneBalance cannot both be true');
    }

    console.log('Processing PayPal payment:', {
      amount,
      currency,
      walletDeposit,
      useQosyneBalance,
    });

    // Handle Qosyne balance case separately - doesn't require orderID
    if (useQosyneBalance) {
      console.log('Using Qosyne balance for PayPal payment');

      // Different flows based on recipient vs wallet deposit
      if (recipient?.email) {
        // Send money to recipient from business account
        console.log('Sending money to recipient from Qosyne balance');

        // Create a payout to recipient from business account
        const payoutResponse = await paypalAxios.post('/v1/payments/payouts', {
          sender_batch_header: {
            sender_batch_id: `qosyne_batch_${Date.now()}`,
            email_subject: 'You have a payment from Qosyne',
            email_message: 'You have received a payment from Qosyne!',
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: { value: amount, currency },
              receiver: recipient.email,
              note: `Transfer from Qosyne to ${recipient.email}`,
              sender_item_id: `qosyne_${Date.now()}`,
            },
          ],
        });

        console.log('Payout created from Qosyne balance:', payoutResponse.data);

        return {
          paymentId: payoutResponse.data.batch_header.payout_batch_id,
          payedAmount: parseFloat(amount),
          response: {
            ...payoutResponse.data,
            source: 'QOSYNE_BALANCE',
            destination: 'RECIPIENT',
          },
        };
      }
    }

    // Original PayPal flow continues below for non-Qosyne balance payments
    // 🔹 Get Order Status Before Authorization
    const orderDetailsResponse = await paypalAxios.get(
      `/v2/checkout/orders/${orderID}`,
    );

    if (orderDetailsResponse.data.status === 'EXPIRED') {
      throw new Error('PayPal order expired. Please create a new order.');
    }

    // if already completed return
    if (orderDetailsResponse.data.status === 'COMPLETED') {
      return {
        paymentId: orderID,
        payedAmount: amount,
        response: orderDetailsResponse.data,
      };
    }

    // Rest of the existing method remains unchanged
    if (recipient?.email && !walletDeposit && !useQosyneBalance) {
      // Payouts API
      const payoutResponse = await paypalAxios.post('/v1/payments/payouts', {
        sender_batch_header: {
          sender_batch_id: `batch_${Date.now()}`,
          email_subject: 'You have a payment',
          email_message: 'You have received a payment!',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: { value: amount, currency },
            receiver: recipient.email,
            note: `Transfer to ${recipient.email}`,
            sender_item_id: `${Date.now()}`,
          },
        ],
      });

      return {
        paymentId: payoutResponse.data.batch_header.payout_batch_id,
        payedAmount: amount,
        response: payoutResponse.data,
      };
    } else if (walletDeposit) {
      // Wallet Deposit (Authorization → Capture)
      const authorizeResponse = await paypalAxios.post(
        `/v2/checkout/orders/${orderID}/authorize`,
        null,
        { headers: { 'PayPal-Request-Id': new Date().toISOString() } },
      );
      const authId =
        authorizeResponse.data.purchase_units[0].payments.authorizations[0].id;
      await this.paymentCapture({ paymentId: authId });

      return {
        paymentId: authId,
        payedAmount: amount,
        response: authorizeResponse.data,
      };
    }
  }
  /**
   * Capture a previously authorized payment.
   * @param {object} params
   * @param {string} params.paymentId - The authorization ID to capture
   * @returns {Promise<{ response: any }>}
   */
  async paymentCapture({ paymentId }) {
    try {
      // 1) Get app token
      const token = await this.getAppToken();
      // 2) Create Axios instance
      const paypalAxios = this.paypalAxiosInstance(token);

      // 3) Attempt to capture
      const response = await paypalAxios.post(
        `/v2/payments/authorizations/${paymentId}/capture`,
      );

      const captureStatus = response?.data?.status;

      if (captureStatus === 'COMPLETED') {
        return { response: response.data };
      } else if (captureStatus === 'PENDING') {
        return { response: response.data, status: 'PENDING_REVIEW' };
      } else {
        throw new Error(`⚠️ Capture failed. Status: ${captureStatus}`);
      }
    } catch (error) {
      console.error('❌ Capture Failed:', error.message);
      throw new Error(error.message);
    }
  }

  async handleGooglePayPayment({ amount, currency = 'USD', paymentData }) {
    const token = await this.getAppToken();
    const paypalAxios = this.paypalAxiosInstance(token);

    try {
      // Create order for Google Pay
      const orderResponse = await paypalAxios.post('/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
          },
        ],
        payment_source: {
          google_pay: {
            payment_data: paymentData,
          },
        },
      });

      // Capture the payment immediately
      const captureResponse = await paypalAxios.post(
        `/v2/checkout/orders/${orderResponse.data.id}/capture`,
      );

      return {
        paymentId: captureResponse.data.id,
        payedAmount: amount,
        response: captureResponse.data,
      };
    } catch (error) {
      console.error('Google Pay payment error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}

module.exports = PayPalGateway;
