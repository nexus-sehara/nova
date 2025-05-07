import prisma from '../db.server.js';

export const RecommendationEngine = {
  /**
   * Get product recommendations based on product, shop, user, and session data
   * @param {object} params - Recommendation parameters
   * @param {string} params.productId - ID of the product to get recommendations for
   * @param {string} params.shopDomain - Shop domain
   * @param {string} params.userId - Optional user ID for personalized recommendations
   * @param {string} params.sessionId - Optional session ID for contextual recommendations
   * @param {number} params.limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended products
   */
  getProductRecommendations: async ({ productId, shopDomain, userId, sessionId, limit = 5 }) => {
    try {
      // 1. Try to find pre-computed recommendations first (fastest path)
      const storedRecommendations = await prisma.productRecommendation.findMany({
        where: {
          shopDomain,
          sourceProductId: productId,
        },
        orderBy: {
          score: 'desc',
        },
        take: limit,
      });
      
      if (storedRecommendations.length > 0) {
        // Fetch the product details for these recommendations
        const productIds = storedRecommendations.map(rec => rec.recommendedProductId);
        const products = await prisma.productMetadata.findMany({
          where: {
            productId: { in: productIds },
            shopDomain,
          },
        });
        
        // Map recommendations to the format expected by the API
        return products.map(product => ({
          id: product.productId,
          title: product.title,
          price: product.price,
          type: product.type || null,
          vendor: product.vendor || null,
          recommendedBecause: storedRecommendations.find(
            r => r.recommendedProductId === product.productId
          )?.recommendationType || 'Similar product',
          score: storedRecommendations.find(
            r => r.recommendedProductId === product.productId
          )?.score || 0,
        }));
      }
      
      // 2. If user ID is provided, try personalized recommendations
      if (userId) {
        const userProfile = await prisma.userProfile.findUnique({
          where: {
            userId,
            shopDomain,
          },
        });
        
        if (userProfile) {
          // Find products that match user preferences
          const personalizedProducts = await prisma.productMetadata.findMany({
            where: {
              shopDomain,
              productId: { not: productId }, // Exclude the current product
              OR: [
                userProfile.preferredCategories.length > 0 
                  ? { type: { in: userProfile.preferredCategories } } 
                  : {},
                userProfile.preferredBrands.length > 0 
                  ? { vendor: { in: userProfile.preferredBrands } } 
                  : {},
                // Also consider products with tags that match user's viewed products
                userProfile.viewedProducts.length > 0 
                  ? { tags: { hasSome: await getTagsFromProducts(userProfile.viewedProducts, shopDomain) } } 
                  : {},
              ],
            },
            orderBy: { popularity: 'desc' },
            take: limit,
          });
          
          if (personalizedProducts.length > 0) {
            return personalizedProducts.map(product => ({
              id: product.productId,
              title: product.title,
              price: product.price,
              type: product.type || null,
              vendor: product.vendor || null,
              recommendedBecause: 'Based on your preferences',
              score: 0.9, // High confidence for personalized recommendations
            }));
          }
        }
      }
      
      // 3. If session ID is provided, try session-based recommendations
      if (sessionId) {
        // Get products viewed in this session
        const sessionViews = await prisma.productView.findMany({
          where: {
            sessionId,
            shopDomain,
            productId: { not: productId }, // Exclude current product
          },
          orderBy: { viewedAt: 'desc' },
          take: 10, // Get last 10 viewed products
        });
        
        if (sessionViews.length > 0) {
          // Get viewed product IDs from this session
          const viewedProductIds = sessionViews.map(view => view.productId);
          
          // Find similar products to those viewed in this session
          const sessionProducts = await prisma.productMetadata.findMany({
            where: {
              shopDomain,
              productId: { 
                notIn: [...viewedProductIds, productId] // Exclude viewed products and current product
              },
              OR: [
                { type: { in: await getProductMetadata(viewedProductIds, shopDomain, 'type') } },
                { vendor: { in: await getProductMetadata(viewedProductIds, shopDomain, 'vendor') } },
                { tags: { hasSome: await getTagsFromProducts(viewedProductIds, shopDomain) } },
              ],
            },
            orderBy: { popularity: 'desc' },
            take: limit,
          });
          
          if (sessionProducts.length > 0) {
            return sessionProducts.map(product => ({
              id: product.productId,
              title: product.title,
              price: product.price,
              type: product.type || null,
              vendor: product.vendor || null,
              recommendedBecause: 'Based on your browsing',
              score: 0.8,
            }));
          }
        }
      }
      
      // 4. Fallback: Similarity-based recommendations using product metadata
      const sourceProduct = await prisma.productMetadata.findUnique({
        where: {
          productId,
          shopDomain,
        },
      });
      
      if (!sourceProduct) {
        console.log(`Source product ${productId} not found for shop ${shopDomain}`);
        return getFallbackRecommendations(shopDomain, limit);
      }
      
      // Find similar products based on tags, collections, type or vendor
      const similarProducts = await prisma.productMetadata.findMany({
        where: {
          shopDomain,
          productId: { not: productId }, // Exclude the current product
          OR: [
            sourceProduct.tags.length > 0 
              ? { tags: { hasSome: sourceProduct.tags } } 
              : {},
            sourceProduct.collections.length > 0 
              ? { collections: { hasSome: sourceProduct.collections } } 
              : {},
            sourceProduct.type 
              ? { type: sourceProduct.type } 
              : {},
            sourceProduct.vendor 
              ? { vendor: sourceProduct.vendor } 
              : {},
          ],
        },
        orderBy: {
          popularity: 'desc',
        },
        take: limit,
      });
      
      if (similarProducts.length > 0) {
        return similarProducts.map(product => {
          let reason = 'You might also like';
          let score = 0.5;
          
          // Determine the recommendation reason and score
          if (sourceProduct.tags.some(tag => product.tags.includes(tag))) {
            reason = 'Similar product';
            score = 0.7;
          } else if (sourceProduct.collections.some(col => product.collections.includes(col))) {
            reason = 'From the same collection';
            score = 0.7;
          } else if (product.vendor === sourceProduct.vendor) {
            reason = `More from ${product.vendor}`;
            score = 0.6;
          } else if (product.type === sourceProduct.type) {
            reason = `Similar ${product.type}`;
            score = 0.6;
          }
          
          return {
            id: product.productId,
            title: product.title,
            price: product.price,
            type: product.type || null,
            vendor: product.vendor || null,
            recommendedBecause: reason,
            score,
          };
        });
      }
      
      // 5. Last resort: popular products in the shop
      return getFallbackRecommendations(shopDomain, limit);
      
    } catch (error) {
      console.error('Error getting product recommendations:', error);
      return [
        {
          id: 'error',
          title: 'Error getting recommendations',
          recommendedBecause: 'Error',
          score: 0
        }
      ];
    }
  },
  
  /**
   * Calculate and store product recommendations for all products in a shop
   * This should be run as a background job periodically
   * @param {string} shopDomain - Shop domain to calculate recommendations for
   */
  calculateRecommendations: async (shopDomain) => {
    try {
      // 1. Get all products for this shop
      const products = await prisma.productMetadata.findMany({
        where: { shopDomain },
        select: { productId: true }
      });
      
      console.log(`Calculating recommendations for ${products.length} products in ${shopDomain}`);
      
      // 2. For each product, calculate recommendations
      // Note: In a production app, you would want to batch this or use a queue
      for (const { productId } of products) {
        await calculateProductRecommendations(productId, shopDomain);
      }
      
      console.log(`Finished calculating recommendations for ${shopDomain}`);
      
    } catch (error) {
      console.error('Error calculating recommendations:', error);
    }
  }
};

/**
 * Calculate and store recommendations for a single product
 * @param {string} productId - Product ID
 * @param {string} shopDomain - Shop domain
 */
async function calculateProductRecommendations(productId, shopDomain) {
  try {
    // Get the source product
    const sourceProduct = await prisma.productMetadata.findUnique({
      where: {
        productId,
        shopDomain,
      },
    });
    
    if (!sourceProduct) return;
    
    // Find products that are frequently bought together
    const co购买产品 = await findFrequentlyBoughtTogether(productId, shopDomain);
    
    // Find products that are similar based on metadata
    const similarProducts = await findSimilarProducts(sourceProduct);
    
    // Find products that are viewed by the same users
    const alsoViewedProducts = await findAlsoViewedProducts(productId, shopDomain);
    
    // Combine all recommendations and store them
    const allRecommendations = [
      ...co购买产品.map(p => ({ 
        ...p, 
        recommendationType: 'FREQUENTLY_BOUGHT_TOGETHER',
        score: Math.min(1, p.score + 0.3) // Boost score for co-purchased items
      })),
      ...similarProducts.map(p => ({ 
        ...p, 
        recommendationType: 'SIMILAR_PRODUCTS',
      })),
      ...alsoViewedProducts.map(p => ({ 
        ...p, 
        recommendationType: 'ALSO_VIEWED',
        score: Math.min(1, p.score + 0.1) // Small boost for co-viewed items
      })),
    ];
    
    // Store all recommendations in the database
    // First, delete existing recommendations for this product
    await prisma.productRecommendation.deleteMany({
      where: {
        shopDomain,
        sourceProductId: productId,
      },
    });
    
    // Then create new recommendations
    for (const rec of allRecommendations) {
      await prisma.productRecommendation.create({
        data: {
          shopDomain,
          sourceProductId: productId,
          recommendedProductId: rec.productId,
          recommendationType: rec.recommendationType,
          score: rec.score,
          lastCalculated: new Date(),
        },
      });
    }
    
  } catch (error) {
    console.error(`Error calculating recommendations for product ${productId}:`, error);
  }
}

/**
 * Find products frequently bought together with a given product
 * @param {string} productId - Product ID
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Array>} - Array of products with scores
 */
async function findFrequentlyBoughtTogether(productId, shopDomain) {
  // Find orders containing this product
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        shopDomain,
      },
    },
    include: {
      order: true,
    },
  });
  
  // Get order IDs containing this product
  const orderIds = orderItems.map(item => item.orderId);
  
  // Find other products in these orders
  const otherItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      productId: { not: productId }, // Exclude the source product
    },
    include: {
      order: true,
    },
  });
  
  // Count occurrences of each product
  const productCounts = {};
  otherItems.forEach(item => {
    productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
  });
  
  // Calculate scores based on co-occurrence
  const totalOrders = orderIds.length;
  const recommendations = Object.entries(productCounts).map(([id, count]) => ({
    productId: id,
    score: count / totalOrders, // Normalize by total orders
  }));
  
  // Sort by score and return top results
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Find products similar to the source product based on metadata
 * @param {object} sourceProduct - Source product metadata
 * @returns {Promise<Array>} - Array of products with scores
 */
async function findSimilarProducts(sourceProduct) {
  // Find products with similar tags, collections, type or vendor
  const similarProducts = await prisma.productMetadata.findMany({
    where: {
      shopDomain: sourceProduct.shopDomain,
      productId: { not: sourceProduct.productId }, // Exclude the source product
      OR: [
        sourceProduct.tags.length > 0 ? { tags: { hasSome: sourceProduct.tags } } : {},
        sourceProduct.collections.length > 0 ? { collections: { hasSome: sourceProduct.collections } } : {},
        sourceProduct.type ? { type: sourceProduct.type } : {},
        sourceProduct.vendor ? { vendor: sourceProduct.vendor } : {},
      ],
    },
  });
  
  // Calculate similarity scores
  return similarProducts.map(product => {
    let score = 0;
    
    // Score based on common tags
    if (sourceProduct.tags.length > 0 && product.tags.length > 0) {
      const commonTags = sourceProduct.tags.filter(tag => product.tags.includes(tag)).length;
      score += 0.3 * (commonTags / Math.max(sourceProduct.tags.length, product.tags.length));
    }
    
    // Score based on common collections
    if (sourceProduct.collections.length > 0 && product.collections.length > 0) {
      const commonCollections = sourceProduct.collections.filter(col => 
        product.collections.includes(col)).length;
      score += 0.25 * (commonCollections / Math.max(sourceProduct.collections.length, product.collections.length));
    }
    
    // Score based on type match
    if (sourceProduct.type && product.type && sourceProduct.type === product.type) {
      score += 0.2;
    }
    
    // Score based on vendor match
    if (sourceProduct.vendor && product.vendor && sourceProduct.vendor === product.vendor) {
      score += 0.15;
    }
    
    // Price similarity (closer in price = more similar)
    const priceDiff = Math.abs(sourceProduct.price - product.price);
    const priceRange = Math.max(sourceProduct.price, product.price);
    const priceSimilarity = 1 - Math.min(1, priceDiff / priceRange);
    score += 0.1 * priceSimilarity;
    
    return {
      productId: product.productId,
      score: Math.min(1, score), // Cap score at 1
    };
  }).sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Find products that are viewed by users who viewed the source product
 * @param {string} productId - Product ID
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Array>} - Array of products with scores
 */
async function findAlsoViewedProducts(productId, shopDomain) {
  // Get users/sessions who viewed this product
  const viewers = await prisma.productView.findMany({
    where: {
      productId,
      shopDomain,
    },
    select: {
      sessionId: true,
      userId: true,
    },
    distinct: ['sessionId', 'userId'],
  });
  
  // Get session IDs and user IDs
  const sessionIds = viewers.filter(v => v.sessionId).map(v => v.sessionId);
  const userIds = viewers.filter(v => v.userId).map(v => v.userId);
  
  // Find other products viewed in the same sessions or by the same users
  const otherViews = await prisma.productView.findMany({
    where: {
      shopDomain,
      productId: { not: productId }, // Exclude the source product
      OR: [
        sessionIds.length > 0 ? { sessionId: { in: sessionIds } } : {},
        userIds.length > 0 ? { userId: { in: userIds } } : {},
      ],
    },
  });
  
  // Count occurrences of each product
  const productCounts = {};
  otherViews.forEach(view => {
    productCounts[view.productId] = (productCounts[view.productId] || 0) + 1;
  });
  
  // Calculate scores based on co-viewing
  const totalViewers = viewers.length;
  const recommendations = Object.entries(productCounts).map(([id, count]) => ({
    productId: id,
    score: Math.min(0.8, count / totalViewers), // Normalize by total viewers, cap at 0.8
  }));
  
  // Sort by score and return top results
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 15);
}

/**
 * Helper function to get fallback recommendations (popular products)
 * @param {string} shopDomain - Shop domain
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise<Array>} - Array of recommended products
 */
async function getFallbackRecommendations(shopDomain, limit) {
  // Get the most popular products in the shop
  const popularProducts = await prisma.productMetadata.findMany({
    where: { shopDomain },
    orderBy: { popularity: 'desc' },
    take: limit,
  });
  
  return popularProducts.map(product => ({
    id: product.productId,
    title: product.title,
    price: product.price,
    type: product.type || null,
    vendor: product.vendor || null,
    recommendedBecause: 'Popular in this store',
    score: 0.4,
  }));
}

/**
 * Helper function to get product metadata from a list of product IDs
 * @param {Array<string>} productIds - Array of product IDs
 * @param {string} shopDomain - Shop domain
 * @param {string} field - Field to extract (e.g., 'type', 'vendor')
 * @returns {Promise<Array>} - Array of unique values for the requested field
 */
async function getProductMetadata(productIds, shopDomain, field) {
  if (!productIds.length) return [];
  
  const products = await prisma.productMetadata.findMany({
    where: {
      productId: { in: productIds },
      shopDomain,
    },
    select: {
      [field]: true,
    },
  });
  
  return [...new Set(products.map(p => p[field]).filter(Boolean))];
}

/**
 * Helper function to get tags from a list of product IDs
 * @param {Array<string>} productIds - Array of product IDs
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Array>} - Array of unique tags
 */
async function getTagsFromProducts(productIds, shopDomain) {
  if (!productIds.length) return [];
  
  const products = await prisma.productMetadata.findMany({
    where: {
      productId: { in: productIds },
      shopDomain,
    },
    select: {
      tags: true,
    },
  });
  
  // Flatten all tags and get unique ones
  return [...new Set(products.flatMap(p => p.tags))];
} 