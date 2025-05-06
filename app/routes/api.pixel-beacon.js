import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to create CORS headers for Shopify Web Pixels (including null origins)
const getCorsHeaders = (origin) => {
  // Shopify's sandboxed environments often send requests with "null" origin
  // We need to handle this specific case while still being secure
  if (!origin || origin === "null") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
      "Access-Control-Max-Age": "86400",
    };
  }
  
  // For non-null origins, reflect back the requesting origin
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
    "Access-Control-Max-Age": "86400",
  };
};

// Handle preflight OPTIONS requests
export async function options({ request }) {
  const origin = request.headers.get("Origin");
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Handle GET requests for pixel tracking with image
export async function loader({ request }) {
  const origin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  
  // Extract params from query string
  const eventName = url.searchParams.get("event") || "unknown";
  const shop = url.searchParams.get("shop") || "unknown";
  const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
  const accountID = url.searchParams.get("acc") || "unknown";
  
  // Log the event
  console.log(`Received beacon event via GET: ${eventName} from ${shop}`);
  
  try {
    // Create a minimal event record
    await prisma.pixelEvent.create({
      data: {
        shop: shop,
        eventName: eventName,
        eventData: JSON.stringify({ source: "beacon" }),
        accountId: accountID,
        timestamp: timestamp,
      },
    });
    
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
  } catch (error) {
    console.error("Error logging beacon event:", error);
    // Still return the transparent GIF to avoid errors in the client
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
}

// Handle POST requests for beacon API
export async function action({ request }) {
  const origin = request.headers.get("Origin") || "*";
  
  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
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
        };
      }
    }
    
    // Extract required fields
    const { eventName = "unknown", shop = "unknown", accountID = "unknown" } = eventData;
    const timestamp = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    
    console.log(`Received beacon event via POST: ${eventName} from ${shop}`);
    
    // Create a minimal event record
    await prisma.pixelEvent.create({
      data: {
        shop: shop,
        eventName: eventName,
        eventData: JSON.stringify(eventData.data || { source: "beacon" }),
        accountId: accountID,
        timestamp: timestamp,
      },
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      }
    });
  } catch (error) {
    console.error("Error processing beacon event:", error);
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      }
    });
  }
} 