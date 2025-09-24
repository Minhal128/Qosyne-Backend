const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixUserPassword() {
  console.log('🔐 Adding password to existing user...\n');
  
  try {
    const email = 'test@example.com';
    const password = 'password123'; // Default password
    
    // Find the user
    const user = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: email,
          isDeleted: false,
        },
      },
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    
    // Check if user already has a password
    const existingPassword = await prisma.passwords.findFirst({
      where: { userId: user.id, isEnabled: true },
    });
    
    if (existingPassword) {
      console.log('✅ User already has an active password');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create password record
    await prisma.passwords.create({
      data: {
        userId: user.id,
        password: hashedPassword,
        dateRequested: new Date(),
        isEnabled: true,
      },
    });
    
    console.log(`✅ Password added successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`✅ Verified: ${user.isVerified}`);
    
    // Test login
    console.log('\n🧪 Testing login...');
    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log('Password verification test:', isMatch ? '✅ PASSED' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserPassword();
