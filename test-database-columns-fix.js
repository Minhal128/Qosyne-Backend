const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testDatabaseColumnsFix() {
    console.log('🧪 Testing database columns fix...\n');

    try {
        // Test 1: Test connectedWallets query with accessToken
        console.log('1️⃣ Testing connectedWallets.findMany() with accessToken...');
        try {
            const connectedWallets = await prisma.connectedWallets.findMany({
                where: { userId: 78 },
                select: {
                    id: true,
                    provider: true,
                    walletId: true,
                    accessToken: true,
                    refreshToken: true,
                    paymentMethodToken: true,
                    lastSync: true,
                    capabilities: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            console.log(`✅ connectedWallets query successful! Found ${connectedWallets.length} wallets`);
            if (connectedWallets.length > 0) {
                console.log('   Sample wallet fields:', Object.keys(connectedWallets[0]));
            }
        } catch (error) {
            console.error('❌ connectedWallets query failed:', error.message);
        }

        // Test 2: Test transactions query with rapydPaymentId
        console.log('\n2️⃣ Testing transactions.findMany() with rapydPaymentId...');
        try {
            const transactions = await prisma.transactions.findMany({
                where: { userId: 78 },
                select: {
                    id: true,
                    paymentId: true,
                    rapydPaymentId: true,
                    rapydPayoutId: true,
                    amount: true,
                    provider: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    completedAt: true
                },
                take: 5
            });
            console.log(`✅ transactions query successful! Found ${transactions.length} transactions`);
            if (transactions.length > 0) {
                console.log('   Sample transaction fields:', Object.keys(transactions[0]));
            }
        } catch (error) {
            console.error('❌ transactions query failed:', error.message);
        }

        // Test 3: Test users query with selectedWalletId
        console.log('\n3️⃣ Testing users.findUnique() with selectedWalletId...');
        try {
            const user = await prisma.users.findUnique({
                where: { id: 78 },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    selectedWalletId: true,
                    selectedWalletType: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            console.log('✅ users query successful!');
            if (user) {
                console.log('   User fields:', Object.keys(user));
                console.log('   Selected wallet:', user.selectedWalletId || 'None');
            }
        } catch (error) {
            console.error('❌ users query failed:', error.message);
        }

        // Test 4: Test creating a test connectedWallet record
        console.log('\n4️⃣ Testing connectedWallets.create() with all fields...');
        try {
            const testWallet = await prisma.connectedWallets.create({
                data: {
                    userId: 78,
                    provider: 'QOSYNE',
                    walletId: `test_wallet_${Date.now()}`,
                    accountEmail: 'test@example.com',
                    fullName: 'Test User',
                    balance: 0,
                    currency: 'USD',
                    accessToken: 'test_access_token',
                    refreshToken: 'test_refresh_token',
                    paymentMethodToken: 'test_payment_token',
                    capabilities: JSON.stringify({ transfer: true, deposit: true }),
                    lastSync: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ connectedWallets.create() successful!');
            console.log('   Created wallet ID:', testWallet.id);

            // Clean up test record
            await prisma.connectedWallets.delete({
                where: { id: testWallet.id }
            });
            console.log('✅ Test wallet cleaned up');
        } catch (error) {
            console.error('❌ connectedWallets.create() failed:', error.message);
        }

        // Test 5: Test creating a test transaction record
        console.log('\n5️⃣ Testing transactions.create() with all fields...');
        try {
            const testTransaction = await prisma.transactions.create({
                data: {
                    userId: 78,
                    amount: 10.00,
                    currency: 'USD',
                    provider: 'QOSYNE',
                    type: 'TRANSFER',
                    status: 'PENDING',
                    fees: 0.50,
                    paymentId: `test_payment_${Date.now()}`,
                    rapydPaymentId: `rapyd_test_${Date.now()}`,
                    rapydPayoutId: `rapyd_payout_${Date.now()}`,
                    metadata: JSON.stringify({ test: true }),
                    updatedAt: new Date()
                }
            });
            console.log('✅ transactions.create() successful!');
            console.log('   Created transaction ID:', testTransaction.id);

            // Clean up test record
            await prisma.transactions.delete({
                where: { id: testTransaction.id }
            });
            console.log('✅ Test transaction cleaned up');
        } catch (error) {
            console.error('❌ transactions.create() failed:', error.message);
        }

        console.log('\n🎉 Database columns fix test completed!');

    } catch (error) {
        console.error('\n💥 Test failed with error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
if (require.main === module) {
    testDatabaseColumnsFix()
        .then(() => {
            console.log('\n✅ All tests completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testDatabaseColumnsFix };
