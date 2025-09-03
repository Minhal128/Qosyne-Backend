const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAdminDashboardStats = async (req, res) => {
  const totalUser = await prisma.users.findMany({
    where: { isDeleted: false },
    select: { id: true }
  });
  const unverifiedAccount = await prisma.users.findMany({
    where: { isVerified: false, isDeleted: false },
    select: { id: true }
  });

  const totalTransaction = await prisma.transactions.findMany({
    select: { id: true }
  });

  const declineTransactions = await prisma.transactions.findMany({
    where: { status: 'FAILED' },
    select: { id: true }
  });

  const totalEarningsResult = await prisma.transactions.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amount: true }
  });

  const totalEarnings = totalEarningsResult._sum.amount || 0;

  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const lastMonthEarningsResult = await prisma.transactions.aggregate({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: lastMonthStart }
    },
    _sum: { amount: true }
  });

  const lastMonthEarnings = lastMonthEarningsResult._sum.amount || 0;

  return res.status(200).json({
    message: 'Dashboard stats fetched',
    status_code: 200,
    data: {
      totalUser,
      totalTransaction,
      declineTransactions,
      unverifiedAccount,
      totalEarnings,
      lastMonthEarnings
    }
  });
};
