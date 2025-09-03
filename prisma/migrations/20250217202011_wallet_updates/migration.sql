/*
  Warnings:

  - Added the required column `type` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_receiverId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_walletId_fkey`;

-- DropIndex
DROP INDEX `transactions_walletId_fkey` ON `transactions`;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `connectedWalletId` INTEGER NULL,
    ADD COLUMN `type` ENUM('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'EXTERNAL_TRANSFER') NOT NULL,
    MODIFY `receiverId` INTEGER NULL,
    MODIFY `walletId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ConnectedWallet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `provider` ENUM('PAYPAL', 'STRIPE', 'PAYONEER', 'ZELLE', 'CASHAPP', 'VENMO', 'APPLEPAY') NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0.0,
    `currency` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConnectedWallet` ADD CONSTRAINT `ConnectedWallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_connectedWalletId_fkey` FOREIGN KEY (`connectedWalletId`) REFERENCES `ConnectedWallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
