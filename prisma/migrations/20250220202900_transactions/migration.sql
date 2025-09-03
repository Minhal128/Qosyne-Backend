/*
  Warnings:

  - You are about to drop the column `receiverId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `userId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_receiverId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_senderId_fkey`;

-- DropIndex
DROP INDEX `transactions_receiverId_idx` ON `transactions`;

-- DropIndex
DROP INDEX `transactions_senderId_idx` ON `transactions`;

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `receiverId`,
    DROP COLUMN `senderId`,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `transactions_userId_idx` ON `transactions`(`userId`);

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
