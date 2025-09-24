const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTest128User() {
  console.log('👤 Creating test128@example user...\n');
  
  try {
    const email = 'test128@example';
    const name = 'Test User 128';
    const password = 'password123';
    
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: email,
          isDeleted: false,
        },
      },
    });
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email);
      return;
    }
    
    // Create the user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        role: 'USER',
        isVerified: true, // Set as verified for testing
        isDeleted: false,
        updatedAt: new Date(),
      },
    });
    
    console.log(`✅ User created: ${user.name} (${user.email})`);
    
    // Create wallet for the user
    await prisma.wallet.create({
      data: { userId: user.id, balance: 0.0 },
    });
    
    console.log('✅ Wallet created for user');
    
    // Hash and store password
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.passwords.create({
      data: {
        userId: user.id,
        password: hashedPassword,
        dateRequested: new Date(),
        isEnabled: true,
      },
    });
    
    console.log('✅ Password set for user');
    
    // Create Qosyne wallet connection
    await prisma.connectedWallets.create({
      data: {
        userId: user.id,
        provider: 'QOSYNE',
        walletId: `qosyne_${user.id}`,
        accountEmail: email,
        fullName: name,
        currency: 'USD',
        updatedAt: new Date(),
      },
    });
    
    console.log('✅ Qosyne wallet connected');
    
    console.log('\n🎉 User setup complete!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`✅ Verified: true`);
    console.log(`💰 Wallet: Created with $0.00 balance`);
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTest128User();
