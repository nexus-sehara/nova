import { authenticate } from "../shopify.server";
import { getShopSpecificCSPHeaders } from "../utils/csp-headers";

export const loader = async ({ request }) => {
  console.log("Auth route accessed with URL:", request.url);
  console.log("Headers:", Object.fromEntries([...request.headers.entries()]));
  
  try {
    const result = await authenticate.admin(request);
    console.log("Authentication successful:", !!result);
    return null;
  } catch (error) {
    console.error("Authentication error:", error.message);
    throw error;
  }
};

export const headers = ({ request }) => {
  return {
    ...getShopSpecificCSPHeaders(request),
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache"
  };
};
