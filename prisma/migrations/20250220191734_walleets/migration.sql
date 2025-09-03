/*
  Warnings:

  - Added the required column `accountEmail` to the `ConnectedWallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ConnectedWallet` ADD COLUMN `accountEmail` VARCHAR(191) NOT NULL,
    ADD COLUMN `fullName` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `username` VARCHAR(191) NULL,
    MODIFY `provider` ENUM('PAYPAL', 'STRIPE', 'PAYONEER', 'ZELLE', 'CASHAPP', 'VENMO', 'APPLEPAY', 'GOOGLEPAY') NOT NULL;
