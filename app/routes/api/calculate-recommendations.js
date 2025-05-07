import { authenticate } from "../../shopify.server";
import { RecommendationEngine } from "~/services/recommendationEngine.server";

/**
 * Admin-only API endpoint that triggers the calculation of product recommendations
 * This should be called periodically to keep recommendations fresh
 */
export async function action({ request }) {
  try {
    // 1. Authenticate the request (admin only)
    const { admin, session } = await authenticate.admin(request);
    const shop = session?.shop;

    if (!shop) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Start the recommendation calculation in the background
    // Note: In a production app, this would be a job queue task
    // For this example, we'll start it and return immediately
    Promise.resolve().then(async () => {
      try {
        await RecommendationEngine.calculateRecommendations(shop);
        console.log(`Finished calculating recommendations for ${shop}`);
      } catch (error) {
        console.error(`Error calculating recommendations for ${shop}:`, error);
      }
    });

    // 3. Return a success response immediately
    return new Response(
      JSON.stringify({
        success: true,
        message: "Recommendation calculation started. This may take several minutes."
      }),
      { 
        status: 202, // Accepted
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in calculate-recommendations:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Also support GET for testing in the browser
export async function loader({ request }) {
  // For GET requests, redirect to the action handler
  const response = await action({ request });
  return response;
} 