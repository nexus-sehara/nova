import { redirect } from "@remix-run/node";
import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";

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

export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/app");
  }, [navigate]);
  
  return null;
} 