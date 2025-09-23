-- Add QOSYNE to transactions_provider enum
-- This script safely adds QOSYNE to the transactions_provider enum

-- Check if QOSYNE already exists in the enum
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'transactions' 
AND COLUMN_NAME = 'provider';

-- Add QOSYNE to the enum if it doesn't exist
ALTER TABLE `transactions` 
MODIFY `provider` ENUM(
  'PAYPAL', 
  'GOOGLEPAY', 
  'WISE', 
  'SQUARE', 
  'VENMO', 
  'APPLEPAY', 
  'RAPYD', 
  'STRIPE', 
  'BRAINTREE', 
  'QOSYNE'
) NOT NULL;

-- Verify the change
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'transactions' 
AND COLUMN_NAME = 'provider';
