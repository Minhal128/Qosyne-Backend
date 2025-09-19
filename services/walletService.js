const axios = require('axios');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class WalletService {
  constructor() {
    this.providers = {
      PAYPAL: {
        baseUrl: process.env.PAYPAL_BASE_URL || 'https://api.paypal.com',
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        capabilities: ['send', 'receive', 'balance_check']
      },
      GOOGLEPAY: {
        baseUrl: 'https://pay.google.com/gp/p',
        apiKey: process.env.GOOGLEPAY_API_KEY,
        capabilities: ['send', 'receive']
      },
      WISE: {
        baseUrl: process.env.WISE_ENVIRONMENT === 'sandbox' ? 'https://api.sandbox.transferwise.tech' : 'https://api.wise.com',
        apiToken: process.env.WISE_API_TOKEN,
        profileId: process.env.WISE_PROFILE_ID,
        walletAccountId: process.env.WISE_WALLET_ACCOUNT_ID,
        environment: process.env.WISE_ENVIRONMENT || 'sandbox',
        capabilities: ['send', 'receive', 'balance_check', 'multi_currency']
      },
      SQUARE: {
        baseUrl: process.env.SQUARE_ENVIRONMENT === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        applicationId: process.env.SQUARE_APPLICATION_ID,
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
        capabilities: ['send', 'receive', 'balance_check']
      },
      VENMO: {
        baseUrl: process.env.PAYPAL_TOKEN_URL?.replace('/v1/oauth2/token', '/v1') || 'https://api-m.sandbox.paypal.com/v1',
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        capabilities: ['send', 'receive']
      },
      APPLEPAY: {
        merchantId: process.env.APPLE_PAY_MERCHANT_ID,
        merchantDomain: process.env.APPLE_PAY_MERCHANT_DOMAIN,
        certificatePath: process.env.APPLE_PAY_CERTIFICATE_PATH,
        keyPath: process.env.APPLE_PAY_KEY_PATH,
        environment: process.env.APPLE_PAY_ENVIRONMENT || 'sandbox',
        capabilities: ['send', 'receive', 'contactless']
      }
    };
  }

  async getUserWallets(userId) {
    try {
      const wallets = await prisma.connectedWallets.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      return wallets.map(wallet => ({
        id: wallet.id,
        provider: wallet.provider,
        walletId: wallet.walletId,
        accountEmail: wallet.accountEmail,
        fullName: wallet.fullName,
        username: wallet.username,
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        lastSync: wallet.lastSync,
        capabilities: wallet.capabilities ? JSON.parse(wallet.capabilities) : [],
        createdAt: wallet.createdAt
      }));
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      throw error;
    }
  }

  async connectWallet(userId, walletData) {
    try {
      const { authCode, accessToken } = walletData;
      // Normalize and validate inputs
      const numericUserId = Number(userId);
      if (!numericUserId || Number.isNaN(numericUserId)) {
        throw new Error('Invalid authenticated user id');
      }

      // Ensure user exists to satisfy FK constraint on connectedWallets.userId
      const userExists = await prisma.users.findUnique({ where: { id: numericUserId } });
      if (!userExists) {
        // Provide a clear error for clients to handle (e.g., 401/404 upstream)
        const notFoundError = new Error('User not found');
        notFoundError.code = 'USER_NOT_FOUND';
        throw notFoundError;
      }

      const provider = (walletData.provider || '').toUpperCase();
      
      if (!this.providers[provider]) {
        throw new Error(`Unsupported wallet provider: ${provider}`);
      }

      // Check if user already has an active wallet for this provider
      const existingWallet = await prisma.connectedWallets.findFirst({
        where: { 
          userId: numericUserId, 
          provider: provider, 
          isActive: true 
        }
      });

      if (existingWallet) {
        // Instead of throwing an error, reactivate the existing wallet or update it
        console.log(`User ${numericUserId} already has a ${provider} wallet connected. Updating connection...`);
        
        // Update the existing wallet with new connection data if needed
        let connectionResult;
        
        switch (provider) {
          case 'PAYPAL':
            connectionResult = await this.connectPayPal(userId, authCode);
            break;
          case 'GOOGLEPAY':
            connectionResult = await this.connectGooglePay(userId, accessToken);
            break;
          case 'WISE':
            connectionResult = await this.connectWise(userId, authCode);
            break;
          case 'SQUARE':
            connectionResult = await this.connectSquare(userId, authCode);
            break;
          case 'VENMO':
            connectionResult = await this.connectVenmo(userId, authCode);
            break;
          case 'APPLEPAY':
            connectionResult = await this.connectApplePay(userId, authCode);
            break;
          default:
            throw new Error(`Connection method not implemented for ${provider}`);
        }

        // Update the existing wallet
        const updatedWallet = await prisma.connectedWallets.update({
          where: { id: existingWallet.id },
          data: {
            accountEmail: connectionResult.accountEmail,
            fullName: connectionResult.fullName,
            username: connectionResult.username,
            accessToken: connectionResult.accessToken,
            refreshToken: connectionResult.refreshToken,
            capabilities: JSON.stringify(this.providers[provider].capabilities),
            currency: connectionResult.currency || 'USD',
            lastSync: new Date(),
            isActive: true
          }
        });

        console.log('Existing wallet updated successfully', { userId, provider, walletId: updatedWallet.id });
        return {
          ...updatedWallet,
          connectedWalletId: updatedWallet.id // Ensure we return the database ID for transactions
        };
      }

      let connectionResult;
      
      switch (provider) {
        case 'PAYPAL':
          connectionResult = await this.connectPayPal(userId, authCode);
          break;
        case 'GOOGLEPAY':
          connectionResult = await this.connectGooglePay(userId, accessToken);
          break;
        case 'WISE':
          connectionResult = await this.connectWise(userId, authCode);
          break;
        case 'SQUARE':
          connectionResult = await this.connectSquare(userId, authCode);
          break;
        case 'VENMO':
          connectionResult = await this.connectVenmo(userId, authCode);
          break;
        case 'APPLEPAY':
          connectionResult = await this.connectApplePay(userId, authCode);
          break;
        default:
          throw new Error(`Connection method not implemented for ${provider}`);
      }

      // Store wallet connection in database (upsert to handle existing wallets)
      const wallet = await prisma.connectedWallets.upsert({
        where: {
          walletId: connectionResult.walletId
        },
        update: {
          accountEmail: connectionResult.accountEmail,
          fullName: connectionResult.fullName,
          username: connectionResult.username,
          accessToken: connectionResult.accessToken,
          refreshToken: connectionResult.refreshToken,
          capabilities: JSON.stringify(this.providers[provider].capabilities),
          currency: connectionResult.currency || 'USD',
          lastSync: new Date()
        },
        create: {
          userId: numericUserId,
          provider,
          walletId: connectionResult.walletId,
          accountEmail: connectionResult.accountEmail,
          fullName: connectionResult.fullName,
          username: connectionResult.username,
          accessToken: connectionResult.accessToken,
          refreshToken: connectionResult.refreshToken,
          capabilities: JSON.stringify(this.providers[provider].capabilities),
          currency: connectionResult.currency || 'USD',
          lastSync: new Date()
        }
      });

      console.log('Wallet connected successfully', { userId, provider, walletId: wallet.id });
      return {
        ...wallet,
        connectedWalletId: wallet.id // Ensure we return the database ID for transactions
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      // Re-throw with a user-friendly message for FK/user issues
      if ((error && error.code === 'USER_NOT_FOUND') || (error.message || '').includes('Foreign key') || (error.message || '').includes('No "users" record')) {
        const friendly = new Error('Authenticated user not found in this environment');
        friendly.code = 'USER_NOT_FOUND';
        throw friendly;
      }
      throw error;
    }
  }

  async connectPayPal(userId, authCode) {
    try {
      // For testing purposes, create a mock PayPal connection
      // In production, this would use real PayPal OAuth
      console.log('Creating mock PayPal connection for testing');
      
      return {
        walletId: `paypal_${userId}_${Date.now()}`,
        accountEmail: `test${userId}@paypal.com`,
        fullName: `PayPal User ${userId}`,
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`PayPal connection failed: ${error.message}`);
    }
  }

  async connectGooglePay(userId, accessToken) {
    try {
      // Google Pay integration would go here
      // Note: Google Pay has limited API access
      return {
        walletId: `googlepay_${userId}_${Date.now()}`,
        accountEmail: `user${userId}@example.com`,
        fullName: `Google Pay User ${userId}`,
        accessToken: accessToken,
        refreshToken: null,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Google Pay connection failed: ${error.message}`);
    }
  }

  async connectWise(userId, credentials) {
    try {
      // Parse credentials - expecting JSON string with connection data
      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        throw new Error('Invalid credentials format. Expected JSON with connection data');
      }

      const { connectionType, identifier, country } = connectionData;
      if (!connectionType || !identifier) {
        throw new Error('Connection type and identifier are required');
      }

      // Check if we have valid Wise API credentials
      if (!this.providers.WISE.apiToken || !this.providers.WISE.profileId) {
        throw new Error('Wise API credentials not configured.');
      }

      // Use real Wise API with your credentials
      try {
        // Get user profile from Wise API
        const profileResponse = await axios.get(`${this.providers.WISE.baseUrl}/v1/profiles/${this.providers.WISE.profileId}`, {
          headers: { 
            'Authorization': `Bearer ${this.providers.WISE.apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        const profile = profileResponse.data;

        // Get account balances
        const balancesResponse = await axios.get(`${this.providers.WISE.baseUrl}/v1/profiles/${this.providers.WISE.profileId}/balances`, {
          headers: { 
            'Authorization': `Bearer ${this.providers.WISE.apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        const balances = balancesResponse.data;
        const primaryBalance = balances.find(b => b.currency === (country === 'GB' ? 'GBP' : country === 'EU' ? 'EUR' : 'USD')) || balances[0];

        return {
          walletId: `wise_${userId}_${profile.id}`, // Include userId for uniqueness
          accountEmail: profile.details?.email || `${identifier}@wise.com`,
          fullName: `${profile.details?.firstName || 'Wise'} ${profile.details?.lastName || 'User'}`,
          username: identifier,
          accessToken: this.providers.WISE.apiToken,
          refreshToken: null,
          currency: primaryBalance?.currency || 'USD',
          balance: primaryBalance?.amount?.value || 0
        };
      } catch (apiError) {
        // If API call fails, create a connection with the provided data
        const wiseUser = {
          id: this.providers.WISE.profileId,
          email: connectionType === 'email' ? identifier : `${identifier}@wise.com`,
          firstName: identifier.split('@')[0] || identifier,
          lastName: 'User'
        };

        return {
          walletId: `wise_${userId}_${wiseUser.id}`, // Include userId for uniqueness
          accountEmail: wiseUser.email,
          fullName: `${wiseUser.firstName} ${wiseUser.lastName}`,
          username: identifier,
          accessToken: this.providers.WISE.apiToken,
          refreshToken: null,
          currency: country === 'GB' ? 'GBP' : country === 'EU' ? 'EUR' : 'USD',
          balance: 0
        };
      }
    } catch (error) {
      throw new Error(`Wise connection failed: ${error.message}`);
    }
  }

  async connectSquare(userId, credentials) {
    try {
      // Check if we have valid Square API credentials
      if (!this.providers.SQUARE.accessToken || !this.providers.SQUARE.applicationId) {
        throw new Error('Square API credentials not configured.');
      }

      // Parse credentials - expecting JSON string with connection data
      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        // If not JSON, treat as simple identifier
        connectionData = { identifier: credentials };
      }

      const { identifier } = connectionData;
      if (!identifier) {
        throw new Error('Square identifier is required');
      }

      // Use Square API to get merchant info
      try {
        // Get merchant info using the access token
        const merchantResponse = await axios.get(`${this.providers.SQUARE.baseUrl}/v2/merchants`, {
          headers: { 
            'Authorization': `Bearer ${this.providers.SQUARE.accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          }
        });

        const merchant = merchantResponse.data.merchant[0];

        // Get location info
        const locationResponse = await axios.get(`${this.providers.SQUARE.baseUrl}/v2/locations/${this.providers.SQUARE.locationId}`, {
          headers: { 
            'Authorization': `Bearer ${this.providers.SQUARE.accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          }
        });

        const location = locationResponse.data.location;

        return {
          walletId: `square_${merchant.id}`,
          accountEmail: merchant.business_name ? `${merchant.business_name.toLowerCase().replace(/\s+/g, '')}@square.com` : `merchant_${merchant.id}@square.com`,
          fullName: merchant.business_name || `Square Merchant ${merchant.id}`,
          username: identifier,
          accessToken: this.providers.SQUARE.accessToken,
          refreshToken: null,
          currency: location.currency || 'USD',
          locationId: this.providers.SQUARE.locationId
        };
      } catch (apiError) {
        // If API call fails, create a connection with the provided data
        const merchantId = this.providers.SQUARE.applicationId.replace('sq0idp-', '');
        
        return {
          walletId: `square_${merchantId}`,
          accountEmail: `${identifier}@square.com`,
          fullName: `Square User ${identifier}`,
          username: identifier,
          accessToken: this.providers.SQUARE.accessToken,
          refreshToken: null,
          currency: 'USD',
          locationId: this.providers.SQUARE.locationId
        };
      }
    } catch (error) {
      throw new Error(`Square connection failed: ${error.message}`);
    }
  }

  async connectApplePay(userId, credentials) {
    try {
      // Parse credentials - expecting JSON string with connection data
      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        // If not JSON, treat as simple identifier
        connectionData = { identifier: credentials };
      }

      const { identifier, deviceId } = connectionData;
      if (!identifier) {
        throw new Error('Apple Pay identifier is required');
      }

      // Check if we have valid Apple Pay credentials
      if (!this.providers.APPLEPAY.merchantId) {
        // Demo mode for testing
        if (identifier === 'demo@apple.com' || identifier === 'demo') {
          const mockUser = {
            id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
            email: 'demo@apple.com',
            firstName: 'Demo',
            lastName: 'User'
          };

          return {
            walletId: `applepay_${mockUser.id}`,
            accountEmail: mockUser.email,
            fullName: `${mockUser.firstName} ${mockUser.lastName}`,
            username: identifier,
            accessToken: `applepay_demo_token_${Date.now()}`,
            refreshToken: null,
            currency: 'USD',
            deviceId: deviceId || `demo_device_${Date.now()}`
          };
        }
        throw new Error('Apple Pay credentials not configured. Use demo@apple.com for testing.');
      }

      // For real Apple Pay integration, you would validate the merchant session here
      // This is a simplified version that creates a connection
      const applePayUser = {
        id: `applepay_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        email: identifier.includes('@') ? identifier : `${identifier}@icloud.com`,
        firstName: identifier.split('@')[0] || identifier,
        lastName: 'User'
      };

      return {
        walletId: `applepay_${applePayUser.id}`,
        accountEmail: applePayUser.email,
        fullName: `${applePayUser.firstName} ${applePayUser.lastName}`,
        username: identifier,
        accessToken: `applepay_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken: null,
        currency: 'USD',
        deviceId: deviceId || `device_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Apple Pay connection failed: ${error.message}`);
    }
  }

  async connectVenmo(userId, credentials) {
    try {
      // Parse credentials - expecting JSON string with username and password
      let loginData;
      try {
        loginData = JSON.parse(credentials);
      } catch (e) {
        throw new Error('Invalid credentials format. Expected JSON with username and password');
      }

      const { username, password } = loginData;
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Generate a unique device ID for this session
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if we have valid Venmo API credentials
      if (!this.providers.VENMO.clientId || !this.providers.VENMO.clientSecret) {
        // Fallback to demo mode if no real credentials
        if (username === 'demo' && password === 'demo123') {
          const mockUser = {
            id: `${userId}_${Date.now()}`, // Use userId to ensure uniqueness per user
            username: username,
            display_name: 'Demo User (Venmo)',
            email: 'demo@venmo.example.com'
          };

          return {
            walletId: `venmo_${mockUser.id}`,
            accountEmail: mockUser.email,
            fullName: mockUser.display_name,
            username: mockUser.username,
            accessToken: `venmo_demo_token_${Date.now()}`,
            refreshToken: null,
            currency: 'USD',
            balance: 250.75
          };
        }
        throw new Error('Venmo API credentials not configured. Use demo/demo123 for testing.');
      }

      // Get PayPal access token for Venmo business API
      const authResponse = await axios.post(`${this.providers.VENMO.baseUrl}/oauth2/token`, 
        'grant_type=client_credentials',
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          auth: {
            username: this.providers.VENMO.clientId,
            password: this.providers.VENMO.clientSecret
          }
        }
      );

      const { access_token } = authResponse.data;

      // Create user profile with the provided credentials - ensure consistent wallet ID format
      const venmoUserId = `${userId}_${Date.now()}`;
      const venmoUser = {
        id: venmoUserId,
        username: username,
        display_name: username.includes('@') ? username.split('@')[0] : username,
        email: username.includes('@') ? username : `${username}@venmo.com`
      };

      return {
        walletId: `venmo_${venmoUserId}`,
        accountEmail: venmoUser.email,
        fullName: `${venmoUser.display_name} (Venmo)`,
        username: venmoUser.username,
        accessToken: access_token,
        refreshToken: null,
        currency: 'USD',
        balance: Math.floor(Math.random() * 500) + 100 // Random balance 100-600
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Venmo credentials');
      } else if (error.response?.status === 400 && error.response?.data?.error?.code === 81109) {
        throw new Error('Two-factor authentication required. Please use a trusted device or complete 2FA setup');
      } else if (error.response?.status === 404) {
        throw new Error('Venmo API endpoint not found. Please verify API configuration');
      }
      throw new Error(`Venmo connection failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async disconnectWallet(userId, walletId) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: { userId, walletId, isActive: true }
      });

      if (!wallet) {
        throw new Error('Wallet not found or already disconnected');
      }

      await prisma.connectedWallets.update({
        where: { id: wallet.id },
        data: { isActive: false }
      });

      console.log('Wallet disconnected', { userId, walletId });
      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  async getWalletBalance(userId, walletId) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: { userId, walletId, isActive: true }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Implementation would vary by provider
      switch (wallet.provider) {
        case 'PAYPAL':
          return await this.getPayPalBalance(wallet);
        case 'WISE':
          return await this.getWiseBalance(wallet);
        case 'SQUARE':
          return await this.getSquareBalance(wallet);
        default:
          return { amount: wallet.balance, currency: wallet.currency, lastUpdated: wallet.lastSync };
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  async getPayPalBalance(wallet) {
    try {
      const response = await axios.get(`${this.providers.PAYPAL.baseUrl}/v1/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${wallet.accessToken}` }
      });

      const balance = response.data.balances[0];
      return {
        amount: parseFloat(balance.available_balance.value),
        currency: balance.available_balance.currency_code,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('PayPal balance fetch failed:', error);
      return { amount: 0, currency: 'USD', lastUpdated: new Date().toISOString() };
    }
  }

  async getWiseBalance(wallet) {
    try {
      const response = await axios.get(`${this.providers.WISE.baseUrl}/v1/profiles/${wallet.walletId}/balances`, {
        headers: { 'Authorization': `Bearer ${wallet.accessToken}` }
      });

      const balance = response.data[0];
      return {
        amount: parseFloat(balance.amount.value),
        currency: balance.amount.currency,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Wise balance fetch failed:', error);
      return { amount: 0, currency: 'USD', lastUpdated: new Date().toISOString() };
    }
  }

  async getSquareBalance(wallet) {
    try {
      const response = await axios.get(`${this.providers.SQUARE.baseUrl}/v2/locations/${wallet.walletId}/transactions`, {
        headers: { 'Authorization': `Bearer ${wallet.accessToken}` }
      });

      // Square doesn't have a direct balance API, so we calculate from transactions
      return {
        amount: 0, // Would need to calculate from transaction history
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Square balance fetch failed:', error);
      return { amount: 0, currency: 'USD', lastUpdated: new Date().toISOString() };
    }
  }

  async refreshWalletConnection(userId, walletId) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: { userId, walletId, isActive: true }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Refresh tokens and update connection status
      const updatedWallet = await prisma.connectedWallets.update({
        where: { id: wallet.id },
        data: { 
          lastSync: new Date(),
          // Add token refresh logic here if needed
        }
      });

      return {
        id: updatedWallet.id,
        status: 'connected',
        lastSync: updatedWallet.lastSync
      };
    } catch (error) {
      console.error('Error refreshing wallet connection:', error);
      throw error;
    }
  }

  async getOAuthUrl(provider, redirectUri, userId) {
    const state = crypto.randomBytes(16).toString('hex');
    
    switch (provider) {
      case 'PAYPAL':
        return `${this.providers.PAYPAL.baseUrl}/connect/?flowEntry=static&client_id=${this.providers.PAYPAL.clientId}&response_type=code&scope=openid profile email&redirect_uri=${redirectUri}&state=${state}`;
      case 'WISE':
        return `${this.providers.WISE.baseUrl}/oauth/authorize?response_type=code&client_id=${this.providers.WISE.clientId}&redirect_uri=${redirectUri}&state=${state}`;
      case 'SQUARE':
        return `${this.providers.SQUARE.baseUrl}/oauth2/authorize?client_id=${this.providers.SQUARE.applicationId}&response_type=code&scope=MERCHANT_PROFILE_READ PAYMENTS_WRITE&redirect_uri=${redirectUri}&state=${state}`;
      default:
        throw new Error(`OAuth not supported for ${provider}`);
    }
  }

  async handleOAuthCallback(provider, code, state, userId) {
    try {
      return await this.connectWallet(userId, { provider, authCode: code });
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();
