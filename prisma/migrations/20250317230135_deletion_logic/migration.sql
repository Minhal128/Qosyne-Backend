/*
  Warnings:

  - A unique constraint covering the columns `[email,isDeleted]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- AlterTable
ALTER TABLE `users` MODIFY `isDeleted` BOOLEAN NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `email_isDeleted_UNIQUE` ON `users`(`email`, `isDeleted`);
