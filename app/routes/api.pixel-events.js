// import { authenticate } from "../shopify.server"; // This import is not used for the action, can be removed if not used elsewhere in this file or for other exports
import prisma from "../db.server.js";

// Define allowed origin for CORS - fully permissive for all domains
const allowedOrigins = [
  "https://nova-ebgc.onrender.com", // Our app domain
  "*"  // Allow all domains
];

// Helper function to create CORS headers for Shopify Web Pixels (including null origins)
const getCorsHeaders = (origin) => {
  // Always set to "*" for Shopify web pixels regardless of origin
  // This is the most reliable solution based on community feedback
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
    "Access-Control-Max-Age": "86400", // 24 hours cache for preflight
  };
};

// Dedicated endpoint for OPTIONS preflight requests
export async function options({ request }) {
  return new Response(null, {
    status: 204, // No Content
    headers: getCorsHeaders(),
  });
}

export const action = async ({ request }) => {
  // Handle OPTIONS preflight request for CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No Content
      headers: getCorsHeaders(),
    });
  }

  // Ensure it's a POST request for actual event processing
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
    });
  }

  try {
    // Parse the event data from the request first
    let eventData;
    
    try {
      eventData = await request.json();
    } catch (parseError) {
      // Check if the request might be a URL-encoded form
      const contentType = request.headers.get("Content-Type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        // Convert FormData to a regular object
        eventData = Object.fromEntries(formData.entries());
      } else {
        throw parseError;
      }
    }

    // Get the shop from the event data payload
    const shop = eventData.shop;

    if (!shop) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing shop in request body" }),
        { status: 400, headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // Validate required fields from the eventData
    if (!eventData.eventName || !eventData.timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields in request body" }),
        { status: 400, headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // Log the event data for debugging
    console.log("Received pixel event:", {
      shop,
      eventName: eventData.eventName,
      timestamp: eventData.timestamp,
      accountID: eventData.accountID,
    });

    try {
      // Extract sessionId and other relevant data from the event
      const sessionId = eventData.clientId || `anon-${Date.now()}`; // Fallback if clientId is not present
      const eventTimestamp = new Date(eventData.timestamp);
      const shopDomain = shop; // Already extracted as 'shop'
      
      console.log("Processing event data:", {
        shopDomain,
        eventName: eventData.eventName,
        sessionId,
        timestamp: eventTimestamp
      });

      // Optional: Extract additional details for PixelSession if available in eventData.context
      const context = eventData.context || {};
      const documentContext = context.document || {};
      const navigatorContext = context.navigator || {};
      
      // Attempt to get customer ID if available (standard pixel might not always have it directly, depends on event)
      const userId = eventData.customer?.id || null; 
      const clientIp = context.clientIp || null; // Make sure this is anonymized if stored as per your schema
      // deviceType is not standard in Shopify's basic pixel payload. This might need to be inferred or will be null.
      const deviceType = null; 
      const userAgent = navigatorContext.userAgent || null;
      const referer = documentContext.referrer || null;

      // 1. Upsert PixelSession - using the correct model name
      const pixelSession = await prisma.pixelSession.upsert({
        where: { sessionId: sessionId }, 
        update: { 
          endedAt: eventTimestamp, 
          userId: userId,
        },
        create: {
          sessionId: sessionId,
          shopDomain: shopDomain,
          userId: userId,
          startedAt: eventTimestamp,
          endedAt: eventTimestamp, 
          deviceType: deviceType, 
          userAgent: userAgent,
          referer: referer,
        },
      });
      console.log(`Upserted PixelSession ID: ${pixelSession.id} for session ${sessionId} in shop ${shopDomain}`);

      // 2. Create ShopifyEvent - FIXED: Explicitly include eventName
      const shopifyEvent = await prisma.shopifyEvent.create({
        data: {
          eventName: eventData.eventName, // Make sure eventName is included
          shopDomain: shopDomain,
          eventData: typeof eventData.data === 'object' ? eventData.data : JSON.stringify(eventData.data || {}), // Handle object or string correctly
          timestamp: eventTimestamp,
          sessionId: sessionId, // Link to the PixelSession
          clientIp: clientIp, 
        },
      });

      // 3. Also create a PixelEvent record for consistency with webhooks
      const pixelEvent = await prisma.pixelEvent.create({
        data: {
          shop: shopDomain,
          eventName: eventData.eventName,
          eventData: JSON.stringify(eventData.data || {}),
          accountId: eventData.accountID || "unknown",
          timestamp: eventTimestamp,
        },
      });

      console.log(`Stored ShopifyEvent: ${shopifyEvent.eventName} for shop ${shopDomain}, Event ID: ${shopifyEvent.id}, Linked Session ID: ${sessionId}`);
      console.log(`Also stored as PixelEvent ID: ${pixelEvent.id}`);

      // 4. Process specific event types to update analytics models
      await processEventForAnalytics(eventData, sessionId, shopDomain);

      return new Response(
        JSON.stringify({ success: true, eventId: shopifyEvent.id, pixelSessionId: pixelSession.id }),
        { headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
      );

    } catch (dbError) {
      console.error("Database error processing pixel event:", dbError);
      // Keeping your original error response structure
      return new Response(
        JSON.stringify({
          success: false, 
          error: "Event logged but failed during database operation.",
          dbErrorMessage: dbError.message,
          details: dbError.stack // consider logging stack in dev, remove for prod
        }),
        { status: 500, headers: { ...getCorsHeaders(), "Content-Type": "application/json" } } 
      );
    }
  } catch (error) {
    console.error("Error processing pixel event:", error);
    // Check if the error is due to JSON parsing (e.g., empty or malformed body)
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return new Response(
            JSON.stringify({ success: false, error: "Invalid JSON payload" }),
            { status: 400, headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
        );
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
    );
  }
};

// New function to process events for analytics
async function processEventForAnalytics(eventData, sessionId, shopDomain) {
  const eventName = eventData.eventName;
  const data = eventData.data || {};
  
  try {
    switch(eventName) {
      case 'product_viewed':
        if (data.productVariant) {
          // Create ProductView record
          await prisma.productView.create({
            data: {
              productId: data.productVariant.product?.id || "unknown",
              variantId: data.productVariant.id || "unknown",
              productTitle: data.productVariant.product?.title || data.productVariant.title || "Unknown Product",
              price: parseFloat(data.productVariant.price?.amount || 0),
              shopDomain: shopDomain,
              sessionId: sessionId,
              userId: eventData.customer?.id || null,
              viewedAt: new Date(eventData.timestamp),
              // Add other fields as available from the event
            }
          });
          console.log(`Created ProductView record for product ${data.productVariant.product?.title || "unknown"}`);
        }
        break;
        
      case 'product_added_to_cart':
        if (data.cartLine) {
          // Create CartEvent record
          await prisma.cartEvent.create({
            data: {
              shopDomain: shopDomain,
              productId: data.cartLine.merchandise.product?.id || "unknown",
              variantId: data.cartLine.merchandise.id || "unknown",
              quantity: data.cartLine.quantity || 1,
              price: parseFloat(data.cartLine.merchandise.price?.amount || 0),
              sessionId: sessionId,
              userId: eventData.customer?.id || null,
              eventType: "ADD_TO_CART",
              timestamp: new Date(eventData.timestamp),
            }
          });
          console.log(`Created CartEvent record for product ${data.cartLine.merchandise.product?.title || "unknown"}`);
        }
        break;
        
      case 'checkout_completed':
        if (data.checkout && data.checkout.order) {
          // Create Order record
          const order = await prisma.order.create({
            data: {
              shopDomain: shopDomain,
              orderId: data.checkout.order.id,
              orderNumber: data.checkout.order.orderNumber,
              totalPrice: parseFloat(data.checkout.totalPrice?.amount || 0),
              userId: eventData.customer?.id || null,
              sessionId: sessionId,
              completedAt: new Date(eventData.timestamp),
              // Create order items
              orderItems: {
                create: (data.checkout.lineItems || []).map(item => ({
                  productId: item.variant?.product?.id || "unknown",
                  variantId: item.variant?.id || "unknown",
                  quantity: item.quantity || 1,
                  price: parseFloat(item.variant?.price?.amount || 0),
                }))
              }
            }
          });
          console.log(`Created Order record ID: ${order.id} for order ${data.checkout.order.orderNumber || "unknown"}`);
        }
        break;
    }
  } catch (error) {
    console.error(`Error processing ${eventName} for analytics:`, error);
    // Don't throw the error - we just log it and continue
  }
}

// Handle GET requests (for testing the endpoint and for basic pixel tracking)
export const loader = async ({ request }) => {
  const origin = request.headers.get("Origin") || allowedOrigins[0];
  
  // Handle OPTIONS preflight request for CORS for the loader as well
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // Check if this is a pixel tracking GET request with event parameters
  const url = new URL(request.url);
  const hasEventParam = url.searchParams.has('event');
  
  if (hasEventParam) {
    // Extract tracking parameters
    const eventName = url.searchParams.get("event") || "unknown";
    const shop = url.searchParams.get("shop") || "unknown";
    const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
    const accountID = url.searchParams.get("acc") || "unknown";
    const sessionId = url.searchParams.get("id") || `anon-${Date.now()}`;
    
    // Log the event
    console.log(`GET TRACKING: ${eventName} from ${shop}, session: ${sessionId}`);
    
    try {
      // 1. Create or update session
      const pixelSession = await prisma.pixelSession.upsert({
        where: { sessionId },
        update: { 
          endedAt: timestamp,
        },
        create: {
          sessionId,
          shopDomain: shop,
          startedAt: timestamp,
          endedAt: timestamp,
        },
      });
      
      // 2. Create ShopifyEvent
      const shopifyEvent = await prisma.shopifyEvent.create({
        data: {
          eventName,
          shopDomain: shop,
          eventData: JSON.stringify({ source: "api-endpoint-get" }),
          timestamp,
          sessionId,
        },
      });
      
      // 3. Create PixelEvent
      const pixelEvent = await prisma.pixelEvent.create({
        data: {
          shop,
          eventName,
          eventData: JSON.stringify({ source: "api-endpoint-get" }),
          accountId: accountID,
          timestamp,
        },
      });
      
      console.log(`Saved events via GET: PixelEvent ID ${pixelEvent.id}, ShopifyEvent ID ${shopifyEvent.id}, Session ID ${pixelSession.id}`);
    } catch (error) {
      console.error("Error saving event via GET to database:", error);
    }
    
    // Return a 1x1 transparent GIF
    const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    
    return new Response(transparentGif, {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      }
    });
  }
  
  // If not a tracking request, just return the standard API info response
  return new Response(
    JSON.stringify({ message: "Pixel events API endpoint is active. Use POST to send events or include 'event' parameter for GET tracking." }),
    { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
  );
};
