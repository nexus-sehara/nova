// import { authenticate } from "../shopify.server"; // This import is not used for the action, can be removed if not used elsewhere in this file or for other exports
import prisma from "../db.server.js";
import { ProductMetadataService } from "~/services/productMetadata.server";

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
  const { eventName } = eventData;
  
  // Process product views
  if (eventName === 'product_viewed') {
    try {
      const productId = eventData.product_id || eventData.productId;
      const variantId = eventData.variant_id || eventData.variantId;
      const productTitle = eventData.product_title || eventData.productTitle;
      const price = parseFloat(eventData.product_price || eventData.price || 0);
      const userId = eventData.user_id || eventData.userId;
      
      // Store product view
      if (productId) {
        await prisma.productView.create({
          data: {
            productId: productId.toString(),
            variantId: variantId ? variantId.toString() : null,
            productTitle: productTitle || 'Unknown Product',
            price: isNaN(price) ? 0 : price,
            shopDomain,
            sessionId,
            userId: userId || null,
            referringProduct: eventData.referring_product || null,
            referringCollection: eventData.referring_collection || null,
            viewDuration: parseInt(eventData.view_duration || 0, 10),
            deviceType: eventData.device_type || null,
            viewedAt: new Date(),
          },
        });
        
        // Also update product metadata for recommendations
        await ProductMetadataService.ensureProductMetadata({
          id: productId.toString(),
          title: productTitle,
          type: eventData.product_category || eventData.productType,
          vendor: eventData.product_brand || eventData.vendor,
          price: isNaN(price) ? 0 : price,
          tags: eventData.tags ? (Array.isArray(eventData.tags) ? eventData.tags : [eventData.tags]) : [],
          collections: eventData.collections ? (Array.isArray(eventData.collections) ? eventData.collections : [eventData.collections]) : [],
        }, shopDomain);
      }
    } catch (error) {
      console.error('Error processing product view analytics:', error);
    }
  } 
  
  // Process cart events
  else if (eventName === 'product_added_to_cart' || eventName === 'product_removed_from_cart') {
    try {
      const productId = eventData.product_id || eventData.productId;
      const variantId = eventData.variant_id || eventData.variantId;
      const price = parseFloat(eventData.product_price || eventData.price || 0);
      const quantity = parseInt(eventData.quantity || 1, 10);
      const userId = eventData.user_id || eventData.userId;
      
      if (productId) {
        await prisma.cartEvent.create({
          data: {
            shopDomain,
            productId: productId.toString(),
            variantId: variantId ? variantId.toString() : null,
            quantity: isNaN(quantity) ? 1 : quantity,
            price: isNaN(price) ? 0 : price,
            sessionId,
            userId: userId || null,
            eventType: eventName === 'product_added_to_cart' ? 'ADD_TO_CART' : 'REMOVE_FROM_CART',
            timestamp: new Date(),
          },
        });
        
        // Also update product metadata if we have product info
        if (eventName === 'product_added_to_cart') {
          await ProductMetadataService.ensureProductMetadata({
            id: productId.toString(),
            title: eventData.product_title || eventData.productTitle,
            type: eventData.product_category || eventData.productType,
            vendor: eventData.product_brand || eventData.vendor,
            price: isNaN(price) ? 0 : price,
            tags: eventData.tags ? (Array.isArray(eventData.tags) ? eventData.tags : [eventData.tags]) : [],
            collections: eventData.collections ? (Array.isArray(eventData.collections) ? eventData.collections : [eventData.collections]) : [],
          }, shopDomain);
        }
      }
    } catch (error) {
      console.error('Error processing cart event analytics:', error);
    }
  }
  
  // Process order completed events
  else if (eventName === 'checkout_completed') {
    try {
      const orderId = eventData.order_id || null;
      const orderTotal = parseFloat(eventData.order_total || 0);
      const userId = eventData.user_id || eventData.userId;
      
      if (orderId) {
        // Create the order
        const order = await prisma.order.create({
          data: {
            shopDomain,
            orderId: orderId.toString(),
            orderNumber: eventData.order_number || null,
            totalPrice: isNaN(orderTotal) ? 0 : orderTotal,
            userId: userId || null,
            sessionId,
            completedAt: new Date(),
          },
        });
        
        // If we have line items, add them to the order
        if (eventData.line_items && Array.isArray(eventData.line_items)) {
          for (const item of eventData.line_items) {
            await prisma.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.product_id.toString(),
                variantId: item.variant_id ? item.variant_id.toString() : null,
                quantity: parseInt(item.quantity || 1, 10),
                price: parseFloat(item.price || 0),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing order completed analytics:', error);
    }
  }
  
  // Process user-related events
  else if (eventName === 'customer_account_created' || eventName === 'customer_logged_in') {
    try {
      const userId = eventData.user_id || eventData.userId || eventData.customer_id;
      
      if (userId && sessionId) {
        // Update session with user ID
        await prisma.pixelSession.updateMany({
          where: { sessionId },
          data: { userId },
        });
        
        // Check if we need to create a user profile
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId },
        });
        
        if (!existingProfile) {
          await prisma.userProfile.create({
            data: {
              userId,
              shopDomain,
              preferredCategories: [],
              preferredBrands: [],
              viewedProducts: [],
              purchasedProducts: [],
              lastActive: new Date(),
            },
          });
        } else {
          // Update last active timestamp
          await prisma.userProfile.update({
            where: { userId },
            data: { lastActive: new Date() },
          });
        }
      }
    } catch (error) {
      console.error('Error processing user event analytics:', error);
    }
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
    // Extract all query parameters as an object
    const params = Object.fromEntries(url.searchParams.entries());
    const eventName = params.event || "unknown";
    const shop = params.shop || "unknown";
    const timestamp = params.ts ? new Date(parseInt(params.ts)) : new Date();
    const accountID = params.acc || "unknown";
    const sessionId = params.id || `anon-${Date.now()}`;
    const userId = params.user_id || null; // If you send user_id from pixel
    
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
          eventData: JSON.stringify(params), // Store all params as JSON
          timestamp,
          sessionId,
        },
      });
      
      // 3. Create PixelEvent
      const pixelEvent = await prisma.pixelEvent.create({
        data: {
          shop,
          eventName,
          eventData: JSON.stringify(params), // Store all params as JSON
          accountId: accountID,
          timestamp,
        },
      });
      
      // 4. Populate analytics tables based on event type
      switch (eventName) {
        case 'product_viewed':
          if (params.product_id) {
            await prisma.productView.create({
              data: {
                productId: params.product_id,
                productTitle: params.product_title || "Unknown Product",
                price: parseFloat(params.product_price || 0),
                shopDomain: shop,
                sessionId: sessionId,
                userId: userId,
                viewedAt: timestamp,
              }
            });
          }
          break;
        case 'product_added_to_cart':
        case 'product_removed_from_cart':
          if (params.product_id) {
            await prisma.cartEvent.create({
              data: {
                shopDomain: shop,
                productId: params.product_id,
                variantId: params.variant_id || "unknown",
                quantity: parseInt(params.quantity || 1),
                price: parseFloat(params.product_price || 0),
                sessionId: sessionId,
                userId: userId,
                eventType: eventName === 'product_added_to_cart' ? 'ADD_TO_CART' : 'REMOVE_FROM_CART',
                timestamp: timestamp,
              }
            });
          }
          break;
        // Add more cases for other event types as needed
      }
      
      // 5. Track user profile for repeat visits
      if (userId) {
        await prisma.userProfile.upsert({
          where: { userId },
          update: { lastActive: timestamp },
          create: {
            userId,
            shopDomain: shop,
            lastActive: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
            viewedProducts: params.product_id ? [params.product_id] : [],
            purchasedProducts: [],
            preferredCategories: params.product_category ? [params.product_category] : [],
            preferredBrands: params.product_brand ? [params.product_brand] : [],
            preferredPriceRange: params.product_price ? { min: params.product_price, max: params.product_price } : null,
          },
        });
      }
      
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
