const SquareGateway = require('../paymentGateways/gateways/SquareGateway');

/**
 * Test Square API credentials and configuration
 */
exports.testSquareCredentials = async (req, res) => {
  try {
    console.log('🧪 Testing Square API credentials...');
    
    // Check environment variables
    const envCheck = {
      SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
      SQUARE_LOCATION_ID: !!process.env.SQUARE_LOCATION_ID,
      SQUARE_APPLICATION_ID: !!process.env.SQUARE_APPLICATION_ID,
      SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT || 'sandbox'
    };
    
    console.log('Environment variables check:', envCheck);
    
    // Initialize Square Gateway
    const squareGateway = new SquareGateway();
    
    // Test credentials
    await squareGateway.validateCredentials();
    
    res.json({
      success: true,
      message: 'Square API credentials are valid',
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Square credentials test failed:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Square API credentials test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Test customer creation functionality
 */
exports.testCustomerCreation = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for customer creation test'
      });
    }
    
    console.log('🧪 Testing customer creation/search...');
    
    const squareGateway = new SquareGateway();
    const customerId = await squareGateway.createOrGetCustomer({
      email: email,
      name: name || 'Test Customer'
    });
    
    res.json({
      success: true,
      message: 'Customer creation/search test successful',
      data: {
        customerId: customerId,
        email: email,
        name: name || 'Test Customer'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Customer creation test failed:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Customer creation test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get Square environment information
 */
exports.getSquareInfo = async (req, res) => {
  try {
    const sqEnv = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
    const isProd = sqEnv === 'production';
    
    const info = {
      environment: sqEnv,
      isProduction: isProd,
      baseUrl: isProd ? 'https://connect.squareup.com/v2' : 'https://connect.squareupsandbox.com/v2',
      credentials: {
        accessToken: process.env.SQUARE_ACCESS_TOKEN ? 'SET' : 'NOT SET',
        locationId: process.env.SQUARE_LOCATION_ID || 'NOT SET',
        applicationId: process.env.SQUARE_APPLICATION_ID ? 'SET' : 'NOT SET'
      },
      version: process.env.SQUARE_VERSION || '2024-06-20'
    };
    
    res.json({
      success: true,
      message: 'Square configuration information',
      data: info,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get Square information',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
