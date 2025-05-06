// import { authenticate } from "../shopify.server"; // This import is not used for the action, can be removed if not used elsewhere in this file or for other exports
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define allowed origin for CORS
const allowedOrigin = "https://mysmartap.myshopify.com";

// Helper function to create CORS headers
const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

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
    const eventData = await request.json();

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
      // data: eventData.data // Optionally log the full data object if needed, can be large
    });
    try {
      // Extract sessionId and other relevant data from the event
      // Shopify Pixel standard payload often uses `clientId` which can serve as our `sessionId`
      const sessionId = eventData.clientId || `anon-${Date.now()}`; // Fallback if clientId is not present
      const eventTimestamp = new Date(eventData.timestamp);
      const shopDomain = shop; // Already extracted as 'shop'

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

      // 1. Upsert PixelSession
      // Assumes PixelSession.sessionId is marked @unique in your schema.prisma
      const pixelSession = await prisma.pixelSession.upsert({
        where: { sessionId: sessionId }, 
        update: { 
          endedAt: eventTimestamp, 
          userId: userId, // Update userId if it becomes available or changes
          // other fields like userAgent, referer could be updated if they might change for an existing session
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

      // 2. Create ShopifyEvent
      // Shopify standard pixel event name is in `eventData.name`
      // The actual event-specific payload is in `eventData.data`
      const shopifyEvent = await prisma.shopifyEvent.create({
        data: {
          eventName: eventData.name, 
          shopDomain: shopDomain,
          eventData: eventData.data || {}, // Store the 'data' object from the pixel payload
          timestamp: eventTimestamp,
          sessionId: sessionId, // Link to the PixelSession
          clientIp: clientIp, 
        },
      });

      console.log(`Stored ShopifyEvent: ${shopifyEvent.eventName} for shop ${shopDomain}, Event ID: ${shopifyEvent.id}, Linked Session ID: ${sessionId}`);

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

// Handle GET requests (for testing the endpoint)
export const loader = async ({ request }) => {
  // Handle OPTIONS preflight request for CORS for the loader as well, if it could be called cross-origin
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }
  return new Response(
    JSON.stringify({ message: "Pixel events API endpoint is active. Use POST to send events." }),
    { headers: { ...getCorsHeaders(), "Content-Type": "application/json" } }
  );
};
