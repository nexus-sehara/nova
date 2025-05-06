import prisma from "../db.server.js";

// Transparent 1x1 GIF, base64-encoded
const TRANSPARENT_GIF = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

export const loader = async ({ request }) => {
  // Parse the URL to get query parameters
  const url = new URL(request.url);
  const event = url.searchParams.get('event');
  const shop = url.searchParams.get('shop');
  const timestamp = url.searchParams.get('ts') || Date.now();
  const accountID = url.searchParams.get('acc') || "unknown";
  const sessionId = url.searchParams.get('id') || `anon-${Date.now()}`;
  
  // Log the pixel request
  console.log(`Pixel tracking request received - Event: ${event}, Shop: ${shop}, Timestamp: ${timestamp}`);
  
  try {
    // If we have event and shop data, try to store it
    if (event && shop) {
      // 1. Create or update session
      const pixelSession = await prisma.pixelSession.upsert({
        where: { sessionId },
        update: { 
          endedAt: new Date(Number(timestamp)),
        },
        create: {
          sessionId,
          shopDomain: shop,
          startedAt: new Date(Number(timestamp)),
          endedAt: new Date(Number(timestamp)),
        },
      });
      
      // 2. Create ShopifyEvent
      const shopifyEvent = await prisma.shopifyEvent.create({
        data: {
          eventName: event,
          shopDomain: shop,
          eventData: JSON.stringify({ source: "pixel-gif" }),
          timestamp: new Date(Number(timestamp)),
          sessionId,
        },
      });
      
      // 3. Create PixelEvent
      const pixelEvent = await prisma.pixelEvent.create({
        data: {
          shop: shop,
          eventName: event,
          eventData: JSON.stringify({ source: "pixel-gif" }),
          accountId: accountID,
          timestamp: new Date(Number(timestamp)),
        }
      });
      
      console.log(`Stored pixel tracking event: ${event} for shop ${shop} - PixelEvent ID ${pixelEvent.id}, ShopifyEvent ID ${shopifyEvent.id}, Session ID ${pixelSession.id}`);
    }
  } catch (error) {
    // Just log the error but still return the GIF
    console.error("Error storing pixel tracking event:", error);
  }
  
  // Always return the transparent GIF with appropriate cache headers
  return new Response(Buffer.from(TRANSPARENT_GIF, 'base64'), {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    }
  });
}; 