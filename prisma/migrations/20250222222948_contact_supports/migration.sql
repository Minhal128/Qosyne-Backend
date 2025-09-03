/*
  Warnings:

  - Added the required column `provider` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `provider` ENUM('PAYPAL', 'STRIPE', 'PAYONEER', 'ZELLE', 'CASHAPP', 'VENMO', 'APPLEPAY', 'GOOGLEPAY') NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `dateOfBirth` DATETIME(3) NULL,
    ADD COLUMN `designation` VARCHAR(191) NULL,
    ADD COLUMN `emailNotification` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    ADD COLUMN `smsNotification` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `contactSupports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `transactionId` INTEGER NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contactSupports` ADD CONSTRAINT `contactSupports_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
