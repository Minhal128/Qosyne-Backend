const { PrismaClient } = require('@prisma/client');
const { calculateUserBalance } = require('../utils/walletUtils');

const prisma = new PrismaClient();

// ✅ Get Wallet Balance (Uses userId from token)
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1) Sum of all DEPOSIT transactions for this user
    const balance = await calculateUserBalance(userId);
    
    return res.status(200).json({
      data: { balance },
      message: 'Wallet balance fetched successfully',
      status_code: 200,
    });
  } catch (err) {
    console.error('getBalance error:', err);
    return res.status(500).json({
      error: 'Failed to calculate wallet balance',
      status_code: 500,
    });
  }
};

// Add a helper function to format provider names
const formatProviderName = (provider) => {
  switch (provider.toUpperCase()) {
    case 'PAYPAL':
      return 'PayPal';
    case 'GOOGLEPAY':
      return 'Google Pay';
    case 'SQUARE':
      return 'Square';
    case 'WISE':
      return 'Wise';
    case 'VENMO':
      return 'Venmo';
    case 'APPLEPAY':
      return 'Apple Pay';
    case 'RAPYD':
      return 'Rapyd';
    default:
      // If we don't have a specific mapping, capitalize first letter of each word
      return provider
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

exports.getConnectedWallets = async (req, res) => {
  try {
    const numericUserId = Number(req.user.userId);
    if (!numericUserId || Number.isNaN(numericUserId)) {
      return res.status(401).json({
        data: [],
        message: 'Invalid authenticated user id',
        status_code: 401,
      });
    }
    
    // Fetch user's external connected wallets from the new system
    let externalWallets = await prisma.connectedWallets.findMany({
      where: { userId: numericUserId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Fallback: if none found, try without isActive filter to include legacy rows
    if (externalWallets.length === 0) {
      externalWallets = await prisma.connectedWallets.findMany({
        where: { userId: numericUserId },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Format the wallets for response
    const wallets = externalWallets.map((cw) => ({
      id: cw.id,
      provider: formatProviderName(cw.provider),
      type: 'EXTERNAL',
      walletId: cw.walletId,
      accountEmail: cw.accountEmail,
      fullName: cw.fullName,
      username: cw.username,
      balance: cw.balance,
      currency: cw.currency,
      isActive: cw.isActive,
      lastSync: cw.lastSync,
      capabilities: cw.capabilities ? JSON.parse(cw.capabilities) : []
    }));

    // 4) Return combined wallets array
    res.status(200).json({
      data: wallets,
      message: 'Connected wallets fetched successfully',
      status_code: 200,
    });
  } catch (error) {
    console.error('Error fetching connected wallets:', error);
    res.status(500).json({
      error: 'Failed to fetch wallets',
      status_code: 500,
    });
  }
};

// Redirect to new wallet integration system
exports.connectWallet = async (req, res) => {
  return res.status(301).json({
    message: 'Please use the new wallet integration system at /api/wallet-integration/wallets/connect',
    redirect: '/api/wallet-integration/wallets/connect',
    status_code: 301,
  });
};

// Redirect to new wallet integration system
exports.deposit = async (req, res) => {
  return res.status(301).json({
    message: 'Please use the new wallet integration system for deposits',
    redirect: '/api/wallet-integration/transactions/transfer',
    status_code: 301,
  });
};

// Redirect to new wallet integration system
exports.withdraw = async (req, res) => {
  return res.status(301).json({
    message: 'Please use the new wallet integration system for withdrawals',
    redirect: '/api/wallet-integration/transactions/transfer',
    status_code: 301,
  });
};

// Redirect to new wallet integration system
exports.sendMoney = async (req, res) => {
  return res.status(301).json({
    message: 'Please use the new wallet integration system for transfers',
    redirect: '/api/wallet-integration/transactions/transfer',
    status_code: 301,
  });
};
