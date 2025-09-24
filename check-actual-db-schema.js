const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseSchema() {
  console.log('🔍 Checking actual database schema...');
  
  let connection;
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    console.log('Database URL (masked):', dbUrl.replace(/:[^:@]*@/, ':****@'));
    
    const url = new URL(dbUrl);
    
    connection = await mysql.createConnection({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ Connected to database');
    
    // Check transactions table structure
    console.log('\n📋 Checking transactions table columns...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions'
      ORDER BY ORDINAL_POSITION
    `, [url.pathname.slice(1)]);
    
    console.log('Transactions table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ', nullable' : ', required'})`);
    });
    
    // Check connectedWallets table structure
    console.log('\n📋 Checking connectedWallets table columns...');
    const [walletColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'connectedWallets'
      ORDER BY ORDINAL_POSITION
    `, [url.pathname.slice(1)]);
    
    console.log('ConnectedWallets table columns:');
    walletColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ', nullable' : ', required'})`);
    });
    
    // Check users table structure
    console.log('\n📋 Checking users table columns...');
    const [userColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, [url.pathname.slice(1)]);
    
    console.log('Users table columns:');
    userColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ', nullable' : ', required'})`);
    });
    
    // Check if specific problematic columns exist
    const problematicColumns = ['description', 'fees', 'rapydPaymentId', 'rapydPayoutId', 'metadata', 'completedAt'];
    console.log('\n🔍 Checking for problematic columns in transactions table...');
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    problematicColumns.forEach(colName => {
      const exists = existingColumns.includes(colName);
      console.log(`  ${exists ? '✅' : '❌'} ${colName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseSchema();
