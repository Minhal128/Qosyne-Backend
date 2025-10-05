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

    // Validate credentials
    if (!this.accessToken) {
      throw new Error('❌ SQUARE_ACCESS_TOKEN is required but not set in environment variables');
    }
    if (!this.locationId) {
      throw new Error('❌ SQUARE_LOCATION_ID is required but not set in environment variables');
    }
    if (!this.applicationId) {
      throw new Error('❌ SQUARE_APPLICATION_ID is required but not set in environment variables');
    }
    
    // Check if token looks expired (common issue)
    if (this.accessToken && this.accessToken.startsWith('EAAA') && this.accessToken.length < 50) {
      console.warn('⚠️  WARNING: Your Square access token appears to be short/potentially expired');
      console.warn('⚠️  If you get 401 errors, get a fresh token from https://developer.squareup.com/apps');
    }

    // Validate credentials on initialization (async, don't block)
    this.validateCredentials().catch(err => {
      console.warn('⚠️  Square credential validation failed during initialization:', err.message);
    });

    console.log('✅ Square Gateway initialized:', {
      environment: sqEnv,
      baseUrl: this.baseUrl,
      accessTokenPresent: !!this.accessToken,
      locationId: this.locationId,
      applicationId: this.applicationId
    });

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        'Square-Version': process.env.SQUARE_VERSION || '2024-06-20',
      },
    });

    // Add request interceptor for debugging
    this.axiosInstance.interceptors.request.use((config) => {
      console.log(`🔍 Square API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ Square API Response: ${response.status} ${response.config?.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ Square API Error: ${error.response?.status} ${error.config?.url}`);
        console.error('Square API Error Details:', error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // Method to validate Square credentials
  async validateCredentials() {
    try {
      console.log('🔍 Testing Square API credentials...');
      const response = await this.axiosInstance.get('/locations');
      
      if (response.data && response.data.locations) {
        console.log('✅ Square credentials are valid');
        console.log('Available locations:', response.data.locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          status: loc.status
        })));
        
        // Check if our configured location ID exists
        const locationExists = response.data.locations.find(loc => loc.id === this.locationId);
        if (!locationExists) {
          throw new Error(`Configured SQUARE_LOCATION_ID '${this.locationId}' not found in available locations`);
        }
        
        return true;
      }
      
      throw new Error('Invalid response from Square API');
    } catch (error) {
      console.error('❌ Square credentials validation failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      if (error.response?.status === 401) {
        console.error('❌ SQUARE TOKEN EXPIRED OR INVALID');
        console.error('🔧 SOLUTION: Get a fresh token from https://developer.squareup.com/apps');
        console.error('📋 Steps:');
        console.error('   1. Go to https://developer.squareup.com/apps');
        console.error('   2. Sign in to your Square Developer account');
        console.error('   3. Select your application');
        console.error('   4. Go to Credentials tab');
        console.error('   5. Copy the fresh Sandbox Access Token');
        console.error('   6. Update SQUARE_ACCESS_TOKEN in your .env file');
        console.error('   7. Restart your server');
        
        // Don't throw error, just warn - let the app continue
        return false;
      }
      console.warn('⚠️  Square token validation failed:', error.message);
      return false;
    }
  }

  async createOrGetCustomer({ email, name }) {
    try {
      console.log(`🔍 Attempting to search/create customer: ${email}`);
      console.log(`🔑 Using access token: ${this.accessToken?.substring(0, 10)}...`);
      console.log(`🌐 Using base URL: ${this.baseUrl}`);
      
      let searchRes;
      try {
        console.log('📋 Searching for existing customer...');
        searchRes = await this.axiosInstance.post('/customers/search', {
          query: {
            filter: {
              email_address: {
                exact: email,
              },
            },
          },
        });
        
        if (searchRes.data?.customers?.length > 0) {
          const customerId = searchRes.data.customers[0].id;
          console.log(`✅ Found existing customer: ${customerId}`);
          return customerId;
        }
        
        console.log('👤 No existing customer found, creating new one...');
      } catch (searchError) {
        console.log('⚠️  Customer search failed, proceeding to create new customer');
        console.error('Search error details:', searchError.response?.data);
      }

      // Create new customer
      console.log(`👤 Creating new customer: ${name || 'Customer'} (${email})`);
      const createRes = await this.axiosInstance.post('/customers', {
        given_name: name || 'Customer',
        email_address: email,
      });

      const customerId = createRes.data.customer.id;
      console.log(`✅ Successfully created new customer: ${customerId}`);
      return customerId;
      
    } catch (err) {
      console.error('❌ SQUARE API ERROR - Customer operation failed:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method,
        data: err.response?.data,
        headers: err.config?.headers
      });
      
      // Handle specific Square API errors
      if (err.response?.status === 401) {
        console.error('🚨 SQUARE AUTHENTICATION FAILED');
        console.error('📋 SOLUTION STEPS:');
        console.error('   1. Go to https://developer.squareup.com/apps');
        console.error('   2. Sign in to your Square Developer account');
        console.error('   3. Select your application');
        console.error('   4. Go to "Credentials" tab');
        console.error('   5. Copy the fresh "Sandbox Access Token"');
        console.error('   6. Update SQUARE_ACCESS_TOKEN in your .env file');
        console.error('   7. Restart your server');
        console.error(`   Current token: ${this.accessToken?.substring(0, 15)}...`);
        
        const errorMsg = 'SQUARE_ACCESS_TOKEN is expired or invalid. Please get a fresh token from Square Developer Dashboard.';
        throw new Error(errorMsg);
      } 
      
      if (err.response?.status === 403) {
        const errorMsg = 'SQUARE AUTHORIZATION FAILED: Your access token does not have sufficient permissions for customer operations.';
        console.error('🚨 ' + errorMsg);
        throw new Error(errorMsg);
      }
      
      if (err.response?.status === 400) {
        const errorDetail = err.response.data?.errors?.[0]?.detail || 'Bad request to Square API';
        const errorMsg = `SQUARE API BAD REQUEST: ${errorDetail}`;
        console.error('🚨 ' + errorMsg);
        throw new Error(errorMsg);
      }
      
      // Generic error
      const errorMsg = `SQUARE API ERROR: ${err.message}. Status: ${err.response?.status || 'Unknown'}`;
      console.error('🚨 ' + errorMsg);
      throw new Error(errorMsg);
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
