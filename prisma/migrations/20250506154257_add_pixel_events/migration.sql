-- CreateTable
CREATE TABLE "PixelEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
