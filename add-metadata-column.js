const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMetadataColumn() {
    let connection;
    
    try {
        // Parse DATABASE_URL
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        // Parse the connection string
        const url = new URL(databaseUrl);
        const connectionConfig = {
            host: url.hostname,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            port: parseInt(url.port) || 3306,
            ssl: url.hostname.includes('ondigitalocean.com') ? { rejectUnauthorized: false } : false
        };

        console.log(`🔗 Connecting to database: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);

        // Create database connection
        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connected to database');

        // Check if metadata column exists
        const [rows] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'transactions' 
            AND COLUMN_NAME = 'metadata'
        `);

        if (rows.length === 0) {
            // Column doesn't exist, add it
            console.log('➕ Adding metadata column to transactions table...');
            
            const alterQuery = `ALTER TABLE transactions ADD COLUMN metadata TEXT NULL`;
            await connection.execute(alterQuery);
            
            console.log('✅ Successfully added transactions.metadata column');
        } else {
            console.log('✓ Column transactions.metadata already exists');
        }

        console.log('\n✅ Metadata column check completed successfully!');

    } catch (error) {
        console.error('❌ Error adding metadata column:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
if (require.main === module) {
    addMetadataColumn()
        .then(() => {
            console.log('\n🎉 Metadata column fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Metadata column fix failed:', error);
            process.exit(1);
        });
}

module.exports = { addMetadataColumn };
