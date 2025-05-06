// Simple endpoint that just returns success and logs events

export async function loader({ request }) {
  // Extract query parameters
  const url = new URL(request.url);
  const eventName = url.searchParams.get("event") || "unknown";
  const shop = url.searchParams.get("shop") || "unknown";
  const timestamp = url.searchParams.get("ts") ? new Date(parseInt(url.searchParams.get("ts"))) : new Date();
  const accountID = url.searchParams.get("acc") || "unknown";
  const sessionId = url.searchParams.get("id") || `anon-${Date.now()}`;
  
  // Log the event
  console.log(`SIMPLE TAG: Received event: ${eventName} from ${shop}, session: ${sessionId}, timestamp: ${timestamp}`);
  
  // Return a 1x1 transparent GIF
  const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  
  return new Response(transparentGif, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    }
  });
}

// Handle preflight OPTIONS requests
export async function options({ request }) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Origin, Accept",
      "Access-Control-Max-Age": "86400",
    }
  });
} 