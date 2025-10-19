const { PrismaClient } = require('@prisma/client');
const rapydRealService = require('./rapydRealService');

class RapydWalletMapper {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a Rapyd e-wallet for a connected wallet
   * This should be called when a user connects a new wallet
   */
  async createRapydWalletForConnectedWallet(connectedWalletId, userDetails = {}) {
    try {
      const connectedWallet = await this.prisma.connectedWallets.findUnique({
        where: { id: connectedWalletId },
        include: { users: true }
      });

      if (!connectedWallet) {
        throw new Error(`Connected wallet ${connectedWalletId} not found`);
      }

      // Generate a unique reference ID for Rapyd
      const rapydReferenceId = `${connectedWallet.provider.toLowerCase()}_${connectedWallet.userId}_${connectedWallet.id}_${Date.now()}`;

      // Create Rapyd e-wallet
      const rapydWalletData = {
        first_name: userDetails.firstName || connectedWallet.users.name?.split(' ')[0] || 'User',
        last_name: userDetails.lastName || connectedWallet.users.name?.split(' ').slice(1).join(' ') || connectedWallet.userId.toString(),
        email: userDetails.email || connectedWallet.users.email,
        ewallet_reference_id: rapydReferenceId,
        type: 'person',
        metadata: {
          user_id: connectedWallet.userId.toString(),
          connected_wallet_id: connectedWalletId.toString(),
          provider: connectedWallet.provider,
          purpose: 'user_wallet'
        },
        contact: {
          phone_number: userDetails.phoneNumber || '+1234567890', // Default or user provided
          email: userDetails.email || connectedWallet.users.email,
          first_name: userDetails.firstName || connectedWallet.users.name?.split(' ')[0] || 'User',
          last_name: userDetails.lastName || connectedWallet.users.name?.split(' ').slice(1).join(' ') || connectedWallet.userId.toString(),
          country: userDetails.country || 'US'
        }
      };

      console.log(`🔄 Creating Rapyd e-wallet for ${connectedWallet.provider} wallet (ID: ${connectedWalletId})`);
      
      const rapydWallet = await rapydRealService.makeRapydRequest('POST', '/user', rapydWalletData);

      // Update the connected wallet with Rapyd reference ID
      // Using existing fields as workaround until schema is updated
      await this.prisma.connectedWallets.update({
        where: { id: connectedWalletId },
        data: {
          // Workaround: Store Rapyd data in existing fields
          customerId: rapydWallet.id, // Store rapydWalletId in customerId field
          accessToken: rapydReferenceId // Store rapydReferenceId in accessToken field
        }
      });

      console.log(`✅ Rapyd e-wallet created successfully: ${rapydWallet.id} (${rapydReferenceId})`);

      return {
        rapydWalletId: rapydWallet.id,
        rapydReferenceId: rapydReferenceId,
        status: rapydWallet.status
      };

    } catch (error) {
      console.error(`❌ Failed to create Rapyd wallet for connected wallet ${connectedWalletId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Rapyd wallet reference ID for a connected wallet
   * Maps database wallet ID to Rapyd wallet reference ID
   */
  async getRapydWalletId(connectedWalletId) {
    try {
      const connectedWallet = await this.prisma.connectedWallets.findUnique({
        where: { id: connectedWalletId },
        select: { 
          id: true,
          provider: true,
          userId: true,
          customerId: true, // This stores rapydWalletId
          accessToken: true, // This stores rapydReferenceId
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!connectedWallet) {
        throw new Error(`Connected wallet ${connectedWalletId} not found`);
      }

      // If Rapyd wallet already exists, return it (using accessToken as workaround)
      if (connectedWallet.accessToken && connectedWallet.accessToken.includes('_')) {
        // Check if accessToken looks like a Rapyd reference ID (contains underscores)
        return connectedWallet.accessToken;
      }

      // If no Rapyd wallet exists, create one
      console.log(`🔄 No Rapyd wallet found for connected wallet ${connectedWalletId}, creating one...`);
      
      const rapydWallet = await this.createRapydWalletForConnectedWallet(connectedWalletId, {
        email: connectedWallet.users.email,
        firstName: connectedWallet.users.name?.split(' ')[0] || 'User',
        lastName: connectedWallet.users.name?.split(' ').slice(1).join(' ') || connectedWallet.userId.toString()
      });

      return rapydWallet.rapydReferenceId;

    } catch (error) {
      console.error(`❌ Failed to get Rapyd wallet ID for connected wallet ${connectedWalletId}:`, error.message);
      throw error;
    }
  }

  /**
   * Map multiple wallet IDs to Rapyd reference IDs
   */
  async mapWalletIdsToRapydIds(walletIds) {
    const mappings = {};
    
    for (const walletId of walletIds) {
      try {
        mappings[walletId] = await this.getRapydWalletId(walletId);
      } catch (error) {
        console.error(`Failed to map wallet ${walletId}:`, error.message);
        mappings[walletId] = null;
      }
    }

    return mappings;
  }

  /**
   * Get wallet details for transfer (includes both database info and Rapyd mapping)
   */
  async getWalletForTransfer(walletId, userId = null) {
    try {
      // Validate walletId is provided
      if (!walletId || walletId === 'undefined' || walletId === 'null') {
        throw new Error('Wallet ID is required and cannot be null or undefined');
      }

      // Handle both database ID and walletId string
      let whereClause = { isActive: true };
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      // Try to parse as database ID first
      const parsedId = parseInt(walletId);
      if (!isNaN(parsedId) && parsedId > 0) {
        whereClause.id = parsedId;
      } else {
        // If not a valid integer, search by walletId string
        whereClause.walletId = walletId;
      }

      const connectedWallet = await this.prisma.connectedWallets.findFirst({
        where: whereClause,
        include: { users: true }
      });

      if (!connectedWallet) {
        throw new Error(`Wallet not found for ID: ${walletId}`);
      }

      const rapydReferenceId = await this.getRapydWalletId(walletId);

      return {
        id: connectedWallet.id,
        provider: connectedWallet.provider,
        walletId: connectedWallet.walletId,
        rapydReferenceId,
        userId: connectedWallet.userId,
        accountEmail: connectedWallet.accountEmail,
        fullName: connectedWallet.fullName,
        currency: connectedWallet.currency,
        user: connectedWallet.users
      };

    } catch (error) {
      console.error(`❌ Failed to get wallet for transfer ${walletId}:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = new RapydWalletMapper();