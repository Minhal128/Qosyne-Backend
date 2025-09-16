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
        baseUrl: process.env.WISE_BASE_URL || 'https://api.wise.com',
        apiKey: process.env.WISE_API_KEY,
        clientId: process.env.WISE_CLIENT_ID,
        clientSecret: process.env.WISE_CLIENT_SECRET,
        capabilities: ['send', 'receive', 'balance_check', 'multi_currency']
      },
      SQUARE: {
        baseUrl: process.env.SQUARE_BASE_URL || 'https://connect.squareup.com',
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        applicationId: process.env.SQUARE_APPLICATION_ID,
        clientSecret: process.env.SQUARE_CLIENT_SECRET,
        capabilities: ['send', 'receive', 'balance_check']
      },
      VENMO: {
        baseUrl: 'https://api.venmo.com/v1',
        clientId: process.env.VENMO_CLIENT_ID,
        clientSecret: process.env.VENMO_CLIENT_SECRET,
        capabilities: ['send', 'receive']
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
        default:
          throw new Error(`Connection method not implemented for ${provider}`);
      }

      // Store wallet connection in database
      const wallet = await prisma.connectedWallets.create({
        data: {
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
      return wallet;
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

  async connectWise(userId, authCode) {
    try {
      const tokenResponse = await axios.post(`${this.providers.WISE.baseUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: this.providers.WISE.clientId,
        client_secret: this.providers.WISE.clientSecret
      });

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user profile
      const profileResponse = await axios.get(`${this.providers.WISE.baseUrl}/v1/profiles`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });

      return {
        walletId: `wise_${profileResponse.data[0].id}`,
        accountEmail: profileResponse.data[0].email,
        fullName: profileResponse.data[0].firstName + ' ' + profileResponse.data[0].lastName,
        accessToken: access_token,
        refreshToken: refresh_token,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Wise connection failed: ${error.message}`);
    }
  }

  async connectSquare(userId, authCode) {
    try {
      const tokenResponse = await axios.post(`${this.providers.SQUARE.baseUrl}/oauth2/token`, {
        client_id: this.providers.SQUARE.applicationId,
        client_secret: this.providers.SQUARE.clientSecret,
        code: authCode,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, merchant_id } = tokenResponse.data;

      return {
        walletId: `square_${merchant_id}`,
        accountEmail: `merchant_${merchant_id}@square.com`,
        fullName: `Square Merchant ${merchant_id}`,
        accessToken: access_token,
        refreshToken: refresh_token,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Square connection failed: ${error.message}`);
    }
  }

  async connectVenmo(userId, authCode) {
    try {
      const tokenResponse = await axios.post(`${this.providers.VENMO.baseUrl}/oauth/access_token`, {
        client_id: this.providers.VENMO.clientId,
        client_secret: this.providers.VENMO.clientSecret,
        code: authCode
      });

      const { access_token, user } = tokenResponse.data;

      return {
        walletId: `venmo_${user.id}`,
        accountEmail: user.email,
        fullName: user.display_name,
        accessToken: access_token,
        refreshToken: null,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Venmo connection failed: ${error.message}`);
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
