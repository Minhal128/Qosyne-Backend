const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post("/wise/init", authMiddleware, async (req, res) => {
  try {
    console.log('=== Wise API Connection Debug ===');
    console.log('Profile ID:', process.env.WISE_PROFILE_ID);
    console.log('API Token:', process.env.WISE_API_TOKEN ? 'Present' : 'Missing');
    console.log('User ID:', req.user?.userId);
    
    // First, let's test with a simpler endpoint to verify credentials
    console.log('Testing Wise API credentials...');
    
    const testResponse = await axios.get(
      `https://api.sandbox.transferwise.tech/v1/profiles`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );
    
    console.log('Profiles response:', testResponse.data);
    
    // Now try the balances endpoint
    const response = await axios.get(
      `https://api.sandbox.transferwise.tech/v1/profiles/${process.env.WISE_PROFILE_ID}/balances`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );

    console.log('Wise API Success:', response.data);
    
    // Create wallet connection using walletService
    const walletService = require('../services/walletService');
    const userId = req.user.userId;
    
    try {
      const walletConnection = await walletService.connectWallet({
        userId: userId,
        provider: 'WISE',
        authCode: JSON.stringify({ 
          accessToken: process.env.WISE_API_TOKEN,
          profileId: process.env.WISE_PROFILE_ID,
          connectionType: 'direct_api',
          identifier: 'wise_direct_connected',
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
        message: 'Wise API connected successfully'
      });
    } catch (walletError) {
      console.error('Wallet creation error:', walletError);
      // Still return success for API connection, but note wallet creation failed
      res.json({
        success: true,
        data: {
          connected: true,
          balanceData: response.data,
          walletCreationError: walletError.message
        },
        message: 'Wise API connected successfully (wallet creation had issues)'
      });
    }
  } catch (error) {
    console.error("Wise connect error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to connect to Wise API: " + (error.response?.data?.message || error.message)
    });
  }
});

// Test route to verify the endpoint is accessible
router.get("/wise/test", (req, res) => {
  res.json({
    success: true,
    message: "Wise direct route is working!",
    timestamp: new Date().toISOString(),
    env: {
      profileId: process.env.WISE_PROFILE_ID ? 'Present' : 'Missing',
      apiToken: process.env.WISE_API_TOKEN ? 'Present' : 'Missing'
    }
  });
});

module.exports = router;
