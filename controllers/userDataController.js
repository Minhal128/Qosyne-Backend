const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/transactions - authenticated user's transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const numericUserId = Number(req.user?.userId);
    if (!numericUserId || Number.isNaN(numericUserId)) {
      return res.status(401).json({ data: [], message: 'Invalid authenticated user id', status_code: 401 });
    }

    const transactions = await prisma.transactions.findMany({
      where: { userId: numericUserId },
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
            accountEmail: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = transactions.map((t) => ({
      id: t.id,
      userId: t.Wallet ? t.Wallet.userId : t.userId,
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

    return res.status(200).json({ data, message: 'User transactions fetched', status_code: 200 });
  } catch (error) {
    console.error('getUserTransactions error:', error);
    return res.status(500).json({ data: [], message: 'Failed to fetch transactions', status_code: 500 });
  }
};

// GET /api/wallets - authenticated user's connected wallets
exports.getUserConnectedWallets = async (req, res) => {
  try {
    const numericUserId = Number(req.user?.userId);
    if (!numericUserId || Number.isNaN(numericUserId)) {
      return res.status(401).json({ data: [], message: 'Invalid authenticated user id', status_code: 401 });
    }

    const wallets = await prisma.connectedWallets.findMany({
      where: { userId: numericUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        walletId: true,
        balance: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const data = wallets.map((w) => ({
      id: w.id,
      provider: w.provider || '',
      walletId: w.walletId || '',
      type: 'EXTERNAL',
      balance: String(w.balance ?? ''),
      currency: w.currency || '',
      isActive: Boolean(w.isActive),
    }));

    return res.status(200).json({ data, message: 'User wallets fetched', status_code: 200 });
  } catch (error) {
    console.error('getUserConnectedWallets error:', error);
    return res.status(500).json({ data: [], message: 'Failed to fetch wallets', status_code: 500 });
  }
};


