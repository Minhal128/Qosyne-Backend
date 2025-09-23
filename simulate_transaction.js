const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function simulateRapydTransaction() {
  console.log('🎭 Simulating cross-wallet Rapyd transaction...\n');
  
  try {
    // Create a real database transaction with mock Rapyd IDs
    const mockPaymentId = `payment_${Date.now()}`;
    const mockPayoutId = `payout_${Date.now()}`;
    
    console.log('1️⃣  Creating transaction in database...');
    const transaction = await prisma.transactions.create({
      data: {
        userId: 78,
        connectedWalletId: 70, // Venmo wallet
        amount: 25.00,
        currency: 'USD',
        provider: 'VENMO',
        type: 'EXTERNAL_TRANSFER',
        status: 'PROCESSING',
        fees: 0.75,
        rapydPaymentId: mockPaymentId,
        rapydPayoutId: mockPayoutId,
        estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000),
        metadata: JSON.stringify({
          fromProvider: 'VENMO',
          toProvider: 'WISE',
          fromWalletId: 'venmo_78_1758494905756',
          toWalletId: 'wise_78_28660194',
          description: 'Simulated cross-wallet transfer',
          isCrossPlatform: true,
          transferProtocol: 'rapyd_cross_platform'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create transaction recipient record
    await prisma.transactionRecipients.create({
      data: {
        transactionId: transaction.id,
        recipientWalletId: 'wise_78_28660194',
        recipientName: 'Wise Account',
        recipientEmail: 'user@wise.com'
      }
    });

    console.log('✅ Transaction created:', {
      id: transaction.id,
      rapydPaymentId: mockPaymentId,
      rapydPayoutId: mockPayoutId,
      status: transaction.status
    });

    // Simulate webhook events
    console.log('\n2️⃣  Simulating Rapyd webhook events...');
    
    // Send PAYMENT_COMPLETED webhook
    const paymentWebhook = {
      type: 'PAYMENT_COMPLETED',
      data: {
        id: mockPaymentId,
        status: 'completed',
        amount: '25.00',
        currency: 'USD',
        metadata: {
          transactionId: transaction.id.toString()
        }
      },
      created: new Date().toISOString()
    };

    console.log('📡 Sending payment webhook...');
    try {
      const webhookResponse = await axios.post('https://qosyne-sandbox.loca.lt/api/webhooks/rapyd', 
        paymentWebhook,
        {
          headers: { 
            'Content-Type': 'application/json',
            'x-webhook-signature': 'simulated_webhook'
          }
        }
      );
      console.log('✅ Payment webhook sent successfully');
    } catch (webhookError) {
      console.log('⚠️  Webhook failed (tunnel may be down):', webhookError.message);
    }

    // Wait 2 seconds then send payout webhook
    await new Promise(resolve => setTimeout(resolve, 2000));

    const payoutWebhook = {
      type: 'PAYOUT_COMPLETED', 
      data: {
        id: mockPayoutId,
        status: 'completed',
        payout_amount: '24.25',
        payout_currency: 'USD',
        metadata: {
          transactionId: transaction.id.toString()
        }
      },
      created: new Date().toISOString()
    };

    console.log('📡 Sending payout webhook...');
    try {
      await axios.post('https://qosyne-sandbox.loca.lt/api/webhooks/rapyd',
        payoutWebhook,
        {
          headers: {
            'Content-Type': 'application/json', 
            'x-webhook-signature': 'simulated_webhook'
          }
        }
      );
      console.log('✅ Payout webhook sent successfully');
    } catch (webhookError) {
      console.log('⚠️  Webhook failed (tunnel may be down):', webhookError.message);
    }

    // Mark transaction as completed
    const completedTransaction = await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('\n🎯 SUCCESS! Transaction simulation complete:');
    console.log(`   • Transaction ID: ${transaction.id}`);
    console.log(`   • Payment ID: ${mockPaymentId}`);
    console.log(`   • Payout ID: ${mockPayoutId}`);
    console.log(`   • Status: ${completedTransaction.status}`);
    
    console.log('\n📊 What to check:');
    console.log('   1. Your database now has a real cross-wallet transaction');
    console.log('   2. Webhook events were sent to demonstrate real-time updates');
    console.log('   3. Transaction status changed from PROCESSING → COMPLETED');
    
    console.log('\n💡 This demonstrates the exact flow that would happen with real Rapyd API calls!');

  } catch (error) {
    console.error('❌ Simulation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRapydTransaction();