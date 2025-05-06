/*
  Warnings:

  - You are about to drop the `PixelEvent` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `accessToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `accountOwner` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `collaborator` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Session` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `sessionId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopDomain` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PixelEvent";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ShopifyEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventName" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "sessionId" TEXT,
    "clientIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "referringProduct" TEXT,
    "referringCollection" TEXT,
    "viewDuration" INTEGER,
    "deviceType" TEXT,
    "viewedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CartEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopDomain" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "totalPrice" REAL NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "completedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductMetadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "type" TEXT,
    "vendor" TEXT,
    "collections" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "popularity" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductRecommendation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopDomain" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "recommendedProductId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "lastCalculated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "preferredCategories" TEXT NOT NULL,
    "preferredBrands" TEXT NOT NULL,
    "preferredPriceRange" JSONB,
    "viewedProducts" TEXT NOT NULL,
    "purchasedProducts" TEXT NOT NULL,
    "lastActive" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
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
INSERT INTO "new_Session" ("id", "userId") SELECT "id", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_sessionId_key" ON "Session"("sessionId");
CREATE INDEX "Session_shopDomain_startedAt_idx" ON "Session"("shopDomain", "startedAt");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ShopifyEvent_shopDomain_eventName_idx" ON "ShopifyEvent"("shopDomain", "eventName");

-- CreateIndex
CREATE INDEX "ShopifyEvent_timestamp_idx" ON "ShopifyEvent"("timestamp");

-- CreateIndex
CREATE INDEX "ShopifyEvent_sessionId_idx" ON "ShopifyEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ProductView_productId_idx" ON "ProductView"("productId");

-- CreateIndex
CREATE INDEX "ProductView_shopDomain_viewedAt_idx" ON "ProductView"("shopDomain", "viewedAt");

-- CreateIndex
CREATE INDEX "ProductView_userId_idx" ON "ProductView"("userId");

-- CreateIndex
CREATE INDEX "ProductView_sessionId_idx" ON "ProductView"("sessionId");

-- CreateIndex
CREATE INDEX "CartEvent_shopDomain_eventType_idx" ON "CartEvent"("shopDomain", "eventType");

-- CreateIndex
CREATE INDEX "CartEvent_productId_idx" ON "CartEvent"("productId");

-- CreateIndex
CREATE INDEX "CartEvent_sessionId_idx" ON "CartEvent"("sessionId");

-- CreateIndex
CREATE INDEX "CartEvent_userId_idx" ON "CartEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_shopDomain_completedAt_idx" ON "Order"("shopDomain", "completedAt");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMetadata_productId_key" ON "ProductMetadata"("productId");

-- CreateIndex
CREATE INDEX "ProductMetadata_shopDomain_idx" ON "ProductMetadata"("shopDomain");

-- CreateIndex
CREATE INDEX "ProductMetadata_tags_idx" ON "ProductMetadata"("tags");

-- CreateIndex
CREATE INDEX "ProductMetadata_collections_idx" ON "ProductMetadata"("collections");

-- CreateIndex
CREATE INDEX "ProductMetadata_type_idx" ON "ProductMetadata"("type");

-- CreateIndex
CREATE INDEX "ProductMetadata_vendor_idx" ON "ProductMetadata"("vendor");

-- CreateIndex
CREATE INDEX "ProductMetadata_popularity_idx" ON "ProductMetadata"("popularity" DESC);

-- CreateIndex
CREATE INDEX "ProductRecommendation_sourceProductId_idx" ON "ProductRecommendation"("sourceProductId");

-- CreateIndex
CREATE INDEX "ProductRecommendation_recommendedProductId_idx" ON "ProductRecommendation"("recommendedProductId");

-- CreateIndex
CREATE INDEX "ProductRecommendation_shopDomain_recommendationType_idx" ON "ProductRecommendation"("shopDomain", "recommendationType");

-- CreateIndex
CREATE INDEX "ProductRecommendation_score_idx" ON "ProductRecommendation"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecommendation_sourceProductId_recommendedProductId_recommendationType_key" ON "ProductRecommendation"("sourceProductId", "recommendedProductId", "recommendationType");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_shopDomain_idx" ON "UserProfile"("shopDomain");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");
