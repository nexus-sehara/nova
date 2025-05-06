import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
  try {
    // Parse the event data from the request
    const eventData = await request.json();
    
    // Log the incoming webhook data
    console.log("Received pixel event webhook:", JSON.stringify(eventData, null, 2));
    
    // Extract shop and event information
    const { shop, eventName, event_type, accountID, timestamp, data } = eventData;
    
    if (!shop || !(eventName || event_type) || !timestamp) {
      console.error("Missing required fields in pixel event webhook");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use event_type if eventName is not available
    const finalEventName = eventName || event_type;
    
    try {
      // Try to store the event in the database
      const event = await prisma.pixelEvent.create({
        data: {
          shop: shop,
          eventName: finalEventName,
          eventData: JSON.stringify(data || {}),
          accountId: accountID || "unknown",
          timestamp: new Date(timestamp),
        },
      });

      console.log(`Stored pixel event webhook: ${finalEventName} for shop ${shop}`);

      return new Response(
        JSON.stringify({ success: true, eventId: event.id }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      // If there's a database error (like table doesn't exist), log it but don't fail the request
      console.error("Database error storing pixel event webhook:", dbError);
      
      // Still return a success response to the client
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "Event logged but not stored in database. Database may not be set up yet.",
          dbError: dbError.message
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error processing pixel event webhook:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Handle GET requests (for testing the endpoint)
export const loader = async ({ request }) => {
  return new Response(
    JSON.stringify({ message: "Pixel events webhook endpoint is working" }),
    { headers: { "Content-Type": "application/json" } }
  );
};
