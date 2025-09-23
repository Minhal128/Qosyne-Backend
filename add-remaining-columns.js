const mysql = require('mysql2/promise');
require('dotenv').config();

async function addRemainingColumns() {
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

        // List of remaining columns to add to transactions table
        const remainingColumns = [
            {
                name: 'estimatedCompletion',
                definition: 'DATETIME(3) NULL',
                description: 'Estimated completion timestamp'
            },
            {
                name: 'failureReason',
                definition: 'TEXT NULL',
                description: 'Reason for transaction failure'
            }
        ];

        console.log('\n📋 Adding remaining columns to transactions table...');

        for (const column of remainingColumns) {
            await addColumnIfNotExists(connection, 'transactions', column);
        }

        console.log('\n✅ All remaining columns have been added successfully!');

    } catch (error) {
        console.error('❌ Error adding remaining columns:', error);
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
    addRemainingColumns()
        .then(() => {
            console.log('\n🎉 Remaining columns fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Remaining columns fix failed:', error);
            process.exit(1);
        });
}

module.exports = { addRemainingColumns };
