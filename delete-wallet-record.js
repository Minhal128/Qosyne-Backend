const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteWalletRecord() {
  try {
    console.log('Attempting to delete wallet record with id = 17...');
    
    // First, let's check if the record exists
    const existingWallet = await prisma.connectedWallets.findUnique({
      where: { id: 17 }
    });
    
    if (!existingWallet) {
      console.log('❌ No wallet record found with id = 17');
      return;
    }
    
    console.log('📋 Found wallet record:', {
      id: existingWallet.id,
      provider: existingWallet.provider,
      walletId: existingWallet.walletId,
      accountEmail: existingWallet.accountEmail,
      userId: existingWallet.userId
    });
    
    // Delete the record
    const deletedWallet = await prisma.connectedWallets.delete({
      where: { id: 17 }
    });
    
    console.log('✅ Successfully deleted wallet record with id = 17');
    console.log('🗑️  Deleted record details:', {
      id: deletedWallet.id,
      provider: deletedWallet.provider,
      walletId: deletedWallet.walletId,
      accountEmail: deletedWallet.accountEmail
    });
    
  } catch (error) {
    console.error('❌ Error deleting wallet record:', error.message);
    
    if (error.code === 'P2025') {
      console.log('💡 The record with id = 17 does not exist or has already been deleted.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteWalletRecord();
