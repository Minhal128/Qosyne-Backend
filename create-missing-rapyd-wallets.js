// Script to create the missing wallets in your Rapyd account
const rapydRealService = require('./services/rapydRealService');

async function createMissingWallets() {
  console.log('🧪 Creating Missing Rapyd Wallets...\n');
  
  try {
    // Wallet 1: venmo_78_1758494905756 (for user 78)
    console.log('📋 Creating Venmo wallet: venmo_78_1758494905756');
    
    const venmoWalletData = {
      first_name: "User",
      last_name: "78", 
      email: "user78@example.com",
      ewallet_reference_id: "venmo_78_1758494905756",
      type: "person",
      metadata: {
        user_id: "78",
        provider: "VENMO",
        purpose: "user_wallet"
      },
      contact: {
        phone_number: "+12345678901",
        email: "user78@example.com",
        first_name: "User",
        last_name: "78",
        country: "US"
      }
    };
    
    try {
      const venmoWallet = await rapydRealService.makeRapydRequest('POST', '/user', venmoWalletData);
      console.log('✅ Venmo wallet created successfully:', {
        id: venmoWallet.id,
        reference_id: venmoWallet.ewallet_reference_id,
        status: venmoWallet.status
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Venmo wallet already exists');
      } else {
        console.error('❌ Failed to create Venmo wallet:', error.message);
      }
    }
    
    console.log('');
    
    // Wallet 2: wise_receiver_60_1758620967206 (receiver wallet for user 60)
    console.log('📋 Creating Wise receiver wallet: wise_receiver_60_1758620967206');
    
    const wiseWalletData = {
      first_name: "Receiver",
      last_name: "60",
      email: "receiver60@example.com", 
      ewallet_reference_id: "wise_receiver_60_1758620967206",
      type: "person",
      metadata: {
        user_id: "60",
        provider: "WISE", 
        purpose: "receiver_wallet"
      },
      contact: {
        phone_number: "+12345678902",
        email: "receiver60@example.com",
        first_name: "Receiver",
        last_name: "60",
        country: "US"
      }
    };
    
    try {
      const wiseWallet = await rapydRealService.makeRapydRequest('POST', '/user', wiseWalletData);
      console.log('✅ Wise receiver wallet created successfully:', {
        id: wiseWallet.id,
        reference_id: wiseWallet.reference_id,
        status: wiseWallet.status
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Wise receiver wallet already exists');
      } else {
        console.error('❌ Failed to create Wise receiver wallet:', error.message);
      }
    }
    
    console.log('');
    
    // List all wallets to verify
    console.log('📋 Listing all wallets in your Rapyd account:');
    try {
      const wallets = await rapydRealService.getExistingWallets();
      console.log('✅ Found wallets:', wallets.length);
      
      wallets.forEach((wallet, index) => {
        console.log(`${index + 1}. ${wallet.id} (${wallet.ewallet_reference_id}) - Status: ${wallet.status}`);
      });
      
      // Check if our specific wallets exist
      const venmoExists = wallets.find(w => w.ewallet_reference_id === 'venmo_78_1758494905756');
      const wiseExists = wallets.find(w => w.ewallet_reference_id === 'wise_receiver_60_1758620967206');
      
      console.log('');
      console.log('🎯 Wallet Status:');
      console.log('  venmo_78_1758494905756:', venmoExists ? '✅ EXISTS' : '❌ MISSING');
      console.log('  wise_receiver_60_1758620967206:', wiseExists ? '✅ EXISTS' : '❌ MISSING');
      
    } catch (error) {
      console.error('❌ Failed to list wallets:', error.message);
    }
    
    console.log('');
    console.log('🎉 Wallet creation process completed!');
    console.log('💡 If wallets were created successfully, try making another transaction');
    console.log('💡 You should now see transactions in your Rapyd dashboard');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the script
createMissingWallets().catch(console.error);