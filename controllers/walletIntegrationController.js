const walletService = require('../services/walletService');
const transactionService = require('../services/transactionService');
const qrService = require('../services/qrService');
const rapydService = require('../services/rapydService');

// Wallet Management
exports.getUserWallets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallets = await walletService.getUserWallets(userId);
    
    res.status(200).json({
      success: true,
      data: { wallets },
      message: 'User wallets fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user wallets'
    });
  }
};

exports.connectWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { provider, authCode, accessToken } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider is required'
      });
    }

    const wallet = await walletService.connectWallet(userId, {
      provider,
      authCode,
      accessToken
    });

    res.status(201).json({
      success: true,
      data: { wallet },
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect wallet'
    });
  }
};

exports.disconnectWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { walletId } = req.params;

    await walletService.disconnectWallet(userId, walletId);

    res.status(200).json({
      success: true,
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect wallet'
    });
  }
};

exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { walletId } = req.params;

    const balance = await walletService.getWalletBalance(userId, walletId);

    res.status(200).json({
      success: true,
      data: { balance },
      message: 'Wallet balance fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch wallet balance'
    });
  }
};

exports.refreshWalletConnection = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { walletId } = req.params;

    const result = await walletService.refreshWalletConnection(userId, walletId);

    res.status(200).json({
      success: true,
      data: { result },
      message: 'Wallet connection refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing wallet connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh wallet connection'
    });
  }
};

exports.getOAuthUrl = async (req, res) => {
  try {
    const { provider } = req.params;
    const { redirectUri } = req.query;
    const userId = req.user.userId;

    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'Redirect URI is required'
      });
    }

    const oauthUrl = await walletService.getOAuthUrl(provider, redirectUri, userId);

    res.status(200).json({
      success: true,
      data: { oauthUrl },
      message: 'OAuth URL generated successfully'
    });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate OAuth URL'
    });
  }
};

exports.handleOAuthCallback = async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const wallet = await walletService.handleOAuthCallback(provider, code, state, userId);

    res.status(200).json({
      success: true,
      data: { wallet },
      message: 'OAuth callback handled successfully'
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to handle OAuth callback'
    });
  }
};

// Transaction Management
exports.initiateTransfer = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fromWalletId, toWalletId, amount, currency, description, metadata } = req.body;

    if (!fromWalletId || !toWalletId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'From wallet ID, to wallet ID, amount, and currency are required'
      });
    }

    const transaction = await transactionService.initiateTransfer({
      userId,
      fromWalletId,
      toWalletId,
      amount,
      currency,
      description,
      metadata
    });

    res.status(201).json({
      success: true,
      data: { transaction },
      message: 'Transfer initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate transfer'
    });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.params;

    const transaction = await transactionService.getTransaction(userId, transactionId);

    res.status(200).json({
      success: true,
      data: { transaction },
      message: 'Transaction fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction'
    });
  }
};

exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, limit, status, provider } = req.query;

    const transactions = await transactionService.getUserTransactions(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      provider
    });

    res.status(200).json({
      success: true,
      data: transactions,
      message: 'User transactions fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user transactions'
    });
  }
};

exports.cancelTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.params;

    const result = await transactionService.cancelTransaction(userId, transactionId);

    res.status(200).json({
      success: true,
      data: { result },
      message: 'Transaction cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel transaction'
    });
  }
};

exports.retryTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.params;

    const transaction = await transactionService.retryTransaction(userId, transactionId);

    res.status(201).json({
      success: true,
      data: { transaction },
      message: 'Transaction retry initiated successfully'
    });
  } catch (error) {
    console.error('Error retrying transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry transaction'
    });
  }
};

exports.estimateTransferFees = async (req, res) => {
  try {
    const { fromProvider, toProvider, amount, currency } = req.body;

    if (!fromProvider || !toProvider || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'From provider, to provider, amount, and currency are required'
      });
    }

    const feeEstimate = await transactionService.estimateTransferFees({
      fromProvider,
      toProvider,
      amount,
      currency
    });

    res.status(200).json({
      success: true,
      data: { feeEstimate },
      message: 'Transfer fees estimated successfully'
    });
  } catch (error) {
    console.error('Error estimating transfer fees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to estimate transfer fees'
    });
  }
};

exports.getSupportedCurrencies = async (req, res) => {
  try {
    const { fromProvider, toProvider } = req.query;

    if (!fromProvider || !toProvider) {
      return res.status(400).json({
        success: false,
        error: 'From provider and to provider are required'
      });
    }

    const currencies = await transactionService.getSupportedCurrencies(fromProvider, toProvider);

    res.status(200).json({
      success: true,
      data: { currencies },
      message: 'Supported currencies fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch supported currencies'
    });
  }
};

// QR Code Management
exports.generateQRCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, amount, currency, description, expiresIn, ...qrData } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'QR code type is required'
      });
    }

    const qrCode = await qrService.generateQRData({
      type,
      userId,
      amount,
      currency,
      description,
      expiresIn,
      ...qrData
    });

    res.status(201).json({
      success: true,
      data: { qrCode },
      message: 'QR code generated successfully'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
};

exports.generateBankDepositQR = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bankProvider, amount, currency, accountDetails, description } = req.body;

    if (!bankProvider || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Bank provider, amount, and currency are required'
      });
    }

    const qrCode = await qrService.generateBankDepositQR({
      bankProvider,
      userId,
      amount,
      currency,
      accountDetails,
      description
    });

    res.status(201).json({
      success: true,
      data: { qrCode },
      message: 'Bank deposit QR code generated successfully'
    });
  } catch (error) {
    console.error('Error generating bank deposit QR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate bank deposit QR'
    });
  }
};

exports.generateWalletConnectQR = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { walletProvider, connectionType, amount, currency, callbackUrl } = req.body;

    if (!walletProvider) {
      return res.status(400).json({
        success: false,
        error: 'Wallet provider is required'
      });
    }

    const qrCode = await qrService.generateWalletConnectQR({
      walletProvider,
      userId,
      connectionType,
      amount,
      currency,
      callbackUrl
    });

    res.status(201).json({
      success: true,
      data: { qrCode },
      message: 'Wallet connect QR code generated successfully'
    });
  } catch (error) {
    console.error('Error generating wallet connect QR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate wallet connect QR'
    });
  }
};

exports.getQRStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { qrId } = req.params;

    const status = await qrService.getQRStatus(userId, qrId);

    res.status(200).json({
      success: true,
      data: { status },
      message: 'QR code status fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching QR status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch QR status'
    });
  }
};

exports.processQRScan = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { scannerInfo, ip, userAgent } = req.body;

    const scanResult = await qrService.processQRScan(qrId, {
      scannerInfo,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: { scanResult },
      message: 'QR code scan processed successfully'
    });
  } catch (error) {
    console.error('Error processing QR scan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process QR scan'
    });
  }
};

exports.deactivateQR = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { qrId } = req.params;

    await qrService.deactivateQR(userId, qrId);

    res.status(200).json({
      success: true,
      message: 'QR code deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating QR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deactivate QR code'
    });
  }
};

exports.getUserQRCodes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, limit, type, status } = req.query;

    const qrCodes = await qrService.getUserQRCodes(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      status
    });

    res.status(200).json({
      success: true,
      data: qrCodes,
      message: 'User QR codes fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching user QR codes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user QR codes'
    });
  }
};

// Rapyd Integration
exports.getRapydPaymentMethods = async (req, res) => {
  try {
    const { country, currency } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        error: 'Country is required'
      });
    }

    const paymentMethods = await rapydService.getPaymentMethods(country, currency);

    res.status(200).json({
      success: true,
      data: { paymentMethods },
      message: 'Payment methods fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment methods'
    });
  }
};

exports.getRapydExchangeRate = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.query;

    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'From currency and to currency are required'
      });
    }

    const exchangeRate = await rapydService.getExchangeRate(fromCurrency, toCurrency, amount);

    res.status(200).json({
      success: true,
      data: { exchangeRate },
      message: 'Exchange rate fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exchange rate'
    });
  }
};

exports.getRapydCountries = async (req, res) => {
  try {
    const countries = await rapydService.getSupportedCountries();

    res.status(200).json({
      success: true,
      data: { countries },
      message: 'Supported countries fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch countries'
    });
  }
};

exports.getRapydCurrencies = async (req, res) => {
  try {
    const currencies = await rapydService.getSupportedCurrencies();

    res.status(200).json({
      success: true,
      data: { currencies },
      message: 'Supported currencies fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch currencies'
    });
  }
};
