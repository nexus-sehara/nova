import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Transparent 1x1 GIF, base64-encoded
const TRANSPARENT_GIF = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

export const loader = async ({ request }) => {
  // Parse the URL to get query parameters
  const url = new URL(request.url);
  const event = url.searchParams.get('event');
  const shop = url.searchParams.get('shop');
  const timestamp = url.searchParams.get('ts') || Date.now();
  
  // Log the pixel request
  console.log(`Pixel tracking request received - Event: ${event}, Shop: ${shop}, Timestamp: ${timestamp}`);
  
  try {
    // If we have event and shop data, try to store it
    if (event && shop) {
      // Store in PixelEvent table
      await prisma.pixelEvent.create({
        data: {
          shop: shop,
          eventName: event,
          eventData: "{}",  // No data available in pixel tracking
          accountId: "pixel-fallback",
          timestamp: new Date(Number(timestamp)),
        }
      });
      
      console.log(`Stored pixel tracking event: ${event} for shop ${shop}`);
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
      'Expires': '0'
    }
  });
}; 