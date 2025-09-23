const axios = require('axios');

// Test the fixed endpoints
async function testEndpoints() {
  const BASE_URL = 'https://qosynebackend.vercel.app/api';
  
  console.log('🔍 Testing fixed endpoints...\n');

  try {
    // Test 1: Transaction stats endpoint
    console.log('1️⃣ Testing transaction stats endpoint...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/payment/admin/transactions/stats`);
      console.log('✅ Transaction stats endpoint working');
      console.log(`   Total transactions: ${statsResponse.data.data.totalTransactions}`);
      console.log(`   Status breakdown:`, statsResponse.data.data.statusBreakdown);
    } catch (error) {
      console.log('❌ Transaction stats endpoint failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('');

    // Test 2: All transactions endpoint with pagination
    console.log('2️⃣ Testing all transactions endpoint...');
    try {
      const transactionsResponse = await axios.get(`${BASE_URL}/payment/admin/transactions?page=1&limit=5`);
      console.log('✅ All transactions endpoint working');
      console.log(`   Returned ${transactionsResponse.data.data.transactions.length} transactions`);
      console.log(`   Total pages: ${transactionsResponse.data.data.pagination.totalPages}`);
    } catch (error) {
      console.log('❌ All transactions endpoint failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('');

    // Test 3: Health check
    console.log('3️⃣ Testing backend health...');
    try {
      const healthResponse = await axios.get(BASE_URL.replace('/api', ''));
      console.log('✅ Backend is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();
