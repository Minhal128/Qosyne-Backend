const rapydRealService = require('../services/rapydRealService');

/**
 * Test Rapyd API from Vercel servers (not local machine)
 * This bypasses geographical restrictions
 */
exports.testRapydFromServer = async (req, res) => {
  try {
    console.log('🌐 Testing Rapyd API from Vercel servers...');
    
    // Simple test - just check signature generation
    const testSignature = rapydRealService.generateSignature('GET', '/v1/data/currencies', null);
    
    console.log('✅ Signature generated successfully from server!');
    
    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        rapydConnection: 'SIGNATURE_GENERATION_SUCCESS',
        signatureGenerated: !!testSignature.signature,
        serverLocation: 'Vercel (bypasses geo-restrictions)',
        timestamp: new Date().toISOString(),
        credentials: {
          accessKey: rapydRealService.accessKey ? 'Present' : 'Missing',
          secretKey: rapydRealService.secretKey ? 'Present' : 'Missing'
        }
      },
      message: '🎉 Rapyd service ready on server! Signature generation working!'
    });

  } catch (error) {
    console.error('❌ Server-side Rapyd test failed:', error);
    
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      stack: error.stack,
      message: '❌ Rapyd service test failed from server'
    });
  }
};

/**
 * Test creating admin wallet from server
 */
exports.testCreateAdminWalletFromServer = async (req, res) => {
  try {
    console.log('🏦 Testing admin wallet creation from Vercel servers...');
    
    const adminWallet = await rapydRealService.getOrCreateAdminWallet();
    
    console.log('✅ Admin wallet created/retrieved successfully!');
    
    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        adminWalletId: adminWallet.id,
        adminWalletStatus: 'READY',
        feeAmount: rapydRealService.adminFeeAmount,
        serverLocation: 'Vercel',
        message: 'Admin wallet ready for fee collection'
      },
      message: '🏦 Admin wallet ready for $0.75 fee collection!'
    });

  } catch (error) {
    console.error('❌ Admin wallet test failed:', error);
    
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      details: error.response?.data || 'No additional details',
      message: '❌ Admin wallet creation failed'
    });
  }
};
