/*
  Warnings:

  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `deviceType` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `referer` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `shopDomain` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Session` table. All the data in the column will be lost.
  - You are about to alter the column `userId` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `String` to `BigInt`.
  - Added the required column `shop` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "PixelSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT,
    "userId" BIGINT
);
INSERT INTO "new_Session" ("id", "userId") SELECT "id", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PixelSession_sessionId_key" ON "PixelSession"("sessionId");

-- CreateIndex
CREATE INDEX "PixelSession_shopDomain_startedAt_idx" ON "PixelSession"("shopDomain", "startedAt");

-- CreateIndex
CREATE INDEX "PixelSession_userId_idx" ON "PixelSession"("userId");
