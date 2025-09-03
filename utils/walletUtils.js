const axios = require('axios');
const qs = require('qs');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use live URL in production
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// ✅ Function to Get PayPal Access Token
const getPayPalOAuthToken = async () => {
  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      qs.stringify({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_SECRET,
        },
      },
    );

    return response.data.access_token;
  } catch (error) {
    console.error('PayPal OAuth Error:', error.response.data);
    throw new Error('Failed to get PayPal access token');
  }
};


const calculateUserBalance = async (userId) => {
  // 1) Sum of all DEPOSIT transactions (COMPLETED)
  const deposits = await prisma.transactions.aggregate({
    _sum: { amount: true },
    where: {
      userId: userId,
      type: 'DEPOSIT',
      status: 'COMPLETED',
    },
  });

  // 3) Sum of all EXTERNAL_TRANSFER transactions (COMPLETED)
  const externalTransfers = await prisma.transactions.aggregate({
    _sum: { amount: true },
    where: {
      userId: userId,
      type: 'EXTERNAL_TRANSFER',
      status: 'COMPLETED',
    },
  });

  // 4) Calculate the net balance
  //    - Add deposits
  //    - Subtract both external transfers and withdrawals
  const totalDeposits = deposits._sum.amount || 0;
  const totalExternalTransfers = externalTransfers._sum.amount || 0;

  const balance = totalDeposits - totalExternalTransfers;
console.log('balance:', balance);
  return balance;
};

module.exports = { getPayPalOAuthToken, calculateUserBalance };
