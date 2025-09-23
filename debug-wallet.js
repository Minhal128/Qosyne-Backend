// Debug script to check wallet data
// Run this with: node debug-wallet.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugWallet() {
  try {
    console.log('🔍 Debugging wallet data...\n');
    
    // Get all connected wallets
    const allWallets = await prisma.connectedWallets.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`📊 Total connected wallets: ${allWallets.length}\n`);
    
    // Show all wallets
    allWallets.forEach((wallet, index) => {
      console.log(`Wallet ${index + 1}:`);
      console.log(`  ID: ${wallet.id}`);
      console.log(`  Wallet ID: ${wallet.walletId}`);
      console.log(`  Provider: ${wallet.provider}`);
      console.log(`  User ID: ${wallet.userId}`);
      console.log(`  User Name: ${wallet.user.name}`);
      console.log(`  User Email: ${wallet.user.email}`);
      console.log(`  Is Active: ${wallet.isActive}`);
      console.log(`  Account Email: ${wallet.accountEmail}`);
      console.log(`  Balance: ${wallet.balance}`);
      console.log(`  Currency: ${wallet.currency}`);
      console.log(`  Created: ${wallet.createdAt}`);
      console.log('---');
    });
    
    // Check for the specific wallet IDs you're trying to use
    const targetWalletIds = [
      'venmo_venmo_1758098479102_6111',
      'wise_account_6fbc207e'
    ];
    
    for (const targetWalletId of targetWalletIds) {
      const targetWallet = await prisma.connectedWallets.findFirst({
        where: {
          walletId: targetWalletId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`\n🎯 Searching for wallet ID: ${targetWalletId}`);
      if (targetWallet) {
        console.log('✅ Wallet found!');
        console.log(`  Belongs to user: ${targetWallet.user.name} (ID: ${targetWallet.userId})`);
        console.log(`  User email: ${targetWallet.user.email}`);
        console.log(`  Is Active: ${targetWallet.isActive}`);
        console.log(`  Provider: ${targetWallet.provider}`);
        console.log(`  Account Email: ${targetWallet.accountEmail}`);
      } else {
        console.log('❌ Wallet not found in database');
      }
    }
    
    // Show wallet ownership breakdown
    console.log('\n👥 Wallet ownership breakdown:');
    const userWalletCounts = {};
    allWallets.forEach(wallet => {
      const userKey = `${wallet.user.name} (ID: ${wallet.userId}, Email: ${wallet.user.email})`;
      if (!userWalletCounts[userKey]) {
        userWalletCounts[userKey] = [];
      }
      userWalletCounts[userKey].push(`${wallet.walletId} (${wallet.provider})`);
    });
    
    Object.entries(userWalletCounts).forEach(([user, wallets]) => {
      console.log(`\n${user}:`);
      wallets.forEach(wallet => console.log(`  - ${wallet}`));
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWallet();
