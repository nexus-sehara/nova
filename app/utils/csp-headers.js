/**
 * Generates Content Security Policy headers for Shopify embedded apps
 * This ensures your app can be properly embedded in the Shopify admin
 * @param {string} shop - The shop domain (e.g., 'my-shop.myshopify.com')
 * @returns {object} - Headers object with CSP directives
 */
export function generateCSPHeaders(shop = null) {
  // If a specific shop is provided, use it - otherwise use wildcard
  const shopDomain = shop ? shop : '*.myshopify.com';
  
  return {
    "Content-Security-Policy": 
      `frame-ancestors 'self' https://${shopDomain} https://admin.shopify.com https://*.shopify.com;` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.shopify.com https://*.myshopify.com https://cdn.shopify.com;` +
      `connect-src 'self' https://*.shopify.com https://monorail-edge.shopifysvc.com;`,
    "X-Frame-Options": "ALLOW-FROM https://*.myshopify.com https://admin.shopify.com"
  };
}

/**
 * Creates dynamic CSP headers for the specific shop making the request
 * @param {Request} request - The incoming request
 * @returns {object} - Headers object with CSP directives for the specific shop
 */
export function getShopSpecificCSPHeaders(request) {
  // Extract shop from request parameters
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  return generateCSPHeaders(shop);
} 