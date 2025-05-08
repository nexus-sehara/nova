import { json } from "@remix-run/node";

// Use a proper loader function that doesn't expose server imports to the client
export const loader = async ({ request }) => {
  try {
    // In a proper implementation, we would dynamically import server modules here
    // For example:
    // const { RecommendationEngine } = await import("../services/recommendationEngine.server.js");
    
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const shopDomain = url.searchParams.get('shop');
    
    // Add CORS headers for cross-domain access (important for Shopify store)
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Validate required parameters
    if (!productId || !shopDomain) {
      return json({ 
        success: false, 
        error: 'Missing required parameters', 
        details: 'Both productId and shop are required' 
      }, { 
        status: 400, 
        headers 
      });
    }

    // For now, return mock data
    return json({ 
      success: true,
      recommendations: [
        {
          id: "mock-product-1",
          title: "Example Product 1",
          price: 19.99,
          recommendedBecause: "Popular item",
          score: 0.9
        },
        {
          id: "mock-product-2",
          title: "Example Product 2",
          price: 29.99,
          recommendedBecause: "Similar to your selection",
          score: 0.8
        }
      ],
      message: "This is a mock response to test routing",
      timestamp: new Date().toISOString()
    }, { 
      status: 200, 
      headers
    });
    
  } catch (error) {
    console.error('Error in recommendations API:', error);
    
    return json({ 
      success: false, 
      error: 'Failed to get recommendations',
      message: error.message
    }, { 
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
  return json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}; 