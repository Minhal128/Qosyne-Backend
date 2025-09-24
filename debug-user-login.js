const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUserLogin() {
  console.log('🔍 Debugging user login for test128@example...\n');
  
  try {
    // Test 1: Check if user exists with simple email search
    console.log('1️⃣ Testing simple email search...');
    const userByEmail = await prisma.users.findMany({
      where: {
        email: 'test128@example'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        isVerified: true,
        createdAt: true
      }
    });
    
    console.log('Users found with email "test128@example":', userByEmail.length);
    if (userByEmail.length > 0) {
      userByEmail.forEach((user, index) => {
        console.log(`  User ${index + 1}:`, {
          id: user.id,
          name: user.name,
          email: user.email,
          isDeleted: user.isDeleted,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        });
      });
    }

    // Test 2: Check with composite constraint (the way login function does it)
    console.log('\n2️⃣ Testing composite constraint search (login method)...');
    try {
      const userByComposite = await prisma.users.findUnique({
        where: {
          email_isDeleted: {
            email: 'test128@example',
            isDeleted: false,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          isDeleted: true,
          isVerified: true
        }
      });
      
      console.log('User found with composite constraint:', userByComposite ? 'YES' : 'NO');
      if (userByComposite) {
        console.log('User details:', userByComposite);
      }
    } catch (error) {
      console.error('❌ Composite constraint search failed:', error.message);
    }

    // Test 3: Check all users with similar email patterns
    console.log('\n3️⃣ Checking for similar email patterns...');
    const similarUsers = await prisma.users.findMany({
      where: {
        email: {
          contains: 'test128'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        isVerified: true
      }
    });
    
    console.log('Users with similar email patterns:', similarUsers.length);
    similarUsers.forEach((user, index) => {
      console.log(`  Similar user ${index + 1}:`, user);
    });

    // Test 4: Check database schema for email_isDeleted constraint
    console.log('\n4️⃣ Checking database constraints...');
    try {
      const constraints = await prisma.$queryRaw`
        SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE()
      `;
      console.log('Database constraints on users table:', constraints);
    } catch (error) {
      console.log('Could not fetch constraints:', error.message);
    }

    // Test 5: Try alternative login approach
    console.log('\n5️⃣ Testing alternative login approach...');
    const alternativeUser = await prisma.users.findFirst({
      where: {
        email: 'test128@example',
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        isVerified: true
      }
    });
    
    console.log('Alternative approach result:', alternativeUser ? 'FOUND' : 'NOT FOUND');
    if (alternativeUser) {
      console.log('User details:', alternativeUser);
      
      // Check if user has a password
      const userPassword = await prisma.passwords.findFirst({
        where: { userId: alternativeUser.id, isEnabled: true },
        orderBy: { dateRequested: 'desc' },
      });
      
      console.log('User has active password:', userPassword ? 'YES' : 'NO');
      console.log('User is verified:', alternativeUser.isVerified ? 'YES' : 'NO');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserLogin();
