const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listExistingUsers() {
  console.log('📋 Listing all existing users in the database...\n');
  
  try {
    // Get all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        isVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit to last 20 users
    });
    
    console.log(`Total users found: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found in the database!');
      console.log('You may need to register a user first.');
    } else {
      console.log('📋 Recent users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Deleted: ${user.isDeleted}`);
        console.log(`   Verified: ${user.isVerified}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
      
      // Check for test users specifically
      const testUsers = users.filter(user => 
        user.email.includes('test') || user.email.includes('example')
      );
      
      if (testUsers.length > 0) {
        console.log('🧪 Test users found:');
        testUsers.forEach(user => {
          console.log(`   - ${user.email} (ID: ${user.id}, Verified: ${user.isVerified})`);
        });
      }
    }
    
    // Check if there are any users with passwords
    console.log('\n🔐 Checking users with passwords...');
    const usersWithPasswords = await prisma.users.findMany({
      where: {
        passwords: {
          some: {
            isEnabled: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        isVerified: true,
        passwords: {
          where: {
            isEnabled: true
          },
          select: {
            id: true,
            dateRequested: true
          }
        }
      }
    });
    
    console.log(`Users with active passwords: ${usersWithPasswords.length}`);
    usersWithPasswords.forEach(user => {
      console.log(`   - ${user.email} (Verified: ${user.isVerified})`);
    });

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listExistingUsers();
