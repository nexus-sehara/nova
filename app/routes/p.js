// Simplified tracking endpoint with database support
import prisma from "../db.server.js";

export function loader({ request }) {
  const url = new URL(request.url);
  
  // Extract tracking parameters
  const eventName = url.searchParams.get("event") || "unknown";
  const shop = url.searchParams.get("shop") || "unknown";
  const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
  const accountID = url.searchParams.get("acc") || "unknown";
  const sessionId = url.searchParams.get("id") || `anon-${Date.now()}`;
  
  // Log the event
  console.log(`P ROUTE TRACKING: ${eventName} from ${shop}, session: ${sessionId}`);
  
  // Save to database (async but don't await to avoid blocking response)
  saveEventToDatabase(eventName, shop, timestamp, accountID, sessionId).catch(error => {
    console.error("Error saving event to database:", error);
  });
  
  // Return a 1x1 transparent GIF
  const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  
  return new Response(transparentGif, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    }
  });
}

// Function to save event to database
async function saveEventToDatabase(eventName, shop, timestamp, accountID, sessionId) {
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
        eventData: JSON.stringify({ source: "p-route-tracker" }),
        timestamp,
        sessionId,
      },
    });
    
    // 3. Create PixelEvent
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop,
        eventName,
        eventData: JSON.stringify({ source: "p-route-tracker" }),
        accountId: accountID,
        timestamp,
      },
    });
    
    console.log(`Saved events to database: PixelEvent ID ${pixelEvent.id}, ShopifyEvent ID ${shopifyEvent.id}, Session ID ${pixelSession.id}`);
    
    return { pixelEvent, shopifyEvent, pixelSession };
  } catch (error) {
    console.error("Database error in p route tracking:", error);
    throw error;
  }
} 