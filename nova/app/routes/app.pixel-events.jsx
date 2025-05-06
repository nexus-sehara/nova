import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  EmptyState,
  Spinner,
  Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Check if the PixelEvent table exists by attempting to query it
    let events = [];
    let tableExists = true;
    
    try {
      events = await prisma.pixelEvent.findMany({
        where: {
          shop: session.shop
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });
    } catch (error) {
      // If the table doesn't exist yet, we'll get an error
      tableExists = false;
      console.error("Error querying PixelEvent table:", error);
    }
    
    return json({
      events,
      tableExists,
      shop: session.shop
    });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ 
      events: [],
      tableExists: false,
      error: error.message,
      shop: session?.shop || "unknown"
    });
  }
};

export default function PixelEvents() {
  const { events, tableExists, error, shop } = useLoaderData();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Format the event data for the DataTable
  const rows = events.map(event => [
    new Date(event.timestamp).toLocaleString(),
    event.eventName,
    event.accountId,
    event.eventData.length > 100 ? event.eventData.substring(0, 100) + "..." : event.eventData
  ]);
  
  const runMigration = async () => {
    setIsLoading(true);
    setMessage("");
    
    try {
      const response = await fetch("/api/run-migration", {
        method: "POST"
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage("Migration successful! Refresh the page to see events.");
      } else {
        setMessage(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Page title="Pixel Events">
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <Text variant="headingMd">Web Pixel Events for {shop}</Text>
              <Text variant="bodyMd">
                This page shows events collected from your web pixel extension.
              </Text>
            </Card.Section>
            
            {error && (
              <Card.Section>
                <Banner status="critical">
                  Error: {error}
                </Banner>
              </Card.Section>
            )}
            
            {!tableExists && (
              <Card.Section>
                <Banner status="warning">
                  The PixelEvent table doesn't exist yet. You need to run the Prisma migration.
                </Banner>
                <div style={{ marginTop: "1rem" }}>
                  <Text variant="bodyMd">
                    To run the migration manually, open a terminal in your project directory and run:
                  </Text>
                  <div style={{ 
                    backgroundColor: "#f4f6f8", 
                    padding: "0.5rem", 
                    borderRadius: "4px",
                    marginTop: "0.5rem",
                    fontFamily: "monospace"
                  }}>
                    npx prisma migrate dev --name add-pixel-events
                  </div>
                </div>
              </Card.Section>
            )}
            
            {message && (
              <Card.Section>
                <Banner status={message.includes("successful") ? "success" : "warning"}>
                  {message}
                </Banner>
              </Card.Section>
            )}
            
            <Card.Section>
              {events.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Timestamp", "Event", "Account ID", "Data"]}
                  rows={rows}
                />
              ) : (
                <EmptyState
                  heading="No events found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {tableExists
                      ? "No pixel events have been collected yet. Browse your store to generate events."
                      : "Run the Prisma migration to create the events table."}
                  </p>
                </EmptyState>
              )}
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
