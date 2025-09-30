const express = require('express');
const router = express.Router();
const walletIntegrationController = require('../controllers/walletIntegrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

// Wallet Management Routes
router.get('/wallets', authMiddleware, tryCatch(walletIntegrationController.getUserWallets));
router.get('/wallets/available-for-transfer', authMiddleware, tryCatch(walletIntegrationController.getAvailableWalletsForTransfer));
router.post('/wallets/connect', authMiddleware, tryCatch(walletIntegrationController.connectWallet));
router.delete('/wallets/:walletId/disconnect', authMiddleware, tryCatch(walletIntegrationController.disconnectWallet));
router.get('/wallets/:walletId/balance', authMiddleware, tryCatch(walletIntegrationController.getWalletBalance));
router.post('/wallets/:walletId/refresh', authMiddleware, tryCatch(walletIntegrationController.refreshWalletConnection));

// OAuth Routes
router.get('/wallets/auth/:provider/url', authMiddleware, tryCatch(walletIntegrationController.getOAuthUrl));
router.post('/wallets/auth/:provider/callback', authMiddleware, tryCatch(walletIntegrationController.handleOAuthCallback));

// Specific OAuth Routes for each provider
router.post('/wise/oauth/init', authMiddleware, tryCatch(walletIntegrationController.initWiseOAuth));
router.get('/wise/oauth/callback', tryCatch(walletIntegrationController.handleWiseOAuthCallback));

router.post('/venmo/oauth/init', authMiddleware, tryCatch(walletIntegrationController.initVenmoOAuth));
router.get('/venmo/oauth/callback', tryCatch(walletIntegrationController.handleVenmoOAuthCallback));

// Real Venmo Connection with User Credentials
router.post('/venmo/connect-real', authMiddleware, tryCatch(async (req, res) => {
  const { merchantId, publicKey, privateKey } = req.body;
  const userId = req.user.userId;
  
  if (!merchantId || !publicKey || !privateKey) {
    return res.status(400).json({
      success: false,
      error: 'Merchant ID, Public Key, and Private Key are required'
    });
  }
  
  console.log('=== Real Venmo/Braintree Connection ===');
  console.log('User ID:', userId);
  console.log('Merchant ID:', merchantId);
  console.log('Public Key:', publicKey ? 'Present' : 'Missing');
  console.log('Private Key:', privateKey ? 'Present' : 'Missing');
  
  try {
    // Test connection with user's Braintree credentials
    const braintree = require('braintree');
    
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: merchantId,
      publicKey: publicKey,
      privateKey: privateKey
    });
    
    // Test the connection by creating a test client token
    const clientTokenResponse = await gateway.clientToken.generate({});
    
    console.log('Braintree connection successful');
    
    // Create wallet connection using walletService
    const walletService = require('../services/walletService');
    const walletConnection = await walletService.connectWallet({
      userId: userId,
      provider: 'VENMO',
      authCode: JSON.stringify({ 
        merchantId: merchantId,
        publicKey: publicKey,
        privateKey: privateKey,
        connectionType: 'user_credentials',
        identifier: 'venmo_user_connected',
        clientToken: clientTokenResponse.clientToken
      })
    });
    
    res.json({
      success: true,
      data: {
        connected: true,
        walletId: walletConnection.id,
        clientToken: clientTokenResponse.clientToken
      },
      message: 'Venmo wallet connected successfully with your Braintree credentials!'
    });
  } catch (error) {
    console.error('Braintree API Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Braintree: ' + error.message
    });
  }
}));

router.post('/square/oauth/init', authMiddleware, tryCatch(walletIntegrationController.initSquareOAuth));
router.get('/square/oauth/callback', tryCatch(walletIntegrationController.handleSquareOAuthCallback));

// Real Square Connection with User Credentials
router.post('/square/connect-real', authMiddleware, tryCatch(async (req, res) => {
  const { accessToken, applicationId, locationId } = req.body;
  const userId = req.user.userId;
  
  if (!accessToken || !applicationId || !locationId) {
    return res.status(400).json({
      success: false,
      error: 'Access Token, Application ID, and Location ID are required'
    });
  }
  
  const axios = require('axios');
  
  console.log('=== Real Square Connection ===');
  console.log('User ID:', userId);
  console.log('Application ID:', applicationId);
  console.log('Location ID:', locationId);
  console.log('Access Token:', accessToken ? 'Present' : 'Missing');
  
  try {
    // Test connection with user's credentials
    const response = await axios.get(
      `https://connect.squareupsandbox.com/v2/locations/${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Square-Version': '2023-10-18'
        },
      }
    );
    
    console.log('Square API Success:', response.data);
    
    // Create wallet connection using walletService
    const walletService = require('../services/walletService');
    const walletConnection = await walletService.connectWallet({
      userId: userId,
      provider: 'SQUARE',
      authCode: JSON.stringify({ 
        accessToken: accessToken,
        applicationId: applicationId,
        locationId: locationId,
        connectionType: 'user_credentials',
        identifier: 'square_user_connected',
        locationData: response.data
      })
    });
    
    res.json({
      success: true,
      data: {
        connected: true,
        walletId: walletConnection.id,
        locationData: response.data
      },
      message: 'Square wallet connected successfully with your credentials!'
    });
  } catch (error) {
    console.error('Square API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Square: ' + (error.response?.data?.message || error.message)
    });
  }
}));

// Real Wise Connection with User Credentials
router.post('/wise/connect-real', authMiddleware, tryCatch(async (req, res) => {
  const { apiToken, profileId } = req.body;
  const userId = req.user.userId;
  
  if (!apiToken || !profileId) {
    return res.status(400).json({
      success: false,
      error: 'API Token and Profile ID are required'
    });
  }
  
  const axios = require('axios');
  
  console.log('=== Real Wise Connection ===');
  console.log('User ID:', userId);
  console.log('Profile ID:', profileId);
  console.log('API Token:', apiToken ? 'Present' : 'Missing');
  
  try {
    // Test connection with user's credentials
    const response = await axios.get(
      `https://api.sandbox.transferwise.tech/v1/profiles/${profileId}/balances`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );
    
    console.log('Wise API Success:', response.data);
    
    // Create wallet connection using walletService
    const walletService = require('../services/walletService');
    const walletConnection = await walletService.connectWallet({
      userId: userId,
      provider: 'WISE',
      authCode: JSON.stringify({ 
        accessToken: apiToken,
        profileId: profileId,
        connectionType: 'user_credentials',
        identifier: 'wise_user_connected',
        balanceData: response.data
      })
    });
    
    res.json({
      success: true,
      data: {
        connected: true,
        walletId: walletConnection.id,
        balanceData: response.data
      },
      message: 'Wise wallet connected successfully with your credentials!'
    });
  } catch (error) {
    console.error('Wise API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Wise: ' + (error.response?.data?.message || error.message)
    });
  }
}));

// Direct Wise API Test Route (temporary)
router.post('/wise/direct-test', authMiddleware, tryCatch(async (req, res) => {
  const axios = require('axios');
  
  console.log('=== Direct Wise API Test ===');
  console.log('API Token:', process.env.WISE_API_TOKEN ? 'Present' : 'Missing');
  console.log('Profile ID:', process.env.WISE_PROFILE_ID);
  
  try {
    // First, let's get all profiles to see what's available
    console.log('Step 1: Getting all profiles...');
    const profilesResponse = await axios.get(
      `https://api.sandbox.transferwise.tech/v1/profiles`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );
    
    console.log('Available profiles:', profilesResponse.data);
    
    // Find the first personal profile
    const personalProfile = profilesResponse.data.find(p => p.type === 'personal');
    const profileId = personalProfile ? personalProfile.id : process.env.WISE_PROFILE_ID;
    
    console.log('Using Profile ID:', profileId);
    
    // Try multiple endpoints to see what works
    let balanceData = null;
    let accountData = null;
    
    // Try 1: Get borderless accounts (multi-currency account)
    try {
      console.log('Step 2a: Trying borderless accounts...');
      const borderlessResponse = await axios.get(
        `https://api.sandbox.transferwise.tech/v1/borderless-accounts?profileId=${profileId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          },
        }
      );
      accountData = borderlessResponse.data;
      console.log('Borderless accounts:', accountData);
    } catch (borderlessError) {
      console.log('Borderless accounts failed:', borderlessError.response?.data || borderlessError.message);
    }
    
    // Try 2: Get balances (v4 endpoint first, then v1)
    try {
      console.log('Step 2b: Trying v4 balances endpoint...');
      const balanceResponse = await axios.get(
        `https://api.sandbox.transferwise.tech/v4/profiles/${profileId}/balances`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          },
        }
      );
      balanceData = balanceResponse.data;
      console.log('v4 Balances success:', balanceData);
    } catch (v4Error) {
      console.log('v4 balances failed:', v4Error.response?.data || v4Error.message);
      
      // Try v1 endpoint
      try {
        console.log('Step 2b-fallback: Trying v1 balances endpoint...');
        const balanceResponse = await axios.get(
          `https://api.sandbox.transferwise.tech/v1/profiles/${profileId}/balances`,
          {
            headers: {
              Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
            },
          }
        );
        balanceData = balanceResponse.data;
        console.log('v1 Balances success:', balanceData);
      } catch (v1Error) {
        console.log('v1 balances also failed:', v1Error.response?.data || v1Error.message);
        
        // Create sandbox balance if both failed
        console.log('Step 2b-create: Creating sandbox balance...');
        try {
          // Create USD balance
          const createResponse = await axios.post(
            `https://api.sandbox.transferwise.tech/v1/profiles/${profileId}/balances`,
            {
              currency: 'USD',
              type: 'standard'
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
            }
          );
          console.log('USD Balance created:', createResponse.data);
          
          // Create EUR balance
          const createEurResponse = await axios.post(
            `https://api.sandbox.transferwise.tech/v1/profiles/${profileId}/balances`,
            {
              currency: 'EUR',
              type: 'standard'
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
            }
          );
          console.log('EUR Balance created:', createEurResponse.data);
          
          // Now try to fetch balances again
          const finalBalanceResponse = await axios.get(
            `https://api.sandbox.transferwise.tech/v1/profiles/${profileId}/balances`,
            {
              headers: {
                Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
              },
            }
          );
          balanceData = finalBalanceResponse.data;
          console.log('Final balances after creation:', balanceData);
          
        } catch (createError) {
          console.log('Balance creation failed:', createError.response?.data || createError.message);
        }
      }
    }
    
    // Try 3: Get accounts
    try {
      console.log('Step 2c: Trying accounts...');
      const accountsResponse = await axios.get(
        `https://api.sandbox.transferwise.tech/v1/accounts?profile=${profileId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          },
        }
      );
      if (!accountData) accountData = accountsResponse.data;
      console.log('Accounts:', accountsResponse.data);
    } catch (accountsError) {
      console.log('Accounts failed:', accountsError.response?.data || accountsError.message);
    }
    
    // If we got any data, consider it a success
    const response = { data: balanceData || accountData || [] };
    console.log('Final response data:', response.data);
    
    // Always return success since we found the profile
    res.json({
      success: true,
      data: {
        connected: true,
        balanceData: response.data.length > 0 ? response.data : [
          { amount: { value: 0, currency: 'EUR' }, type: 'AVAILABLE' },
          { amount: { value: 0, currency: 'USD' }, type: 'AVAILABLE' }
        ],
        profileData: personalProfile,
        correctProfileId: profileId,
        apiStatus: {
          profileFound: true,
          balanceEndpoint: balanceData ? 'success' : 'failed',
          accountEndpoint: accountData ? 'success' : 'failed'
        }
      },
      message: `Wise API connected successfully! Profile: ${personalProfile.details.firstName} ${personalProfile.details.lastName}`
    });
  } catch (error) {
    console.error('Wise API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Wise API Error: ' + (error.response?.data?.message || error.message)
    });
  }
}));

// Real Money Transfer Routes
router.post('/wise/send-money', authMiddleware, tryCatch(async (req, res) => {
  const { amount, currency, recipientEmail, recipientName, recipientIban } = req.body;
  const userId = req.user.userId;
  
  console.log('=== Real Wise Money Transfer ===');
  console.log('User ID:', userId);
  console.log('Amount:', amount, currency);
  console.log('Recipient:', recipientName, recipientEmail);
  
  try {
    // Get user's Wise wallet connection
    const walletService = require('../services/walletService');
    const userWallets = await walletService.getUserWallets(userId);
    const wiseWallet = userWallets.find(w => w.provider === 'WISE');
    
    if (!wiseWallet) {
      return res.status(400).json({
        success: false,
        error: 'Wise wallet not connected'
      });
    }
    
    const wiseAuth = JSON.parse(wiseWallet.authCode);
    const axios = require('axios');
    
    // Step 1: Create recipient
    const recipientResponse = await axios.post(
      `https://api.sandbox.transferwise.tech/v1/accounts`,
      {
        currency: currency,
        type: 'iban',
        profile: wiseAuth.profileId,
        accountHolderName: recipientName,
        details: {
          iban: recipientIban
        }
      },
      {
        headers: {
          Authorization: `Bearer ${wiseAuth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Recipient created:', recipientResponse.data);
    
    // Step 2: Create quote
    const quoteResponse = await axios.post(
      `https://api.sandbox.transferwise.tech/v1/quotes`,
      {
        sourceCurrency: currency,
        targetCurrency: currency,
        sourceAmount: amount,
        profile: wiseAuth.profileId
      },
      {
        headers: {
          Authorization: `Bearer ${wiseAuth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Quote created:', quoteResponse.data);
    
    // Step 3: Create transfer
    const transferResponse = await axios.post(
      `https://api.sandbox.transferwise.tech/v1/transfers`,
      {
        targetAccount: recipientResponse.data.id,
        quoteUuid: quoteResponse.data.id,
        customerTransactionId: `txn_${Date.now()}`,
        details: {
          reference: `Payment from ${userId}`,
          transferPurpose: 'verification.transfers.purpose.pay.bills',
          sourceOfFunds: 'verification.source.of.funds.other'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${wiseAuth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Transfer created:', transferResponse.data);
    
    // Step 4: Fund transfer (sandbox simulation)
    const fundResponse = await axios.post(
      `https://api.sandbox.transferwise.tech/v1/transfers/${transferResponse.data.id}/payments`,
      {
        type: 'BALANCE'
      },
      {
        headers: {
          Authorization: `Bearer ${wiseAuth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Transfer funded:', fundResponse.data);
    
    res.json({
      success: true,
      data: {
        transferId: transferResponse.data.id,
        status: transferResponse.data.status,
        amount: amount,
        currency: currency,
        recipient: recipientName,
        reference: transferResponse.data.reference
      },
      message: 'Money sent successfully via Wise!'
    });
    
  } catch (error) {
    console.error('Wise transfer error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send money via Wise: ' + (error.response?.data?.message || error.message)
    });
  }
}));

// Transaction Routes
router.post('/transactions/transfer', authMiddleware, tryCatch(walletIntegrationController.initiateTransfer));
router.get('/transactions/:transactionId', authMiddleware, tryCatch(walletIntegrationController.getTransaction));
router.get('/transactions', authMiddleware, tryCatch(walletIntegrationController.getUserTransactions));
router.post('/transactions/:transactionId/cancel', authMiddleware, tryCatch(walletIntegrationController.cancelTransaction));
router.post('/transactions/:transactionId/retry', authMiddleware, tryCatch(walletIntegrationController.retryTransaction));
router.post('/transactions/estimate-fees', authMiddleware, tryCatch(walletIntegrationController.estimateTransferFees));
router.get('/transactions/currencies/supported', authMiddleware, tryCatch(walletIntegrationController.getSupportedCurrencies));

// QR Code Routes
router.post('/qr/generate', authMiddleware, tryCatch(walletIntegrationController.generateQRCode));
router.post('/qr/universal', authMiddleware, tryCatch(walletIntegrationController.generateUniversalQR));
router.post('/qr/venmo', authMiddleware, tryCatch(walletIntegrationController.generateVenmoQR));
router.post('/qr/connect-and-generate', authMiddleware, tryCatch(walletIntegrationController.connectWalletAndGenerateQR));
router.get('/qr/:qrId/status', authMiddleware, tryCatch(walletIntegrationController.getQRStatus));
router.post('/qr/scan/:qrId', tryCatch(walletIntegrationController.processQRScan));
router.post('/qr/bank-deposit', authMiddleware, tryCatch(walletIntegrationController.generateBankDepositQR));
router.post('/qr/wallet-connect', authMiddleware, tryCatch(walletIntegrationController.generateWalletConnectQR));
router.delete('/qr/:qrId', authMiddleware, tryCatch(walletIntegrationController.deactivateQR));
router.get('/qr', authMiddleware, tryCatch(walletIntegrationController.getUserQRCodes));

// Rapyd Integration Routes
router.get('/rapyd/payment-methods/:country', authMiddleware, tryCatch(walletIntegrationController.getRapydPaymentMethods));
router.get('/rapyd/exchange-rates', authMiddleware, tryCatch(walletIntegrationController.getRapydExchangeRate));
router.get('/rapyd/countries', authMiddleware, tryCatch(walletIntegrationController.getRapydCountries));
router.get('/rapyd/currencies', authMiddleware, tryCatch(walletIntegrationController.getRapydCurrencies));

module.exports = router;
