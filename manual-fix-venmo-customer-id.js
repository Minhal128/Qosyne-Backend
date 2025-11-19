require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const braintree = require('braintree');

const prisma = new PrismaClient();

async function manualFixVenmoCustomerId() {
  console.log('🔧 Manually fixing Venmo customer ID...');
  
  try {
    // Find the Venmo wallet for user 4
    const venmoWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: 4,
        provider: "VENMO",
        isActive: true,
      },
    });

    if (!venmoWallet) {
      console.error('❌ No Venmo wallet found for user 4');
      return;
    }

    console.log('✅ Found Venmo wallet:', venmoWallet.walletId);
    
    // Extract customer ID from wallet ID (format: venmo_4_CUSTOMER_ID)
    const walletIdParts = venmoWallet.walletId.split('_');
    const extractedCustomerId = walletIdParts[2]; // Should be "46608414496"
    
    console.log('✅ Extracted customer ID from wallet ID:', extractedCustomerId);

    // Initialize Braintree gateway
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });

    // Verify the customer exists in Braintree
    try {
      const customer = await gateway.customer.find(extractedCustomerId);
      console.log('✅ Verified customer exists in Braintree:', customer.id);
    } catch (error) {
      console.error('❌ Customer not found in Braintree:', error.message);
      return;
    }

    // Update wallet with customer ID
    await prisma.connectedWallets.update({
      where: { id: venmoWallet.id },
      data: {
        customerId: extractedCustomerId,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Updated wallet with customer ID');

    // Now create payment method
    console.log('🔧 Creating test payment method...');

    const paymentMethodResult = await gateway.paymentMethod.create({
      customerId: extractedCustomerId,
      paymentMethodNonce: 'fake-valid-visa-nonce',
      options: {
        makeDefault: true,
        verifyCard: false,
      },
    });

    if (!paymentMethodResult.success) {
      console.error('❌ Failed to create payment method:', paymentMethodResult.message);
      return;
    }

    const paymentMethod = paymentMethodResult.paymentMethod;
    console.log('✅ Payment method created:', paymentMethod.token);

    // Update wallet with payment method token
    await prisma.connectedWallets.update({
      where: { id: venmoWallet.id },
      data: {
        paymentMethodToken: paymentMethod.token,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Wallet updated with payment method token');
    console.log('🎉 Manual fix completed!');
    
    // Verify final status
    const finalWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: 4,
        provider: "VENMO",
        isActive: true,
      },
    });

    console.log('\n📊 Final Wallet Status:');
    console.log('- Customer ID:', finalWallet?.customerId);
    console.log('- Has Client Token:', !!finalWallet?.accessToken);
    console.log('- Has Payment Method:', !!finalWallet?.paymentMethodToken);
    console.log('- Payment Method Token:', finalWallet?.paymentMethodToken);

  } catch (error) {
    console.error('❌ Error in manual fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualFixVenmoCustomerId().catch(console.error);
