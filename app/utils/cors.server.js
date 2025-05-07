/**
 * Utility functions for CORS handling across API endpoints
 */

/**
 * Get CORS headers for API responses
 * @param {string|null} origin - Optional specific origin to allow (defaults to *)
 * @param {string} methods - HTTP methods to allow
 * @returns {Object} - Headers object with CORS settings
 */
export const getCorsHeaders = (origin = null, methods = 'GET, OPTIONS, POST') => {
  return {
    // Always set to "*" for web pixels to work across all stores
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
    "Access-Control-Max-Age": "86400", // 24 hours cache for preflight
  };
};

/**
 * Handle OPTIONS preflight requests for CORS
 * @param {string|null} origin - Optional specific origin to allow (defaults to *)
 * @param {string} methods - HTTP methods to allow
 * @returns {Response} - Response for OPTIONS requests
 */
export const handleOptions = (origin = null, methods = 'GET, OPTIONS, POST') => {
  return new Response(null, {
    status: 204, // No Content
    headers: getCorsHeaders(origin, methods),
  });
};

/**
 * Wrap a response with CORS headers
 * @param {Response} response - Response to wrap
 * @param {string|null} origin - Optional specific origin to allow (defaults to *)
 * @param {string} methods - HTTP methods to allow
 * @returns {Response} - Response with CORS headers
 */
export const withCors = (response, origin = null, methods = 'GET, OPTIONS, POST') => {
  const headers = new Headers(response.headers);
  
  Object.entries(getCorsHeaders(origin, methods)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Create a CORS error response
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {string|null} origin - Optional specific origin to allow (defaults to *)
 * @returns {Response} - Error response with CORS headers
 */
export const corsErrorResponse = (status, message, details = {}, origin = null) => {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      ...details,
    }),
    {
      status,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    }
  );
}; 