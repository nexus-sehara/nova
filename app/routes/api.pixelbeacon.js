import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define CORS headers for public endpoint - SIMPLIFIED VERSION
const getCorsHeaders = () => {
  // Always use wildcard for Shopify's web pixel sandboxed environment
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
    "Access-Control-Max-Age": "86400",
  };
};

// Handle preflight OPTIONS requests
export async function options({ request }) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

// Handle GET requests for pixel tracking with image
export async function loader({ request }) {
  const url = new URL(request.url);
  
  // Extract params from query string
  const eventName = url.searchParams.get("event") || "unknown";
  const shop = url.searchParams.get("shop") || "unknown";
  const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
  const accountID = url.searchParams.get("acc") || "unknown";
  const sessionId = url.searchParams.get("id") || `anon-${Date.now()}`;
  
  // Log the event
  console.log(`Received beacon event via GET: ${eventName} from ${shop}, session: ${sessionId}`);
  
  try {
    // 1. Create or update the session
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
    
    // 2. Create ShopifyEvent - ensuring eventName is included
    const shopifyEvent = await prisma.shopifyEvent.create({
      data: {
        eventName,
        shopDomain: shop,
        eventData: { source: "beacon" },
        timestamp,
        sessionId,
      },
    });
    
    // 3. Create a minimal event record
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop,
        eventName,
        eventData: JSON.stringify({ source: "beacon" }),
        accountId: accountID,
        timestamp,
      },
    });
    
    console.log(`Created events: PixelEvent ID: ${pixelEvent.id}, ShopifyEvent ID: ${shopifyEvent.id}, Session ID: ${pixelSession.id}`);
    
    // Return a 1x1 transparent GIF
    const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    
    return new Response(transparentGif, {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      }
    });
  } catch (error) {
    console.error("Error logging beacon event:", error.stack);
    // Still return the transparent GIF to avoid errors in the client
    const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    
    return new Response(transparentGif, {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      }
    });
  }
}

// Handle POST requests for beacon API
export async function action({ request }) {
  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }
  
  try {
    // Try to parse JSON body first
    let eventData;
    
    try {
      eventData = await request.json();
    } catch (parseError) {
      // If JSON parsing fails, try form data
      try {
        const formData = await request.formData();
        eventData = Object.fromEntries(formData.entries());
      } catch (formError) {
        // If both fail, use query params as a last resort
        const url = new URL(request.url);
        eventData = {
          eventName: url.searchParams.get("event") || "unknown",
          shop: url.searchParams.get("shop") || "unknown",
          timestamp: url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date(),
          accountID: url.searchParams.get("acc") || "unknown",
          sessionId: url.searchParams.get("id") || `anon-${Date.now()}`,
        };
      }
    }
    
    // Extract required fields
    const { eventName = "unknown", shop = "unknown", accountID = "unknown" } = eventData;
    const timestamp = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    const sessionId = eventData.sessionId || eventData.clientId || `anon-${Date.now()}`;
    
    console.log(`Received beacon event via POST: ${eventName} from ${shop}, session: ${sessionId}`);
    
    try {
      // 1. Create or update the session
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
      
      // 2. Create ShopifyEvent - ensuring eventName is included
      const shopifyEvent = await prisma.shopifyEvent.create({
        data: {
          eventName,
          shopDomain: shop,
          eventData: eventData.data || { source: "beacon" },
          timestamp,
          sessionId,
        },
      });
      
      // 3. Create a minimal event record
      const pixelEvent = await prisma.pixelEvent.create({
        data: {
          shop,
          eventName,
          eventData: JSON.stringify(eventData.data || { source: "beacon" }),
          accountId: accountID,
          timestamp,
        },
      });
      
      console.log(`Created events: PixelEvent ID: ${pixelEvent.id}, ShopifyEvent ID: ${shopifyEvent.id}, Session ID: ${pixelSession.id}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        eventId: pixelEvent.id,
        sessionId: pixelSession.id 
      }), {
        status: 200,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "application/json",
        }
      });
    } catch (dbError) {
      console.error("Database error processing beacon event:", dbError.stack);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Database error",
        details: dbError.message
      }), {
        status: 500,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "application/json",
        }
      });
    }
  } catch (error) {
    console.error("Error processing beacon event:", error.stack);
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        ...getCorsHeaders(),
        "Content-Type": "application/json",
      }
    });
  }
} 