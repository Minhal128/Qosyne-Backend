/*
  Warnings:

  - The values [STRIPE,PAYONEER,ZELLE,CASHAPP,QOSYNE] on the enum `transactions_provider` will be removed. If these variants are still used in the database, this will fail.
  - The values [CAPTURED] on the enum `transactions_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [STRIPE,PAYONEER,ZELLE,CASHAPP,QOSYNE] on the enum `transactions_provider` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `connectedWallets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `connectedwallets` ADD COLUMN `accessToken` TEXT NULL,
    ADD COLUMN `capabilities` TEXT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastSync` DATETIME(3) NULL,
    ADD COLUMN `refreshToken` TEXT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `provider` ENUM('PAYPAL', 'GOOGLEPAY', 'WISE', 'SQUARE', 'VENMO', 'APPLEPAY', 'RAPYD') NOT NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `estimatedCompletion` DATETIME(3) NULL,
    ADD COLUMN `failureReason` TEXT NULL,
    ADD COLUMN `fees` DECIMAL(65, 30) NOT NULL DEFAULT 0.0,
    ADD COLUMN `metadata` TEXT NULL,
    ADD COLUMN `rapydPaymentId` VARCHAR(100) NULL,
    ADD COLUMN `rapydPayoutId` VARCHAR(100) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    MODIFY `type` ENUM('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'EXTERNAL_TRANSFER', 'PEER_TO_PEER') NOT NULL,
    MODIFY `provider` ENUM('PAYPAL', 'GOOGLEPAY', 'WISE', 'SQUARE', 'VENMO', 'APPLEPAY', 'RAPYD') NOT NULL;

-- CreateTable
CREATE TABLE `qrCodes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `qrId` VARCHAR(191) NOT NULL,
    `type` ENUM('BANK_DEPOSIT', 'WALLET_CONNECT', 'PAYMENT_REQUEST') NOT NULL,
    `payload` TEXT NOT NULL,
    `amount` DECIMAL(65, 30) NULL,
    `currency` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'SCANNED', 'EXPIRED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `scanCount` INTEGER NOT NULL DEFAULT 0,
    `lastScanned` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qrCodes_qrId_key`(`qrId`),
    INDEX `qrCodes_userId_idx`(`userId`),
    INDEX `qrCodes_qrId_idx`(`qrId`),
    INDEX `qrCodes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `transactions_status_idx` ON `transactions`(`status`);

-- CreateIndex
CREATE INDEX `transactions_createdAt_idx` ON `transactions`(`createdAt`);

-- AddForeignKey
ALTER TABLE `qrCodes` ADD CONSTRAINT `qrCodes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
