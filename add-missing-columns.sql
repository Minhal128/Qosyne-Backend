-- Add missing columns to users table if they don't exist
-- This script is safe to run multiple times

-- Check if selectedWalletId column exists, if not add it
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE users ADD COLUMN selectedWalletId VARCHAR(191) NULL;',
        'SELECT "selectedWalletId column already exists";'
    )
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'selectedWalletId'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if selectedWalletType column exists, if not add it
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE users ADD COLUMN selectedWalletType VARCHAR(191) NULL;',
        'SELECT "selectedWalletType column already exists";'
    )
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'selectedWalletType'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
