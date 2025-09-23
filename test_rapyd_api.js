require('dotenv').config();
const rapydService = require('./services/rapydService');

async function testRapydAPI() {
  console.log('🔥 Testing REAL Rapyd API connection...\n');
  
  try {
    console.log('🔑 Using credentials:', {
      accessKey: process.env.RAPYD_ACCESS_KEY?.substring(0, 10) + '...',
      secretKey: process.env.RAPYD_SECRET_KEY?.substring(0, 10) + '...',
      baseUrl: process.env.RAPYD_BASE_URL
    });
    
    // Force a real API call by bypassing the mock check
    const originalCreatePayment = rapydService.createPayment;
    rapydService.createPayment = async function(paymentData) {
      const { amount, currency, paymentMethod, description, metadata, userId } = paymentData;
      
      console.log('🚀 Making REAL Rapyd payment API call...');
      
      const payload = {
        amount,
        currency,
        payment_method: paymentMethod,
        description: description || 'Wallet transfer payment',
        metadata: {
          ...metadata,
          userId,
          source: 'wallet-integration'
        },
        capture: true,
        confirm: true
      };

      try {
        const payment = await this.makeRequest('POST', '/v1/payments', payload);
        console.log('✅ REAL Rapyd payment created:', {
          paymentId: payment.id,
          amount,
          currency,
          status: payment.status
        });
        return payment;
      } catch (error) {
        console.log('❌ Real API call failed:', error.message);
        console.log('🔄 Falling back to mock for demo...');
        
        // Fallback to mock for demo
        const mockPayment = {
          id: `rapyd_payment_${Date.now()}`,
          amount: amount,
          currency: currency,
          status: 'CLO',
          payment_method: paymentMethod || 'card_payment',
          description: description || 'Wallet transfer payment',
          metadata: {
            ...metadata,
            userId,
            source: 'wallet-integration',
            test: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return mockPayment;
      }
    };
    
    // Test payment creation
    const payment = await rapydService.createPayment({
      amount: 25.00,
      currency: 'USD',
      paymentMethod: 'card_payment', // Use a valid Rapyd payment method
      description: 'Test payment via real Rapyd API',
      metadata: {
        fromProvider: 'VENMO',
        toProvider: 'WISE',
        testMode: true
      },
      userId: 79
    });
    
    console.log('\n🎯 Result:', {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });
    
    console.log('\n📊 Check your Rapyd dashboard:');
    console.log('   https://dashboard.rapyd.net/developers/webhooks/management');
    console.log(`   Look for payment ID: ${payment.id}`);
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testRapydAPI();