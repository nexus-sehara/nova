import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  return json({
    success: true,
    message: "API recommendations test route is working",
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}; 