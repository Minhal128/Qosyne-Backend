const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Utility functions to ensure user data isolation
 */

/**
 * Get transactions for a specific user with strict filtering
 */
async function getUserTransactionsSecure(userId, filters = {}) {
  const numericUserId = Number(userId);
  
  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error('Invalid userId provided');
  }

  console.log(`🔒 Secure transaction fetch for userId: ${numericUserId}`);

  const { page = 1, limit = 20, status, provider } = filters;
  const skip = (page - 1) * limit;
  
  const where = {
    userId: {
      equals: numericUserId  // Strict equality check
    }
  };
  
  if (status) where.status = status;
  if (provider) where.provider = provider;

  const transactions = await prisma.transactions.findMany({
    where,
    select: {
      id: true,
      userId: true,
      walletId: true,
      connectedWalletId: true,
      paymentId: true,
      amount: true,
      currency: true,
      provider: true,
      type: true,
      status: true,
      createdAt: true,
      Wallet: {
        select: {
          id: true,
          userId: true,
          balance: true
        }
      },
      connectedWallets: {
        select: {
          id: true,
          provider: true,
          walletId: true,
          accountEmail: true,
          userId: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });

  // Double-check: Filter out any transactions that don't belong to this user
  const userTransactions = transactions.filter(t => t.userId === numericUserId);
  
  console.log(`🔒 Returning ${userTransactions.length} transactions for userId ${numericUserId}`);
  
  if (transactions.length !== userTransactions.length) {
    console.error(`❌ SECURITY ALERT: Query returned ${transactions.length} transactions but only ${userTransactions.length} belong to user ${numericUserId}`);
  }

  return userTransactions.map(t => ({
    id: t.id,
    userId: t.userId,
    walletId: t.walletId || '',
    connectedWalletId: t.connectedWalletId || '',
    paymentId: t.paymentId || '',
    amount: String(t.amount ?? ''),
    currency: t.currency || '',
    provider: t.provider || '',
    type: t.type || '',
    status: t.status || '',
    createdAt: t.createdAt,
  }));
}

/**
 * Get connected wallets for a specific user with strict filtering
 */
async function getUserWalletsSecure(userId) {
  const numericUserId = Number(userId);

  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error('Invalid userId provided');
  }

  console.log(`🔒 Secure wallet fetch for userId: ${numericUserId}`);

  // Use walletService.getUserWallets which returns deduped wallets and includes safe fields
  const walletService = require('../services/walletService');
  const wallets = await walletService.getUserWallets(numericUserId);

  console.log(`🔒 Returning ${wallets.length} wallets for userId: ${numericUserId} (deduped)`);

  return wallets.map(w => ({
    id: w.id,
    provider: w.provider || '',
    walletId: w.walletId || '',
    type: 'EXTERNAL',
    balance: String(w.balance ?? ''),
    currency: w.currency || '',
    isActive: Boolean(w.isActive),
  }));
}

module.exports = {
  getUserTransactionsSecure,
  getUserWalletsSecure
};
