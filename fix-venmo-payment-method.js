require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const braintree = require('braintree');

const prisma = new PrismaClient();

async function fixVenmoPaymentMethod() {
  console.log('🔧 Fixing Venmo payment method for user...');
  
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
    console.log('✅ Customer ID:', venmoWallet.customerId);

    if (!venmoWallet.customerId) {
      console.error('❌ No customer ID found. Need to reconnect Venmo wallet.');
      return;
    }

    // Initialize Braintree gateway
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });

    console.log('🔧 Creating test payment method...');

    // Create payment method using fake-valid-visa-nonce
    const paymentMethodResult = await gateway.paymentMethod.create({
      customerId: venmoWallet.customerId,
      paymentMethodNonce: 'fake-valid-visa-nonce', // Braintree test nonce
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

    console.log('✅ Venmo wallet updated with payment method token');
    console.log('🎉 Venmo payment method fix completed!');
    
    // Test the wallet status
    const updatedWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: 4,
        provider: "VENMO",
        isActive: true,
      },
    });

    console.log('\n📊 Updated Wallet Status:');
    console.log('- Connected:', !!updatedWallet);
    console.log('- Has Client Token:', !!updatedWallet?.accessToken);
    console.log('- Has Payment Method:', !!updatedWallet?.paymentMethodToken);
    console.log('- Payment Method Token:', updatedWallet?.paymentMethodToken);

  } catch (error) {
    console.error('❌ Error fixing Venmo payment method:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVenmoPaymentMethod().catch(console.error);
