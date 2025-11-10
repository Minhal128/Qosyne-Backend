const { PrismaClient } = require('@prisma/client');
const RapydTransactionService = require('../services/RapydTransactionService');
const { paymentFactory } = require('../paymentGateways/paymentFactory');
const prisma = new PrismaClient();

class RapydPaymentController {
  constructor() {
    try {
      this.rapydService = new RapydTransactionService();
      console.log('✅ RapydTransactionService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RapydTransactionService:', error);
      this.rapydService = null;
    }
  }

  /**
   * 💸 SEND MONEY VIA RAPYD (Main Transfer Method)
   * Sends money from any connected wallet to any destination via Rapyd
   */
  async sendMoneyViaRapyd(req, res) {
    try {
      const userId = req.user.userId;
      const {
        toWalletId,           // e.g., "wise_receiver_60_1758620967206"
        amount,
        currency = 'USD',
        description,
        sourceWalletId,       // User's connected wallet ID
        targetWalletType = 'wise'  // wise, venmo, paypal, square
      } = req.body;

      // Validate required fields
      if (!toWalletId || !amount || !sourceWalletId) {
        return res.status(400).json({
          error: 'Missing required fields: toWalletId, amount, sourceWalletId',
          status_code: 400
        });
      }

      console.log(`💸 Transfer Request: $${amount} from wallet ${sourceWalletId} to ${toWalletId}`);

      // Get source wallet details
      const sourceWallet = await prisma.connectedWallets.findFirst({
        where: {
          id: parseInt(sourceWalletId),
          userId: userId,
          isActive: true
        }
      });

      if (!sourceWallet) {
        return res.status(404).json({
          error: 'Source wallet not found or not active',
          status_code: 404
        });
      }

      // ✅ NEW: Validate destination wallet exists (and is active) before calling Rapyd
      // The toWalletId can be a DB id, an external walletId string, customerId, accessToken, accountEmail or username.
      let destinationWallet = null;
      try {
        // Try DB id
        if (!isNaN(parseInt(toWalletId))) {
          destinationWallet = await prisma.connectedWallets.findFirst({
            where: { id: parseInt(toWalletId), isActive: true }
          });
        }

        // Try walletId string
        if (!destinationWallet) {
          destinationWallet = await prisma.connectedWallets.findFirst({
            where: { walletId: toWalletId, isActive: true }
          });
        }

        // Fallback: match on other identifying fields (customerId, accessToken, email, username)
        if (!destinationWallet) {
          const lookupVal = (typeof toWalletId === 'string') ? toWalletId.trim() : toWalletId;
          destinationWallet = await prisma.connectedWallets.findFirst({
            where: {
              isActive: true,
              OR: [
                { customerId: lookupVal },
                { accessToken: lookupVal },
                { accountEmail: { equals: lookupVal, mode: 'insensitive' } },
                { username: { equals: lookupVal, mode: 'insensitive' } }
              ]
            }
          });
        }
      } catch (err) {
        console.warn('Destination wallet validation DB error:', err && err.message);
      }

      if (!destinationWallet) {
        console.warn('Destination wallet not found for toWalletId:', toWalletId);
        return res.status(404).json({
          error: 'Destination wallet not found or not active',
          status_code: 404
        });
      }

      // Check if rapydService is available
      if (!this.rapydService) {
        throw new Error('Rapyd service not available');
      }

      // Validate transfer request
      this.rapydService.validateTransferRequest({
        amount,
        toWalletId,
        fromUserId: userId
      });

      // Prepare connected client token (if present) so Rapyd or sandbox flows
      // can use the connected wallet's client/payment token. Prefer fields
      // in this order: clientToken, paymentMethodToken, accessToken.
      const clientToken = sourceWallet.clientToken || sourceWallet.paymentMethodToken || sourceWallet.accessToken || null;

      // Execute transfer via Rapyd, include connected wallet token and metadata
      const transferResult = await this.rapydService.sendMoneyViaRapyd({
        fromUserId: userId,
        toWalletId: toWalletId,
        amount: amount,
        currency: currency,
        description: description || `Transfer to ${toWalletId}`,
        sourceWalletType: sourceWallet.provider.toLowerCase(),
        targetWalletType: targetWalletType,
        sourceWalletToken: clientToken,
        sourceWalletId: sourceWallet.id,
        sourceWalletProvider: sourceWallet.provider
      });

      // Return transfer result and surface the connected client token so frontend
      // can show the wallet as connected (useful for sandbox/testing flows).
      return res.status(201).json({
        message: 'Money transfer successful via Rapyd',
        data: Object.assign({}, transferResult, {
          connectedClientToken: clientToken || null,
          sourceWallet: {
            id: sourceWallet.id,
            provider: sourceWallet.provider,
            walletId: sourceWallet.walletId
          }
        }),
        status_code: 201
      });

    } catch (error) {
      console.error('❌ Rapyd transfer error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 🔗 CONNECT WALLET VIA OAUTH (Venmo, PayPal, Square)
   * Initiates OAuth connection for supported wallets
   */
  async connectWalletOAuth(req, res) {
    try {
      const userId = req.user.userId;
      const { provider } = req.params; // venmo, paypal, square

      const supportedProviders = ['venmo', 'paypal', 'square'];
      if (!supportedProviders.includes(provider.toLowerCase())) {
        return res.status(400).json({
          error: `Provider '${provider}' not supported. Use: ${supportedProviders.join(', ')}`,
          status_code: 400
        });
      }

      // Check if wallet already connected
      const existingWallet = await prisma.connectedWallets.findFirst({
        where: {
          userId: userId,
          provider: provider.toUpperCase(),
          isActive: true
        }
      });

      if (existingWallet) {
        return res.status(400).json({
          error: `${provider} wallet is already connected`,
          status_code: 400
        });
      }

      // Generate OAuth URL based on provider
      let authUrl;
      switch (provider.toLowerCase()) {
        case 'paypal':
          authUrl = await this.generatePayPalOAuthUrl(userId);
          break;
        case 'venmo':
          authUrl = await this.generateVenmoOAuthUrl(userId);
          break;
        case 'square':
          authUrl = await this.generateSquareOAuthUrl(userId);
          break;
        default:
          throw new Error(`OAuth not implemented for ${provider}`);
      }

      return res.status(200).json({
        message: `${provider} OAuth URL generated`,
        data: {
          authUrl: authUrl,
          provider: provider,
          instructions: `Complete OAuth flow to connect your ${provider} wallet`
        },
        status_code: 200
      });

    } catch (error) {
      console.error(`❌ OAuth connection error for ${req.params.provider}:`, error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 💳 CONNECT WISE WITH BANK DETAILS
   * Manual connection for Wise using bank account details
   */
  async connectWiseWallet(req, res) {
    try {
      const userId = req.user.userId;
      const {
        accountHolderName,
        iban,
        currency = 'EUR',
        country = 'DE',
        address
      } = req.body;

      // Validate required Wise details
      if (!accountHolderName || !iban) {
        return res.status(400).json({
          error: 'Account holder name and IBAN are required for Wise',
          status_code: 400
        });
      }

      // Check if Wise already connected
      const existingWise = await prisma.connectedWallets.findFirst({
        where: {
          userId: userId,
          provider: 'WISE',
          isActive: true
        }
      });

      if (existingWise) {
        return res.status(400).json({
          error: 'Wise wallet is already connected',
          status_code: 400
        });
      }

      // Create Wise wallet connection
      const wiseGateway = paymentFactory('wise');
      const attachResult = await wiseGateway.attachBankAccount({
        userId: userId,
        bankAccount: {
          account_holder_name: accountHolderName,
          iban: iban,
          currency: currency,
          country: country,
          address: address
        }
      });

      // Save to database
      const connectedWallet = await prisma.connectedWallets.create({
        data: {
          userId: userId,
          provider: 'WISE',
          walletId: attachResult.attachedPaymentMethodId,
          accountEmail: attachResult.customerDetails?.email || 'wise@user.com',
          fullName: attachResult.customerDetails?.name || accountHolderName,
          currency: currency,
          isActive: true,
          updatedAt: new Date()
        }
      });

      return res.status(201).json({
        message: 'Wise wallet connected successfully',
        data: {
          walletId: connectedWallet.id,
          provider: 'Wise',
          accountDetails: {
            name: accountHolderName,
            iban_last4: iban.slice(-4),
            currency: currency
          }
        },
        status_code: 201
      });

    } catch (error) {
      console.error('❌ Wise connection error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 📱 GET USER'S CONNECTED WALLETS
   * Returns all connected wallets for the user
   */
  async getConnectedWallets(req, res) {
    try {
      const userId = req.user.userId;

      // Use walletService to fetch deduped connected wallets
      const walletService = require('../services/walletService');
      const connectedWallets = await walletService.getUserWallets(userId);

      // Format wallet data
      const formatProviderName = (provider) => {
        const providerMap = {
          'VENMO': 'Venmo',
          'PAYPAL': 'PayPal',
          'SQUARE': 'Square',
          'WISE': 'Wise',
          'RAPYD': 'Rapyd'
        };
        return providerMap[provider.toUpperCase()] || provider;
      };
      
      const getConnectionMethod = (provider) => {
        const oauthProviders = ['VENMO', 'PAYPAL', 'SQUARE'];
        return oauthProviders.includes(provider.toUpperCase()) ? 'OAuth' : 'Manual';
      };
      
      const formattedWallets = connectedWallets.map(wallet => ({
        id: wallet.id,
        provider: formatProviderName(wallet.provider),
        walletId: wallet.walletId,
        accountEmail: wallet.accountEmail,
        fullName: wallet.fullName,
        currency: wallet.currency,
        connectedAt: wallet.createdAt,
        connectionMethod: getConnectionMethod(wallet.provider),
        lastFour: wallet.walletId?.slice(-4) || '****',
        duplicateCount: wallet.duplicateCount || 0,
        clientToken: wallet.clientToken || null
      }));

      return res.status(200).json({
        message: 'Connected wallets retrieved successfully',
        data: {
          wallets: formattedWallets,
          count: formattedWallets.length
        },
        status_code: 200
      });

    } catch (error) {
      console.error('❌ Get connected wallets error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 📊 GET RAPYD TRANSACTION HISTORY
   * Get transaction history through Rapyd
   */
  async getRapydTransactionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 25 } = req.query;

      // Check if rapydService is available
      if (!this.rapydService) {
        throw new Error('Rapyd service not available');
      }

      const transactionHistory = await this.rapydService.getTransactionHistory(
        userId, 
        parseInt(limit)
      );

      return res.status(200).json({
        message: 'Rapyd transaction history retrieved successfully',
        data: transactionHistory,
        status_code: 200
      });

    } catch (error) {
      console.error('❌ Get Rapyd transaction history error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 💰 GET RAPYD WALLET BALANCE
   * Get current Rapyd wallet balance
   */
  async getRapydWalletBalance(req, res) {
    try {
      // Check if rapydService is available
      if (!this.rapydService) {
        throw new Error('Rapyd service not available');
      }

      const balance = await this.rapydService.getRapydWalletBalance();

      return res.status(200).json({
        message: 'Rapyd wallet balance retrieved successfully',
        data: balance,
        status_code: 200
      });

    } catch (error) {
      console.error('❌ Get Rapyd wallet balance error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 🚫 DISCONNECT WALLET
   * Disconnect a connected wallet
   */
  async disconnectWallet(req, res) {
    try {
      const userId = req.user.userId;
      const { walletId } = req.params;

      const wallet = await prisma.connectedWallets.findFirst({
        where: {
          id: parseInt(walletId),
          userId: userId
        }
      });

      if (!wallet) {
        return res.status(404).json({
          error: 'Wallet not found',
          status_code: 404
        });
      }

      // Deactivate wallet
      await prisma.connectedWallets.update({
        where: { id: parseInt(walletId) },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });

      return res.status(200).json({
        message: `${wallet.provider} wallet disconnected successfully`,
        status_code: 200
      });

    } catch (error) {
      console.error('❌ Disconnect wallet error:', error);
      return res.status(500).json({
        error: error.message,
        status_code: 500
      });
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  // Generate PayPal OAuth URL (existing implementation)
  async generatePayPalOAuthUrl(userId) {
    const scope = encodeURIComponent(
      'openid profile email https://uri.paypal.com/services/paypalattributes'
    );
    
    return `${process.env.PAYPAL_AUTH_URL}?client_id=${process.env.PAYPAL_CLIENT_ID}&response_type=code&scope=${scope}&redirect_uri=${process.env.PAYPAL_REDIRECT_URI}&state=${userId}`;
  }

  // Generate Venmo OAuth URL (via Braintree)
  async generateVenmoOAuthUrl(userId) {
    // In production, you'd generate a proper Braintree/Venmo OAuth URL
    // For now, return a placeholder that would integrate with Braintree SDK
    return `https://braintree-api.example.com/oauth/authorize?client_id=${process.env.BT_PUBLIC_KEY}&response_type=code&scope=venmo&redirect_uri=${encodeURIComponent(`${process.env.BACKEND_URL}/api/payment/venmo/callback`)}&state=${userId}`;
  }

  // Generate Square OAuth URL
  async generateSquareOAuthUrl(userId) {
    const scope = 'PAYMENTS_READ PAYMENTS_WRITE';
    return `https://connect.squareupsandbox.com/oauth2/authorize?client_id=${process.env.SQUARE_APPLICATION_ID}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(`${process.env.BACKEND_URL}/api/payment/square/callback`)}&state=${userId}`;
  }

  formatProviderName(provider) {
    const providerMap = {
      'VENMO': 'Venmo',
      'PAYPAL': 'PayPal',
      'SQUARE': 'Square',
      'WISE': 'Wise',
      'RAPYD': 'Rapyd'
    };
    return providerMap[provider.toUpperCase()] || provider;
  }

  getConnectionMethod(provider) {
    const oauthProviders = ['VENMO', 'PAYPAL', 'SQUARE'];
    return oauthProviders.includes(provider.toUpperCase()) ? 'OAuth' : 'Manual';
  }
}

const rapydController = new RapydPaymentController();

// Export methods with proper binding
module.exports = {
  sendMoneyViaRapyd: rapydController.sendMoneyViaRapyd.bind(rapydController),
  connectWalletOAuth: rapydController.connectWalletOAuth.bind(rapydController),
  connectWiseWallet: rapydController.connectWiseWallet.bind(rapydController),
  getConnectedWallets: rapydController.getConnectedWallets.bind(rapydController),
  getRapydTransactionHistory: rapydController.getRapydTransactionHistory.bind(rapydController),
  getRapydWalletBalance: rapydController.getRapydWalletBalance.bind(rapydController),
  disconnectWallet: rapydController.disconnectWallet.bind(rapydController)
};
