const { PrismaClient } = require('@prisma/client');

async function addOAuthStatesTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Adding OAuth states table...');
    
    // Create the OAuth states table using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS OAuthStates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        provider ENUM('WISE', 'VENMO', 'SQUARE', 'PAYPAL', 'GOOGLEPAY') NOT NULL,
        state VARCHAR(255) NOT NULL UNIQUE,
        redirectUri TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE),
        UNIQUE KEY userId_provider (userId, provider),
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `;
    
    console.log('✅ OAuth states table created successfully');
    
    // Add index for better performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON OAuthStates(state)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON OAuthStates(expiresAt)
    `;
    
    console.log('✅ OAuth states table indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating OAuth states table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  addOAuthStatesTable()
    .then(() => {
      console.log('🎉 OAuth states table migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 OAuth states table migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addOAuthStatesTable };
