const { PrismaClient } = require('@prisma/client');
const { getUserTransactionsSecure, getUserWalletsSecure } = require('../utils/userDataUtils');

const prisma = new PrismaClient();

// GET /api/transactions - authenticated user's transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log('🔍 getUserTransactions called for userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ data: [], message: 'Authentication required', status_code: 401 });
    }

    // Use secure transaction fetching utility
    const data = await getUserTransactionsSecure(userId);
    
    // Set cache-control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-User-ID': userId,  // Custom header for debugging
      'X-Timestamp': new Date().toISOString()
    });
    
    return res.status(200).json({ 
      data, 
      message: 'User transactions fetched securely', 
      status_code: 200,
      userId: userId,  // Include userId for frontend verification
      timestamp: new Date().toISOString(),  // Add timestamp for cache busting
      count: data.length
    });
  } catch (error) {
    console.error('getUserTransactions error:', error);
    return res.status(500).json({ 
      data: [], 
      message: error.message || 'Failed to fetch transactions', 
      status_code: 500 
    });
  }
};

// Debug endpoint to check current user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log('🔍 getCurrentUser called - userId:', userId);
    console.log('🔍 req.user:', req.user);
    
    if (!userId) {
      return res.status(401).json({ error: 'No user found in token', status_code: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(200).json({ 
      data: user, 
      tokenUserId: userId,
      message: 'Current user fetched', 
      status_code: 200 
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return res.status(500).json({ error: 'Failed to fetch current user', status_code: 500 });
  }
};

// GET /api/wallets - authenticated user's connected wallets
exports.getUserConnectedWallets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log('🔍 getUserConnectedWallets called for userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ data: [], message: 'Authentication required', status_code: 401 });
    }

    // Use secure wallet fetching utility
    const data = await getUserWalletsSecure(userId);

    // Set cache-control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-User-ID': userId,
      'X-Timestamp': new Date().toISOString()
    });

    return res.status(200).json({ 
      data, 
      message: 'User wallets fetched securely', 
      status_code: 200,
      userId: userId,
      timestamp: new Date().toISOString(),
      count: data.length
    });
  } catch (error) {
    console.error('getUserConnectedWallets error:', error);
    return res.status(500).json({ 
      data: [], 
      message: error.message || 'Failed to fetch wallets', 
      status_code: 500 
    });
  }
};

// Endpoint to clear user session data (for frontend cache clearing)
exports.clearUserSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log('🔄 clearUserSession called for userId:', userId);
    
    // Set aggressive no-cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Clear-Site-Data': '"cache", "storage"',
      'X-Session-Cleared': 'true',
      'X-User-ID': userId,
      'X-Timestamp': new Date().toISOString()
    });

    return res.status(200).json({
      message: 'User session cleared successfully',
      userId: userId,
      timestamp: new Date().toISOString(),
      status_code: 200
    });
  } catch (error) {
    console.error('clearUserSession error:', error);
    return res.status(500).json({
      error: 'Failed to clear user session',
      status_code: 500
    });
  }
};
