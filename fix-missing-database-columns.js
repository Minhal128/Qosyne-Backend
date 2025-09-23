const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMissingColumns() {
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

        // Check and add missing columns for connectedWallets table
        console.log('\n📋 Checking connectedWallets table columns...');
        
        const connectedWalletsColumns = [
            {
                name: 'accessToken',
                definition: 'TEXT NULL',
                description: 'OAuth access token for wallet API'
            },
            {
                name: 'refreshToken',
                definition: 'TEXT NULL',
                description: 'OAuth refresh token for wallet API'
            },
            {
                name: 'paymentMethodToken',
                definition: 'TEXT NULL',
                description: 'Payment method token for transactions'
            },
            {
                name: 'lastSync',
                definition: 'DATETIME(3) NULL',
                description: 'Last synchronization timestamp'
            },
            {
                name: 'capabilities',
                definition: 'TEXT NULL',
                description: 'JSON string of wallet capabilities'
            },
            {
                name: 'createdAt',
                definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
                description: 'Record creation timestamp'
            },
            {
                name: 'updatedAt',
                definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)',
                description: 'Record update timestamp'
            }
        ];

        for (const column of connectedWalletsColumns) {
            await addColumnIfNotExists(connection, 'connectedWallets', column);
        }

        // Check and add missing columns for transactions table
        console.log('\n📋 Checking transactions table columns...');
        
        const transactionsColumns = [
            {
                name: 'rapydPaymentId',
                definition: 'VARCHAR(100) NULL',
                description: 'Rapyd payment ID for tracking'
            },
            {
                name: 'rapydPayoutId',
                definition: 'VARCHAR(100) NULL',
                description: 'Rapyd payout ID for tracking'
            },
            {
                name: 'updatedAt',
                definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)',
                description: 'Record update timestamp'
            },
            {
                name: 'completedAt',
                definition: 'DATETIME(3) NULL',
                description: 'Transaction completion timestamp'
            }
        ];

        for (const column of transactionsColumns) {
            await addColumnIfNotExists(connection, 'transactions', column);
        }

        // Check and add missing columns for users table
        console.log('\n📋 Checking users table columns...');
        
        const usersColumns = [
            {
                name: 'selectedWalletId',
                definition: 'VARCHAR(191) NULL',
                description: 'User selected wallet ID'
            },
            {
                name: 'selectedWalletType',
                definition: 'VARCHAR(191) NULL',
                description: 'User selected wallet type'
            }
        ];

        for (const column of usersColumns) {
            await addColumnIfNotExists(connection, 'users', column);
        }

        console.log('\n✅ All database columns have been checked and updated successfully!');
        console.log('\n🔄 Please run "npx prisma generate" to regenerate the Prisma client.');

    } catch (error) {
        console.error('❌ Error fixing database columns:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

async function addColumnIfNotExists(connection, tableName, column) {
    try {
        // Check if column exists
        const [rows] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ?
        `, [tableName, column.name]);

        if (rows.length === 0) {
            // Column doesn't exist, add it
            console.log(`➕ Adding column ${tableName}.${column.name}...`);
            
            const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`;
            await connection.execute(alterQuery);
            
            console.log(`✅ Successfully added ${tableName}.${column.name} - ${column.description}`);
        } else {
            console.log(`✓ Column ${tableName}.${column.name} already exists`);
        }
    } catch (error) {
        console.error(`❌ Error adding column ${tableName}.${column.name}:`, error.message);
        throw error;
    }
}

// Run the fix
if (require.main === module) {
    fixMissingColumns()
        .then(() => {
            console.log('\n🎉 Database fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Database fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixMissingColumns };
