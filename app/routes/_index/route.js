import { redirect } from "@remix-run/node";
import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function loader({ request }) {
  // Check if this is a tracking request
  const url = new URL(request.url);
  const isTrackingRequest = url.searchParams.has('event');
  
  if (isTrackingRequest) {
    // Extract tracking parameters
    const eventName = url.searchParams.get("event") || "unknown";
    const shop = url.searchParams.get("shop") || "unknown";
    const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
    const accountID = url.searchParams.get("acc") || "unknown";
    const sessionId = url.searchParams.get("id") || `anon-${Date.now()}`;
    
    // Log the tracking event
    console.log(`ROOT TRACKING: ${eventName} from ${shop}, session: ${sessionId}, timestamp: ${timestamp}`);
    
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
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      }
    });
  }
  
  // Normal behavior - redirect to /app
  return redirect("/app");
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
        eventData: { source: "root-tracker" },
        timestamp,
        sessionId,
      },
    });
    
    // 3. Create PixelEvent
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop,
        eventName,
        eventData: JSON.stringify({ source: "root-tracker" }),
        accountId: accountID,
        timestamp,
      },
    });
    
    console.log(`Saved events to database: PixelEvent ID ${pixelEvent.id}, ShopifyEvent ID ${shopifyEvent.id}, Session ID ${pixelSession.id}`);
    
    return { pixelEvent, shopifyEvent, pixelSession };
  } catch (error) {
    console.error("Database error in root tracking:", error);
    throw error;
  }
}

export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/app");
  }, [navigate]);
  
  return null;
} 