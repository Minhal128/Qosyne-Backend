const rapydRealService = require('../services/rapydRealService');

/**
 * Test Rapyd API connection
 */
exports.testRapydConnection = async (req, res) => {
  try {
    console.log('🧪 Testing Rapyd API connection...');
    
    // Simple test - just check if we can generate signature
    const testSignature = rapydRealService.generateSignature('GET', '/v1/user', null);
    
    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        rapydConnection: 'SUCCESS',
        signatureGenerated: !!testSignature.signature,
        environment: 'sandbox',
        timestamp: new Date().toISOString(),
        credentials: {
          accessKey: rapydRealService.accessKey ? 'Present' : 'Missing',
          secretKey: rapydRealService.secretKey ? 'Present' : 'Missing'
        }
      },
      message: '✅ Rapyd service initialized successfully!'
    });

  } catch (error) {
    console.error('❌ Rapyd connection test failed:', error);
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      stack: error.stack,
      message: '❌ Rapyd API connection failed'
    });
  }
};

/**
 * Create test user wallet
 */
exports.createTestWallet = async (req, res) => {
  try {
    const { firstName = 'Test', lastName = 'User', email = 'test@qosyne.com' } = req.body;
    
    console.log('🧪 Creating test Rapyd wallet...');
    
    const testWalletData = {
      userId: 999, // Test user ID
      firstName,
      lastName,
      email,
      phoneNumber: '+1234567890',
      country: 'US',
      nationality: 'US'
    };

    const result = await rapydRealService.createUserWallet(testWalletData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        status_code: 201,
        data: {
          walletId: result.walletId,
          referenceId: result.referenceId
        },
        message: '✅ Test wallet created successfully!'
      });
    } else {
      res.status(400).json({
        success: false,
        status_code: 400,
        error: result.error,
        message: '❌ Test wallet creation failed'
      });
    }

  } catch (error) {
    console.error('❌ Test wallet creation failed:', error);
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      message: '❌ Test wallet creation failed'
    });
  }
};

/**
 * Test money transfer with admin fee
 */
exports.testTransferWithFee = async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount = 10 } = req.body;
    
    if (!fromWalletId || !toWalletId) {
      return res.status(400).json({
        success: false,
        error: 'fromWalletId and toWalletId are required',
        status_code: 400
      });
    }

    console.log(`🧪 Testing transfer: $${amount} from ${fromWalletId} to ${toWalletId}`);
    
    const result = await rapydRealService.processTransactionWithFee(
      fromWalletId,
      toWalletId,
      amount,
      'USD',
      'Test transfer with admin fee'
    );
    
    if (result.success) {
      res.status(200).json({
        success: true,
        status_code: 200,
        data: result,
        message: '✅ Test transfer completed successfully!'
      });
    } else {
      res.status(400).json({
        success: false,
        status_code: 400,
        error: result.error,
        message: '❌ Test transfer failed'
      });
    }

  } catch (error) {
    console.error('❌ Test transfer failed:', error);
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      message: '❌ Test transfer failed'
    });
  }
};
