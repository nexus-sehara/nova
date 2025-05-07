import prisma from '../db.server.js';

/**
 * Service for managing product metadata used by the recommendation engine
 */
export const ProductMetadataService = {
  /**
   * Ensures a product exists in the ProductMetadata table
   * Creates or updates the product metadata as needed
   * 
   * @param {object} product - Product data
   * @param {string} product.id - Product ID
   * @param {string} product.title - Product title
   * @param {string} product.type - Product type/category
   * @param {string} product.vendor - Product vendor/brand
   * @param {number} product.price - Product price
   * @param {Array<string>} product.tags - Product tags
   * @param {Array<string>} product.collections - Product collections
   * @param {string} shopDomain - Shop domain
   * @returns {Promise<object>} - Updated product metadata
   */
  async ensureProductMetadata(product, shopDomain) {
    try {
      if (!product?.id || !shopDomain) {
        console.error('Missing required data for ensureProductMetadata:', { product, shopDomain });
        return null;
      }

      // Check if product already exists
      const existingProduct = await prisma.productMetadata.findUnique({
        where: {
          productId: product.id,
        },
      });

      if (existingProduct) {
        // Update existing product
        return await prisma.productMetadata.update({
          where: {
            productId: product.id,
          },
          data: {
            title: product.title || existingProduct.title,
            type: product.type || existingProduct.type,
            vendor: product.vendor || existingProduct.vendor,
            price: product.price || existingProduct.price,
            tags: product.tags || existingProduct.tags,
            collections: product.collections || existingProduct.collections,
            // Don't overwrite popularity - that's calculated separately
          },
        });
      } else {
        // Create new product
        return await prisma.productMetadata.create({
          data: {
            productId: product.id,
            shopDomain,
            title: product.title || 'Unknown Product',
            type: product.type || null,
            vendor: product.vendor || null,
            price: product.price || 0,
            tags: product.tags || [],
            collections: product.collections || [],
            popularity: 0, // Initial popularity
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring product metadata:', error);
      return null;
    }
  },

  /**
   * Updates product popularity based on views and purchases
   * This is called periodically to refresh popularity scores
   * 
   * @param {string} shopDomain - Shop domain
   * @param {number} days - Number of days of data to consider
   * @returns {Promise<number>} - Number of products updated
   */
  async updateProductPopularity(shopDomain, days = 30) {
    try {
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);

      // Get view counts for each product
      const viewCounts = await prisma.productView.groupBy({
        by: ['productId'],
        where: {
          shopDomain,
          viewedAt: { gte: dateFilter },
        },
        _count: {
          productId: true,
        },
      });

      // Get purchase counts for each product
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            shopDomain,
            completedAt: { gte: dateFilter },
          },
        },
        include: {
          order: true,
        },
      });

      // Count purchases by product
      const purchaseCounts = {};
      orderItems.forEach(item => {
        purchaseCounts[item.productId] = (purchaseCounts[item.productId] || 0) + item.quantity;
      });

      // Create a map of all products with their counts
      const productPopularity = {};
      
      // Add view counts to the map
      viewCounts.forEach(view => {
        productPopularity[view.productId] = {
          views: view._count.productId,
          purchases: 0,
        };
      });

      // Add purchase counts to the map
      Object.entries(purchaseCounts).forEach(([productId, count]) => {
        if (productPopularity[productId]) {
          productPopularity[productId].purchases = count;
        } else {
          productPopularity[productId] = {
            views: 0,
            purchases: count,
          };
        }
      });

      // Calculate popularity score for each product
      // Formula: (0.3 * views + 0.7 * purchases) normalized to 0-1 range
      const maxViews = Math.max(...Object.values(productPopularity).map(p => p.views || 0), 1);
      const maxPurchases = Math.max(...Object.values(productPopularity).map(p => p.purchases || 0), 1);

      // Update popularity for each product
      let updatedCount = 0;
      for (const [productId, counts] of Object.entries(productPopularity)) {
        const viewScore = (counts.views || 0) / maxViews;
        const purchaseScore = (counts.purchases || 0) / maxPurchases;
        
        // Calculate overall popularity score (weighted)
        const popularityScore = (0.3 * viewScore) + (0.7 * purchaseScore);

        // Update the product's popularity score
        await prisma.productMetadata.updateMany({
          where: {
            productId,
            shopDomain,
          },
          data: {
            popularity: popularityScore,
          },
        });
        
        updatedCount++;
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating product popularity:', error);
      return 0;
    }
  },

  /**
   * Fetches product metadata by ID
   * 
   * @param {string} productId - Product ID
   * @param {string} shopDomain - Shop domain
   * @returns {Promise<object|null>} - Product metadata or null if not found
   */
  async getProductMetadata(productId, shopDomain) {
    try {
      return await prisma.productMetadata.findUnique({
        where: {
          productId,
          shopDomain,
        },
      });
    } catch (error) {
      console.error('Error getting product metadata:', error);
      return null;
    }
  },

  /**
   * Gets the most popular products for a shop
   * 
   * @param {string} shopDomain - Shop domain
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Array>} - Array of popular products
   */
  async getPopularProducts(shopDomain, limit = 10) {
    try {
      return await prisma.productMetadata.findMany({
        where: { shopDomain },
        orderBy: { popularity: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  },
}; 