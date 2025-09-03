/*
  Warnings:

  - You are about to drop the `ConnectedWallet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `transferType` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ConnectedWallet` DROP FOREIGN KEY `ConnectedWallet_userId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_connectedWalletId_fkey`;

-- DropIndex
DROP INDEX `transactions_connectedWalletId_fkey` ON `transactions`;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `transferType` ENUM('bank', 'wallet') NOT NULL;

-- DropTable
DROP TABLE `ConnectedWallet`;

-- CreateTable
CREATE TABLE `connectedWallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `provider` ENUM('PAYPAL', 'STRIPE', 'PAYONEER', 'ZELLE', 'CASHAPP', 'VENMO', 'APPLEPAY', 'GOOGLEPAY', 'WISE') NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `accountEmail` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0.0,
    `currency` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `connectedWallets_walletId_key`(`walletId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactionRecipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `recipientWalletId` VARCHAR(100) NULL,
    `recipientIban` VARCHAR(100) NULL,
    `recipientName` VARCHAR(255) NULL,
    `recipientEmail` VARCHAR(255) NULL,
    `recipientBankName` VARCHAR(255) NULL,
    `recipientAccount` VARCHAR(255) NULL,

    UNIQUE INDEX `transactionRecipients_transactionId_key`(`transactionId`),
    INDEX `transactionRecipients_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `connectedWallets` ADD CONSTRAINT `connectedWallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_connectedWalletId_fkey` FOREIGN KEY (`connectedWalletId`) REFERENCES `connectedWallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactionRecipients` ADD CONSTRAINT `transactionRecipients_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
