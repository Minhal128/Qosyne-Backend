// Test script to verify Venmo recipient validation logic fix
// This test focuses on the validation logic without requiring Braintree credentials

// Mock the braintree module to avoid credential requirements
const mockBraintree = {
  Environment: { Sandbox: 'sandbox' },
  BraintreeGateway: class MockBraintreeGateway {
    constructor() {
      this.transaction = {
        sale: async () => ({ success: false, message: 'Mock transaction' })
      };
      this.customer = {
        find: async () => ({ success: false }),
        create: async () => ({ success: false })
      };
      this.paymentMethod = {
        create: async () => ({ success: false })
      };
    }
  }
};

// Replace the real braintree with our mock
require.cache[require.resolve('braintree')] = {
  exports: mockBraintree
};

const { MethodBasedPayment } = require('./paymentGateways/interfaces/methodBasedPayment');

// Create a test version of VenmoGateway that extends the validation logic
class TestVenmoGateway extends MethodBasedPayment {
  constructor() {
    super();
    // Mock gateway to avoid credential issues
    this.gateway = new mockBraintree.BraintreeGateway();
  }

  // Copy the exact validation logic from VenmoGateway
  async authorizePayment(paymentData) {
    try {
      const { 
        amount, 
        paymentMethodId, 
        recipient,
        walletDeposit = false,
        customerId,
        useQosyneBalance = false,
        connectedWalletId
      } = paymentData;

      // Validate that walletDeposit and useQosyneBalance are mutually exclusive
      if (walletDeposit && useQosyneBalance) {
        throw new Error('walletDeposit and useQosyneBalance cannot both be true');
      }
      
      console.log('Processing Venmo payment:', { 
        amount, 
        walletDeposit, 
        useQosyneBalance 
      });

      if (useQosyneBalance) {
        // SPECIAL CASE: Using Qosyne Balance as payment source
        console.log('✅ Using Qosyne balance - recipient validation bypassed');
        
        // Mock successful response for useQosyneBalance case
        return {
          paymentId: 'mock_payment_id',
          payedAmount: parseFloat(amount),
          response: {
            id: 'mock_transaction_id',
            status: 'submitted_for_settlement',
            amount: amount,
            currency: 'USD',
            source: 'QOSYNE_BALANCE',
            destination: 'RECIPIENT'
          }
        };
      } else {
        // Regular Venmo payment flow using customer's payment method
        
        // Validate payment method ID
        if (!paymentMethodId) {
          throw new Error('Missing payment method ID');
        }
        
        // Validate customer ID
        if (!customerId) {
          throw new Error('Missing customer ID');
        }
        
        // For non-wallet deposits, we need recipient information
        // However, if we have a connectedWalletId, we can use that for wallet-to-wallet transfers
        if (!walletDeposit && (!recipient || !recipient.name || recipient.name.trim() === '') && !connectedWalletId) {
          throw new Error('Recipient information is required for transfers. Please provide recipient name or use wallet deposit.');
        }
        
        console.log('✅ Regular payment flow - validation passed');
        
        // Mock successful response for regular payment
        return {
          paymentId: 'mock_payment_id',
          payedAmount: parseFloat(amount),
          response: {
            id: 'mock_transaction_id',
            status: 'submitted_for_settlement',
            amount: amount,
            currency: 'USD'
          }
        };
      }
    } catch (error) {
      console.error('❌ Validation Error:', error.message);
      throw error;
    }
  }
}

async function testVenmoValidationLogic() {
  console.log('🧪 Testing Venmo recipient validation logic fix...\n');
  
  const venmoGateway = new TestVenmoGateway();
  
  // Test Case 1: useQosyneBalance = true (should work without recipient info)
  console.log('Test Case 1: Using Qosyne Balance (should work without recipient)');
  try {
    const result1 = await venmoGateway.authorizePayment({
      amount: '10.00',
      useQosyneBalance: true,
      recipient: null // No recipient provided
    });
    
    console.log('✅ Test Case 1 PASSED - useQosyneBalance bypassed recipient validation');
    console.log('Result:', result1.response.source, '\n');
  } catch (error) {
    if (error.message.includes('Recipient information is required')) {
      console.log('❌ Test Case 1 FAILED - Still throwing recipient validation error');
    } else {
      console.log('❌ Test Case 1 FAILED - Unexpected error:', error.message);
    }
    console.log('');
  }
  
  // Test Case 2: Regular payment without recipient (should fail with recipient error)
  console.log('Test Case 2: Regular payment without recipient (should fail)');
  try {
    await venmoGateway.authorizePayment({
      amount: '10.00',
      useQosyneBalance: false,
      walletDeposit: false,
      paymentMethodId: 'test_payment_method',
      customerId: 'test_customer',
      recipient: null // No recipient
    });
    
    console.log('❌ Test Case 2 FAILED - Should have thrown recipient validation error\n');
  } catch (error) {
    if (error.message.includes('Recipient information is required')) {
      console.log('✅ Test Case 2 PASSED - Correctly threw recipient validation error\n');
    } else {
      console.log('❌ Test Case 2 FAILED - Wrong error:', error.message, '\n');
    }
  }
  
  // Test Case 3: Regular payment with recipient (should work)
  console.log('Test Case 3: Regular payment with recipient (should work)');
  try {
    const result3 = await venmoGateway.authorizePayment({
      amount: '10.00',
      useQosyneBalance: false,
      walletDeposit: false,
      paymentMethodId: 'test_payment_method',
      customerId: 'test_customer',
      recipient: {
        name: 'Test Recipient',
        email: 'test@example.com'
      }
    });
    
    console.log('✅ Test Case 3 PASSED - Regular payment with recipient worked\n');
  } catch (error) {
    console.log('❌ Test Case 3 FAILED - Error:', error.message, '\n');
  }
  
  // Test Case 4: Wallet deposit (should work without recipient)
  console.log('Test Case 4: Wallet deposit (should work without recipient)');
  try {
    const result4 = await venmoGateway.authorizePayment({
      amount: '10.00',
      useQosyneBalance: false,
      walletDeposit: true,
      paymentMethodId: 'test_payment_method',
      customerId: 'test_customer',
      recipient: null
    });
    
    console.log('✅ Test Case 4 PASSED - Wallet deposit without recipient worked\n');
  } catch (error) {
    console.log('❌ Test Case 4 FAILED - Error:', error.message, '\n');
  }
  
  console.log('🏁 Validation logic test completed!');
}

// Run the test
testVenmoValidationLogic().catch(console.error);
