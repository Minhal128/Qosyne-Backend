const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple getAllTransactions that works with basic schema
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Basic query without complex fields
    const transactions = await prisma.transactions.findMany({
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        provider: true,
        type: true,
        status: true,
        createdAt: true,
        paymentId: true
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: skip,
      take: parseInt(limit),
    });

    const totalTransactions = await prisma.transactions.count();

    res.status(200).json({
      message: 'All transactions fetched successfully',
      data: { 
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTransactions / parseInt(limit)),
          totalCount: totalTransactions,
          hasNextPage: parseInt(page) < Math.ceil(totalTransactions / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      },
      status_code: 200,
    });
  } catch (err) {
    console.error('getAllTransactions failed:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      status_code: 500 
    });
  }
};

// Simple getTransactionStats that works with basic schema
exports.getTransactionStats = async (req, res) => {
  try {
    // Get basic counts only
    const totalTransactions = await prisma.transactions.count();

    // Get status counts
    const statusStats = await prisma.transactions.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get provider counts
    const providerStats = await prisma.transactions.groupBy({
      by: ['provider'],
      _count: {
        id: true,
      },
    });

    // Get type counts
    const typeStats = await prisma.transactions.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    // Get total amount (basic sum)
    const totalAmountResult = await prisma.transactions.aggregate({
      _sum: {
        amount: true,
      },
    });

    res.status(200).json({
      message: 'Transaction statistics fetched successfully',
      data: {
        totalTransactions,
        recentTransactions: totalTransactions, // Simple fallback
        totalAmount: totalAmountResult._sum.amount || 0,
        totalFees: 0, // Skip fees since column doesn't exist
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {}),
        providerBreakdown: providerStats.reduce((acc, stat) => {
          acc[stat.provider] = stat._count.id;
          return acc;
        }, {}),
        typeBreakdown: typeStats.reduce((acc, stat) => {
          acc[stat.type] = stat._count.id;
          return acc;
        }, {}),
      },
      status_code: 200,
    });
  } catch (err) {
    console.error('getTransactionStats failed:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      status_code: 500 
    });
  }
};
