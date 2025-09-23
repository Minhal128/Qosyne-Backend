const { PrismaClient } = require('@prisma/client');
const rapydRealService = require('../services/rapydRealService');

const prisma = new PrismaClient();

/**
 * Create real Rapyd wallet for user
 */
exports.createRapydWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phoneNumber, country, nationality } = req.body;

    // Get user details from database
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        status_code: 404
      });
    }

    // Create Rapyd wallet
    const walletData = {
      userId: userId,
      firstName: firstName || user.name.split(' ')[0] || 'User',
      lastName: lastName || user.name.split(' ')[1] || 'Qosyne',
      email: user.email,
      phoneNumber: phoneNumber || '+1234567890',
      country: country || 'US',
      nationality: nationality || 'US'
    };

    console.log(`🔄 Creating Rapyd wallet for user ${userId}...`);
    const rapydResult = await rapydRealService.createUserWallet(walletData);

    if (!rapydResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create Rapyd wallet: ${rapydResult.error}`,
        status_code: 400
      });
    }

    // Save wallet to database
    const connectedWallet = await prisma.connectedWallets.create({
      data: {
        userId: userId,
        provider: 'RAPYD',
        walletId: rapydResult.walletId,
        accountEmail: user.email,
        fullName: `${walletData.firstName} ${walletData.lastName}`,
        currency: 'USD',
        balance: 0.0,
        isActive: true,
        customerId: rapydResult.referenceId
      }
    });

    console.log(`✅ Rapyd wallet created and saved: ${rapydResult.walletId}`);

    res.status(201).json({
      success: true,
      status_code: 201,
      data: {
        wallet: {
          id: connectedWallet.id,
          walletId: rapydResult.walletId,
          provider: 'RAPYD',
          accountEmail: user.email,
          fullName: connectedWallet.fullName,
          currency: 'USD',
          balance: 0.0,
          isActive: true
        }
      },
      message: 'Rapyd wallet created successfully'
    });

  } catch (error) {
    console.error('Error creating Rapyd wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status_code: 500
    });
  }
};

/**
 * Get wallet balance from Rapyd
 */
exports.getRapydWalletBalance = async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.user.userId;

    // Verify wallet belongs to user
    const wallet = await prisma.connectedWallets.findFirst({
      where: {
        walletId: walletId,
        userId: userId,
        provider: 'RAPYD',
        isActive: true
      }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Rapyd wallet not found',
        status_code: 404
      });
    }

    // Get balance from Rapyd
    const balanceResult = await rapydRealService.getWalletBalance(walletId);

    if (!balanceResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to get wallet balance: ${balanceResult.error}`,
        status_code: 400
      });
    }

    // Update database balance
    await prisma.connectedWallets.update({
      where: { id: wallet.id },
      data: { balance: balanceResult.balance }
    });

    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        walletId: walletId,
        balance: balanceResult.balance,
        currency: balanceResult.currency
      },
      message: 'Wallet balance retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting Rapyd wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status_code: 500
    });
  }
};

/**
 * Get admin wallet balance (for admin panel)
 */
exports.getAdminWalletBalance = async (req, res) => {
  try {
    console.log('📊 Getting admin wallet balance...');
    
    const adminWallet = await rapydRealService.getOrCreateAdminWallet();
    const balanceResult = await rapydRealService.getWalletBalance(adminWallet.id);

    if (!balanceResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to get admin wallet balance: ${balanceResult.error}`,
        status_code: 400
      });
    }

    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        adminWalletId: adminWallet.id,
        balance: balanceResult.balance,
        currency: balanceResult.currency,
        feePerTransaction: 0.75
      },
      message: 'Admin wallet balance retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting admin wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status_code: 500
    });
  }
};
