const rapydRealService = require('../services/rapydRealService');

/**
 * Test real Rapyd wallet integration
 */
exports.testRealWalletIntegration = async (req, res) => {
  try {
    console.log('🧪 Testing REAL Rapyd wallet integration...');
    
    // Step 1: Get existing wallets from your Rapyd account
    const walletsResult = await rapydRealService.getExistingWallets();
    
    if (!walletsResult.success) {
      return res.status(500).json({
        success: false,
        status_code: 500,
        error: 'Failed to fetch existing wallets',
        details: walletsResult.error
      });
    }
    
    const wallets = walletsResult.wallets;
    
    if (wallets.length < 2) {
      return res.status(400).json({
        success: false,
        status_code: 400,
        error: 'Need at least 2 wallets in Rapyd account for testing transfers',
        walletsFound: wallets.length,
        message: 'Please create more wallets in your Rapyd dashboard'
      });
    }
    
    // Step 2: Test mapping fake wallet IDs to real ones
    const testUserId = 78;
    const fakeFromWallet = 'venmo_78_1758494905756';
    const fakeToWallet = 'wise_78_28660194';
    
    const fromMapping = await rapydRealService.mapToRealWalletId(fakeFromWallet, testUserId);
    const toMapping = await rapydRealService.mapToRealWalletId(fakeToWallet, testUserId + 1);
    
    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        message: '🎉 REAL Rapyd wallet integration ready!',
        walletsInAccount: {
          total: wallets.length,
          wallets: wallets.map(w => ({
            id: w.id,
            email: w.email,
            status: w.status,
            type: w.type,
            reference: w.ewallet_reference_id
          }))
        },
        walletMapping: {
          fromWallet: {
            fake: fakeFromWallet,
            real: fromMapping.realWalletId,
            success: fromMapping.success
          },
          toWallet: {
            fake: fakeToWallet,
            real: toMapping.realWalletId,
            success: toMapping.success
          }
        },
        readyForRealTransfers: fromMapping.success && toMapping.success,
        nextSteps: [
          'Your system will now use REAL Rapyd wallet IDs',
          'Transfers will appear in your Rapyd dashboard',
          'Admin fees will be collected to real admin wallet',
          'All transactions will be real money movements'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Real wallet integration test failed:', error);
    
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      message: 'Failed to test real wallet integration'
    });
  }
};

/**
 * Test a real transfer with admin fee using your Rapyd wallets
 */
exports.testRealTransferWithFee = async (req, res) => {
  try {
    console.log('💰 Testing REAL transfer with admin fee...');
    
    const { amount = 5.00 } = req.body;
    const testUserId = 78;
    
    // Use fake wallet IDs that will be mapped to real ones
    const fakeFromWallet = 'venmo_78_1758494905756';
    const fakeToWallet = 'wise_78_28660194';
    
    console.log(`🔄 Testing transfer of $${amount} with $0.75 admin fee`);
    
    const result = await rapydRealService.processRealTransactionWithFee(
      fakeFromWallet,
      fakeToWallet,
      amount,
      'USD',
      'Test real transfer with admin fee',
      testUserId
    );
    
    if (result.success) {
      res.status(200).json({
        success: true,
        status_code: 200,
        data: {
          message: '🎉 REAL Rapyd transfer successful!',
          transferDetails: {
            totalAmount: result.totalProcessed,
            userReceived: result.userReceived,
            adminFeeCollected: result.adminFeeCollected,
            mainTransfer: {
              id: result.mainTransfer.transferId,
              fromWallet: result.mainTransfer.fromWallet,
              toWallet: result.mainTransfer.toWallet,
              amount: result.mainTransfer.amount
            },
            adminFee: {
              id: result.adminFee.transferId,
              amount: result.adminFee.adminFeeAmount,
              adminWallet: result.adminFee.adminWalletId
            }
          },
          realWallets: result.realWallets,
          checkRapydDashboard: 'You should see these transfers in your Rapyd dashboard now!'
        }
      });
    } else {
      throw new Error('Transfer failed');
    }

  } catch (error) {
    console.error('❌ Real transfer test failed:', error);
    
    res.status(500).json({
      success: false,
      status_code: 500,
      error: error.message,
      message: 'Real transfer test failed - check logs for details'
    });
  }
};
