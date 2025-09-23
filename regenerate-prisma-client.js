const { execSync } = require('child_process');
const path = require('path');

async function regeneratePrismaClient() {
  try {
    console.log('🔄 Regenerating Prisma client...');
    
    // Change to the backend directory
    const backendDir = __dirname;
    process.chdir(backendDir);
    
    console.log('📍 Current directory:', process.cwd());
    
    // Generate Prisma client
    console.log('🔧 Running prisma generate...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: backendDir 
    });
    
    console.log('✅ Prisma client regenerated successfully!');
    console.log('📱 The production environment should now use the updated schema');
    console.log('🚀 Redeploy your application to apply the changes');
    
  } catch (error) {
    console.error('❌ Error regenerating Prisma client:', error.message);
    throw error;
  }
}

// Run the regeneration
if (require.main === module) {
  regeneratePrismaClient()
    .then(() => {
      console.log('\n✅ Prisma client regeneration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Prisma client regeneration failed:', error);
      process.exit(1);
    });
}

module.exports = { regeneratePrismaClient };
