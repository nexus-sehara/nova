// Simplified tracking endpoint

export function loader() {
  console.log("TRACKING PIXEL LOADED");
  
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