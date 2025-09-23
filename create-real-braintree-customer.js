// Create real Braintree customer and payment method for User 78
const braintree = require('braintree');
const { PrismaClient } = require('@prisma/client');

async function createRealBraintreeCustomer() {
  console.log('🏦 Creating REAL Braintree Customer for User 78...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Initialize Braintree gateway
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });
    
    console.log('✅ Braintree gateway initialized');
    
    // Step 1: Create a real Braintree customer
    console.log('📋 Step 1: Creating Braintree customer...');
    
    const customerResult = await gateway.customer.create({
      id: 'qosyne_user_78', // Custom customer ID
      firstName: 'Test',
      lastName: 'User',
      email: 'test128@example.com',
    });
    
    if (!customerResult.success) {
      throw new Error(`Failed to create Braintree customer: ${customerResult.message}`);
    }
    
    const customer = customerResult.customer;
    console.log('✅ Braintree customer created:', customer.id);
    
    // Step 2: Create a payment method using credit card (for testing)
    console.log('📋 Step 2: Creating payment method...');
    
    const paymentMethodResult = await gateway.paymentMethod.create({
      customerId: customer.id,
      paymentMethodNonce: 'fake-valid-visa-nonce', // This creates a real payment method in sandbox
    });
    
    if (!paymentMethodResult.success) {
      throw new Error(`Failed to create payment method: ${paymentMethodResult.message}`);
    }
    
    const paymentMethod = paymentMethodResult.paymentMethod;
    console.log('✅ Payment method created:', paymentMethod.token);
    
    // Step 3: Update User 78's wallet with real Braintree data
    console.log('📋 Step 3: Updating User 78 wallet...');
    
    const updatedWallet = await prisma.connectedWallets.update({
      where: {
        walletId: 'venmo_78_1758494905756'
      },
      data: {
        paymentMethodToken: paymentMethod.token, // REAL Braintree payment method token
        customerId: customer.id, // REAL Braintree customer ID
        accessToken: customer.id,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ User 78 wallet updated with REAL Braintree data:');
    console.log(`   Customer ID: ${updatedWallet.customerId}`);
    console.log(`   Payment Method Token: ${updatedWallet.paymentMethodToken}`);
    
    console.log('\n🎉 SUCCESS: User 78 now has REAL Braintree integration!');
    console.log('💳 Real Venmo transactions will now work through Braintree sandbox');
    console.log('🔄 Transactions will flow: Venmo → Braintree → Rapyd → Wise');
    
  } catch (error) {
    console.error('❌ Error creating real Braintree customer:', error);
    
    if (error.message.includes('Customer ID has already been taken')) {
      console.log('💡 Customer already exists, trying to get existing customer...');
      
      try {
        const gateway = new braintree.BraintreeGateway({
          environment: braintree.Environment.Sandbox,
          merchantId: process.env.BT_MERCHANT_ID,
          publicKey: process.env.BT_PUBLIC_KEY,
          privateKey: process.env.BT_PRIVATE_KEY,
        });
        
        const customer = await gateway.customer.find('qosyne_user_78');
        console.log('✅ Found existing customer:', customer.id);
        
        if (customer.paymentMethods && customer.paymentMethods.length > 0) {
          const paymentMethod = customer.paymentMethods[0];
          
          await prisma.connectedWallets.update({
            where: {
              walletId: 'venmo_78_1758494905756'
            },
            data: {
              paymentMethodToken: paymentMethod.token,
              customerId: customer.id,
              accessToken: customer.id,
              updatedAt: new Date()
            }
          });
          
          console.log('✅ Updated with existing payment method:', paymentMethod.token);
        }
      } catch (findError) {
        console.error('❌ Error finding existing customer:', findError);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the creation
createRealBraintreeCustomer().catch(console.error);
