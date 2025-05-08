import prisma from "../db.server.js";
import { RecommendationEngine } from "../services/recommendationEngine.server.js";
import { ProductMetadataService } from "../services/productMetadata.server.js";

/**
 * API endpoint to get product recommendations
 * GET /api.get-recommendations?productId=123&shop=shop.myshopify.com&limit=5&userId=abc&sessionId=xyz
 */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const shopDomain = url.searchParams.get('shop');
    const userId = url.searchParams.get('userId');
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    
    // Add CORS headers for cross-domain access (important for Shopify store)
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Validate required parameters
    if (!productId || !shopDomain) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters', 
        details: 'Both productId and shop are required' 
      }), { 
        status: 400, 
        headers 
      });
    }

    // Get recommendations
    const recommendations = await RecommendationEngine.getProductRecommendations({
      productId,
      shopDomain,
      userId,
      sessionId,
      limit,
    });

    return new Response(JSON.stringify({ 
      success: true,
      recommendations,
      timestamp: new Date().toISOString()
    }), { 
      status: 200, 
      headers
    });
    
  } catch (error) {
    console.error('Error in recommendations API:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to get recommendations',
      message: error.message
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
export const action = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  
  // Method not allowed for anything other than OPTIONS
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}; 