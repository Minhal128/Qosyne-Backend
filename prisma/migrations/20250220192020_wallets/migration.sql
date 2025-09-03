/*
  Warnings:

  - A unique constraint covering the columns `[walletId]` on the table `ConnectedWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ConnectedWallet_walletId_key` ON `ConnectedWallet`(`walletId`);
