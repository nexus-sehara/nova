-- CreateTable
CREATE TABLE "ShopifyEvent" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT,
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixelEvent" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductView" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "referringProduct" TEXT,
    "referringCollection" TEXT,
    "viewDuration" INTEGER,
    "deviceType" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartEvent" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixelSession" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "deviceType" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMetadata" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT[],
    "type" TEXT,
    "vendor" TEXT,
    "collections" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecommendation" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "recommendedProductId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "preferredCategories" TEXT[],
    "preferredBrands" TEXT[],
    "preferredPriceRange" JSONB,
    "viewedProducts" TEXT[],
    "purchasedProducts" TEXT[],
    "lastActive" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyEvent_shopDomain_eventName_idx" ON "ShopifyEvent"("shopDomain", "eventName");

-- CreateIndex
CREATE INDEX "ShopifyEvent_timestamp_idx" ON "ShopifyEvent"("timestamp");

-- CreateIndex
CREATE INDEX "ShopifyEvent_sessionId_idx" ON "ShopifyEvent"("sessionId");

-- CreateIndex
CREATE INDEX "PixelEvent_shop_eventName_idx" ON "PixelEvent"("shop", "eventName");

-- CreateIndex
CREATE INDEX "PixelEvent_timestamp_idx" ON "PixelEvent"("timestamp");

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
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "PixelSession_sessionId_key" ON "PixelSession"("sessionId");

-- CreateIndex
CREATE INDEX "PixelSession_shopDomain_startedAt_idx" ON "PixelSession"("shopDomain", "startedAt");

-- CreateIndex
CREATE INDEX "PixelSession_userId_idx" ON "PixelSession"("userId");

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
CREATE UNIQUE INDEX "ProductRecommendation_sourceProductId_recommendedProductId__key" ON "ProductRecommendation"("sourceProductId", "recommendedProductId", "recommendationType");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_shopDomain_idx" ON "UserProfile"("shopDomain");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
