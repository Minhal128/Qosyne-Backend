/**
 * Test Braintree Dashboard Visibility
 * This script will verify transactions appear in your Braintree dashboard
 */

const braintree = require('braintree');
require('dotenv').config();

// Braintree Configuration
const MERCHANT_ID = process.env.BT_MERCHANT_ID;
const PUBLIC_KEY = process.env.BT_PUBLIC_KEY;
const PRIVATE_KEY = process.env.BT_PRIVATE_KEY;

console.log('🔍 BRAINTREE DASHBOARD INVESTIGATION\n');
console.log('════════════════════════════════════════════════════════════\n');

// Initialize Gateway
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: MERCHANT_ID,
  publicKey: PUBLIC_KEY,
  privateKey: PRIVATE_KEY
});

console.log('✅ Braintree Configuration:');
console.log('   Merchant ID:', MERCHANT_ID);
console.log('   Public Key:', PUBLIC_KEY);
console.log('   Environment: Sandbox');
console.log('   Dashboard URL: https://sandbox.braintreegateway.com/\n');

async function checkDashboardAccess() {
  try {
    console.log('🔐 Step 1: Verifying Braintree API Access...');
    
    // Test API access by generating a client token
    const clientToken = await gateway.clientToken.generate({});
    console.log('✅ API Access Verified!\n');

    console.log('📊 Step 2: Fetching Recent Transactions...');
    
    // Search for transactions from the last 24 hours
    const stream = gateway.transaction.search((search) => {
      search.createdAt().min(new Date(Date.now() - 24 * 60 * 60 * 1000));
    });

    const transactions = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (transaction) => {
        transactions.push(transaction);
      });

      stream.on('end', () => {
        console.log(`✅ Found ${transactions.length} transaction(s) in last 24 hours\n`);
        
        if (transactions.length === 0) {
          console.log('⚠️  NO TRANSACTIONS FOUND!\n');
          console.log('🔍 TROUBLESHOOTING:\n');
          console.log('   1. ❌ No transactions created yet');
          console.log('   2. ❌ Transactions older than 24 hours');
          console.log('   3. ❌ Using different Braintree account');
          console.log('   4. ❌ Wrong merchant ID\n');
        } else {
          console.log('📋 TRANSACTION DETAILS:\n');
          console.log('════════════════════════════════════════════════════════════\n');
          
          transactions.forEach((tx, index) => {
            console.log(`Transaction #${index + 1}:`);
            console.log('   ID:', tx.id);
            console.log('   Amount: $' + tx.amount);
            console.log('   Status:', tx.status);
            console.log('   Type:', tx.type);
            console.log('   Created:', tx.createdAt);
            console.log('   Payment Method:', tx.paymentInstrumentType);
            
            // Check if it's a Venmo transaction
            if (tx.paymentInstrumentType === 'venmo_account') {
              console.log('   🎯 VENMO TRANSACTION FOUND!');
              console.log('   Venmo User:', tx.venmoAccount?.username || 'N/A');
            }
            
            console.log('   Dashboard Link: https://sandbox.braintreegateway.com/merchants/' + MERCHANT_ID + '/transactions/' + tx.id);
            console.log('');
          });
        }
        
        resolve(transactions);
      });

      stream.on('error', (error) => {
        console.error('❌ Error fetching transactions:', error.message);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Braintree API Error:', error.message);
    console.error('\n🔍 Common Issues:');
    console.error('   1. Invalid API credentials');
    console.error('   2. Account not activated');
    console.error('   3. Network/firewall issues');
    console.error('   4. Braintree service outage\n');
    throw error;
  }
}

async function createTestTransaction() {
  console.log('\n💳 Step 3: Creating Test Transaction...\n');
  
  try {
    // Create a test customer first
    console.log('👤 Creating test customer...');
    const customerResult = await gateway.customer.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@qosyne.com'
    });

    if (!customerResult.success) {
      throw new Error('Failed to create customer: ' + customerResult.message);
    }

    const customerId = customerResult.customer.id;
    console.log('✅ Customer created:', customerId);

    // Generate client token for this customer
    console.log('🔑 Generating client token...');
    const clientTokenResponse = await gateway.clientToken.generate({
      customerId: customerId
    });
    
    console.log('✅ Client token generated');
    console.log('\n⚠️  IMPORTANT: To complete the test, you need a payment method.\n');
    console.log('📱 For Venmo payments:');
    console.log('   1. Use the client token in your mobile app/frontend');
    console.log('   2. Complete Venmo OAuth flow');
    console.log('   3. Get payment method token from Braintree');
    console.log('   4. Use that token to create transactions\n');

    console.log('💡 ALTERNATIVE: Use Braintree\'s test nonce for testing:\n');
    console.log('   Test Nonce: "fake-venmo-account-nonce"');
    console.log('   Use this in transaction.sale() to simulate Venmo payment\n');

    // Create a test transaction using a test nonce
    console.log('🧪 Creating test transaction with fake nonce...');
    const result = await gateway.transaction.sale({
      amount: '10.00',
      paymentMethodNonce: 'fake-valid-nonce', // Braintree test nonce
      options: {
        submitForSettlement: true
      }
    });

    if (result.success) {
      console.log('✅ TEST TRANSACTION CREATED!');
      console.log('   Transaction ID:', result.transaction.id);
      console.log('   Amount: $' + result.transaction.amount);
      console.log('   Status:', result.transaction.status);
      console.log('   Type:', result.transaction.paymentInstrumentType);
      console.log('\n🎉 CHECK YOUR DASHBOARD NOW!');
      console.log('   URL: https://sandbox.braintreegateway.com/merchants/' + MERCHANT_ID + '/transactions');
      console.log('   Direct Link: https://sandbox.braintreegateway.com/merchants/' + MERCHANT_ID + '/transactions/' + result.transaction.id);
      console.log('\n📊 This transaction should appear in your dashboard within seconds!\n');
      
      return result.transaction;
    } else {
      console.error('❌ Transaction failed:', result.message);
      if (result.errors) {
        console.error('Errors:', result.errors.deepErrors());
      }
    }

  } catch (error) {
    console.error('❌ Error creating test transaction:', error.message);
    throw error;
  }
}

async function checkVenmoConfiguration() {
  console.log('\n🔧 Step 4: Checking Venmo Configuration...\n');
  
  console.log('📋 Current Setup:');
  console.log('   Merchant ID:', MERCHANT_ID);
  console.log('   Environment: Sandbox\n');
  
  console.log('✅ Required for Venmo in Braintree:');
  console.log('   ✓ Braintree account (you have this)');
  console.log('   ✓ Venmo enabled in Braintree settings');
  console.log('   ✓ Valid payment method token from Venmo OAuth');
  console.log('   ✓ Correct merchant account settings\n');
  
  console.log('🔍 To verify in Braintree Dashboard:');
  console.log('   1. Login: https://sandbox.braintreegateway.com/');
  console.log('   2. Go to Settings → Processing');
  console.log('   3. Check if "Venmo" is enabled');
  console.log('   4. Verify merchant account configuration\n');
}

async function showDashboardInstructions() {
  console.log('\n📱 HOW TO VIEW TRANSACTIONS IN BRAINTREE DASHBOARD:\n');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('1️⃣  LOGIN TO BRAINTREE:');
  console.log('   URL: https://sandbox.braintreegateway.com/');
  console.log('   Use your Braintree account credentials\n');
  
  console.log('2️⃣  NAVIGATE TO TRANSACTIONS:');
  console.log('   Dashboard → Transactions → All Transactions\n');
  
  console.log('3️⃣  FILTER OPTIONS:');
  console.log('   • By Date: Last 24 hours, Last 7 days, etc.');
  console.log('   • By Status: All, Settled, Settling, etc.');
  console.log('   • By Type: Venmo, Credit Card, etc.\n');
  
  console.log('4️⃣  SEARCH BY TRANSACTION ID:');
  console.log('   Use the transaction IDs from your test scripts');
  console.log('   Format: 44j3b6mx, 5p9o8dp2 (from your screenshot)\n');
  
  console.log('5️⃣  COMMON ISSUES:\n');
  console.log('   ❌ Wrong account: Check merchant ID matches');
  console.log('   ❌ No transactions: Wait a few seconds for sync');
  console.log('   ❌ Wrong environment: Sandbox vs Production');
  console.log('   ❌ Date filter: Expand date range\n');
}

// Run all checks
async function main() {
  try {
    // Check dashboard access and fetch transactions
    const transactions = await checkDashboardAccess();
    
    // Check Venmo configuration
    await checkVenmoConfiguration();
    
    // Show dashboard instructions
    await showDashboardInstructions();
    
    // Ask if user wants to create a test transaction
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🧪 READY TO CREATE TEST TRANSACTION?\n');
    console.log('This will create a visible transaction in your dashboard.\n');
    
    // Automatically create test transaction for demonstration
    await createTestTransaction();
    
    console.log('\n✅ SCRIPT COMPLETE!\n');
    console.log('🎯 ACTION ITEMS:\n');
    console.log('   1. Login to Braintree Dashboard');
    console.log('   2. Check Transactions tab');
    console.log('   3. Look for the test transaction ID above');
    console.log('   4. Verify Venmo is enabled in Settings\n');
    
    // Wait a bit then fetch transactions again
    console.log('⏳ Waiting 3 seconds before checking for new transaction...\n');
    
    setTimeout(async () => {
      console.log('🔄 Refreshing transaction list...\n');
      await checkDashboardAccess();
      
      console.log('\n════════════════════════════════════════════════════════════');
      console.log('💡 If you still don\'t see transactions:');
      console.log('   • Verify you\'re using the correct Braintree account');
      console.log('   • Check merchant ID: ' + MERCHANT_ID);
      console.log('   • Confirm environment is Sandbox');
      console.log('   • Contact Braintree support if issues persist');
      console.log('════════════════════════════════════════════════════════════\n');
      
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ SCRIPT FAILED:', error.message);
    console.error('\n🔧 Troubleshooting Steps:');
    console.error('   1. Verify .env file has correct BT_* credentials');
    console.error('   2. Check Braintree account is active');
    console.error('   3. Ensure you have API access enabled');
    console.error('   4. Try logging into dashboard manually first\n');
    process.exit(1);
  }
}

// Run the script
main();
