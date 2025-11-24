/**
 * TEST SCRIPT - Square connect conflict checker
 *
 * This script simulates the case where a Square merchant's walletId
 * already exists in the database and belongs to another user. It mirrors
 * the checks implemented in routes/squareInvoiceRoutes.js and prints the
 * expected outcome. This script is *guarded* — it will not touch the DB
 * unless you explicitly set RUN_DB_TESTS=true in your environment.
 *
 * Usage (powershell):
 *   $env:RUN_DB_TESTS = 'true'
 *   node scripts/test-square-connect-check.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  if (process.env.RUN_DB_TESTS !== 'true') {
    console.log('RUN_DB_TESTS is not set to "true". This script is safe by default — set RUN_DB_TESTS=true to actually run tests that touch the database.');
    return process.exit(0);
  }

  try {
    // Choose some demo values — change them if needed
    const existingUserId = 1001; // assume this user has already connected the merchant
    const attemptUserId = 2002; // we'd like to connect using a different user
    const merchantId = 'TEST_MERCHANT_FOR_CONFLICT_CHECK';

    // Ensure a wallet exists for existingUserId
    let existing = await prisma.connectedWallets.findUnique({ where: { walletId: merchantId } });
    if (!existing) {
      existing = await prisma.connectedWallets.create({
        data: {
          userId: existingUserId,
          provider: 'SQUARE',
          walletId: merchantId,
          accountEmail: 'owner@example.com',
          username: 'owner@example.com',
          accessToken: 'test-token',
          currency: 'USD',
          isActive: true,
          updatedAt: new Date(),
        },
      });
      console.log('Created demo existing wallet for user', existingUserId, 'with walletId', merchantId);
    } else {
      console.log('Demo existing wallet already present for walletId', merchantId, 'userId', existing.userId);
    }

    // Now simulate behavior of connect endpoint when attemptUserId tries to connect same merchant
    const found = await prisma.connectedWallets.findUnique({ where: { walletId: merchantId } });
    if (found && found.userId !== attemptUserId) {
      console.log('EXPECTED: Conflict — walletId already registered by another user -> should return 409 and not reassign');
    } else if (found && found.userId === attemptUserId) {
      console.log('EXPECTED: Update existing wallet for same user — update access token etc');
    } else {
      console.log('EXPECTED: Safe to create new connectedWallet entry for this merchantId');
    }

  } catch (err) {
    console.error('Error during test:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
