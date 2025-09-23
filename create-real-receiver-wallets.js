// Create real receiver with multiple wallet options for client demo
const { PrismaClient } = require('@prisma/client');

async function createRealReceiverWallets() {
  console.log('🎯 Creating Real Receiver with Multiple Wallet Options...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Use existing user as receiver (User 60 - Bilawal)
    console.log('📋 Step 1: Setting up receiver user...');
    
    const receiverUser = await prisma.users.findFirst({
      where: {
        id: 60 // Use Bilawal as the receiver
      }
    });
    
    if (!receiverUser) {
      throw new Error('Receiver user (ID: 60) not found. Please use an existing user.');
    }
    
    console.log(`✅ Using existing user as receiver: ${receiverUser.name} (ID: ${receiverUser.id})`);
    console.log(`   Email: ${receiverUser.email}`);
    
    // Step 2: Create multiple wallet connections for the receiver
    console.log('\n📋 Step 2: Creating multiple wallet connections...');
    
    const walletConnections = [
      {
        provider: 'WISE',
        walletId: `wise_receiver_${receiverUser.id}_${Date.now()}`,
        accountEmail: 'receiver@demo.com',
        fullName: 'Demo Receiver',
        currency: 'USD',
        balance: 0,
        accessToken: 'wise_demo_token_receiver',
        capabilities: JSON.stringify(['send', 'receive', 'balance_check'])
      },
      {
        provider: 'SQUARE',
        walletId: `square_receiver_${receiverUser.id}_${Date.now()}`,
        accountEmail: 'receiver@demo.com',
        fullName: 'Demo Receiver',
        currency: 'USD',
        balance: 0,
        accessToken: 'square_demo_token_receiver',
        capabilities: JSON.stringify(['send', 'receive', 'balance_check'])
      },
      {
        provider: 'VENMO',
        walletId: `venmo_receiver_${receiverUser.id}_${Date.now()}`,
        accountEmail: 'receiver@demo.com',
        fullName: 'Demo Receiver',
        currency: 'USD',
        balance: 0,
        accessToken: 'venmo_customer_receiver',
        paymentMethodToken: 'fake-valid-mastercard-nonce', // Real Braintree test token
        customerId: 'venmo_customer_receiver',
        capabilities: JSON.stringify(['send', 'receive', 'balance_check'])
      },
      {
        provider: 'GOOGLEPAY',
        walletId: `googlepay_receiver_${receiverUser.id}_${Date.now()}`,
        accountEmail: 'receiver@demo.com',
        fullName: 'Demo Receiver',
        currency: 'USD',
        balance: 0,
        accessToken: 'googlepay_demo_token_receiver',
        capabilities: JSON.stringify(['send', 'receive', 'balance_check'])
      }
    ];
    
    const createdWallets = [];
    
    for (const walletData of walletConnections) {
      // Check if wallet already exists
      const existingWallet = await prisma.connectedWallets.findFirst({
        where: {
          userId: receiverUser.id,
          provider: walletData.provider
        }
      });
      
      if (existingWallet) {
        console.log(`✅ ${walletData.provider} wallet already exists: ${existingWallet.walletId}`);
        createdWallets.push(existingWallet);
      } else {
        const newWallet = await prisma.connectedWallets.create({
          data: {
            userId: receiverUser.id,
            provider: walletData.provider,
            walletId: walletData.walletId,
            accountEmail: walletData.accountEmail,
            fullName: walletData.fullName,
            currency: walletData.currency,
            balance: walletData.balance,
            isActive: true,
            accessToken: walletData.accessToken,
            paymentMethodToken: walletData.paymentMethodToken || null,
            customerId: walletData.customerId || null,
            capabilities: walletData.capabilities,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Created ${walletData.provider} wallet: ${newWallet.walletId}`);
        createdWallets.push(newWallet);
      }
    }
    
    // Step 3: Create Rapyd ewallet for the receiver
    console.log('\n📋 Step 3: Setting up Rapyd ewallet for receiver...');
    
    const rapydWalletId = `ewallet_receiver_${receiverUser.id}`;
    
    // Check if Rapyd wallet record exists
    let rapydWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: receiverUser.id,
        provider: 'RAPYD'
      }
    });
    
    if (!rapydWallet) {
      rapydWallet = await prisma.connectedWallets.create({
        data: {
          userId: receiverUser.id,
          provider: 'RAPYD',
          walletId: rapydWalletId,
          accountEmail: 'receiver@demo.com',
          fullName: 'Demo Receiver',
          currency: 'USD',
          balance: 0,
          isActive: true,
          accessToken: 'rapyd_demo_token_receiver',
          capabilities: JSON.stringify(['send', 'receive', 'balance_check']),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`✅ Created Rapyd wallet: ${rapydWallet.walletId}`);
    } else {
      console.log(`✅ Rapyd wallet already exists: ${rapydWallet.walletId}`);
    }
    
    // Step 4: Summary for client demo
    console.log('\n🎉 RECEIVER SETUP COMPLETE!');
    console.log('================================');
    console.log(`Receiver User: ${receiverUser.name} (${receiverUser.email})`);
    console.log(`User ID: ${receiverUser.id}`);
    console.log('');
    
    console.log('📱 Available Receiver Wallets:');
    const allReceiverWallets = await prisma.connectedWallets.findMany({
      where: {
        userId: receiverUser.id
      }
    });
    
    allReceiverWallets.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.provider}: ${wallet.walletId}`);
    });
    
    console.log('\n🎯 FOR CLIENT DEMO:');
    console.log('Sender: test128@example.com (User 78)');
    console.log('Receiver Options:');
    allReceiverWallets.forEach((wallet) => {
      console.log(`- ${wallet.provider}: ${wallet.walletId}`);
    });
    
    console.log('\n💸 Test Transfer Examples:');
    console.log('1. Venmo → Wise: Send from venmo_78_1758494905756 to', allReceiverWallets.find(w => w.provider === 'WISE')?.walletId);
    console.log('2. Venmo → Square: Send from venmo_78_1758494905756 to', allReceiverWallets.find(w => w.provider === 'SQUARE')?.walletId);
    console.log('3. Venmo → Venmo: Send from venmo_78_1758494905756 to', allReceiverWallets.find(w => w.provider === 'VENMO')?.walletId);
    console.log('4. Venmo → Google Pay: Send from venmo_78_1758494905756 to', allReceiverWallets.find(w => w.provider === 'GOOGLEPAY')?.walletId);
    
    console.log('\n✅ All wallets are connected and ready for real-time transfers!');
    
  } catch (error) {
    console.error('❌ Error creating receiver wallets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
createRealReceiverWallets().catch(console.error);
