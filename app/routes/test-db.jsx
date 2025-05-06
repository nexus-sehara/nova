import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";

export async function loader() {
  try {
    console.log("Testing database connection on Render via React route...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    
    const prisma = new PrismaClient();
    
    // Test creating a session
    const sessionId = `test-render-${Date.now()}`;
    
    const session = await prisma.pixelSession.create({
      data: {
        sessionId,
        shopDomain: 'render-react-test.myshopify.com',
        startedAt: new Date(),
        endedAt: new Date()
      }
    });
    
    // Test creating a ShopifyEvent
    const event = await prisma.shopifyEvent.create({
      data: {
        eventName: 'test_event_render_react',
        shopDomain: 'render-react-test.myshopify.com', 
        eventData: { source: 'render-react-test' },
        timestamp: new Date(),
        sessionId
      }
    });
    
    // Test creating a PixelEvent
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop: 'render-react-test.myshopify.com',
        eventName: 'test_event_render_react',
        eventData: JSON.stringify({ source: 'render-react-test' }),
        accountId: 'render-react-test',
        timestamp: new Date()
      }
    });
    
    // Clean up test data to avoid cluttering database
    await prisma.shopifyEvent.delete({
      where: { id: event.id }
    });
    
    await prisma.pixelEvent.delete({
      where: { id: pixelEvent.id }
    });
    
    await prisma.pixelSession.delete({
      where: { id: session.id }
    });
    
    await prisma.$disconnect();
    
    return json({
      success: true,
      message: 'Database test successful on Render',
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set',
      sessionId,
      sessionDbId: session.id,
      eventDbId: event.id,
      pixelEventDbId: pixelEvent.id
    });
  } catch (error) {
    console.error('Database test error on Render:', error);
    
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set'
    }, { status: 500 });
  }
}

export default function TestDbPage() {
  const data = useLoaderData();
  
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Database Connection Test</h1>
      
      <div style={{ background: data.success ? '#d4edda' : '#f8d7da', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <p><strong>Status:</strong> {data.success ? 'Success' : 'Failed'}</p>
        {data.success ? (
          <>
            <p><strong>Message:</strong> {data.message}</p>
            <p><strong>Session ID:</strong> {data.sessionId}</p>
            <p><strong>Session DB ID:</strong> {data.sessionDbId}</p>
            <p><strong>Event DB ID:</strong> {data.eventDbId}</p>
            <p><strong>Pixel Event DB ID:</strong> {data.pixelEventDbId}</p>
          </>
        ) : (
          <>
            <p><strong>Error:</strong> {data.error}</p>
            <p><strong>Stack:</strong> <pre style={{ whiteSpace: 'pre-wrap' }}>{data.stack}</pre></p>
          </>
        )}
        <p><strong>Database URL (truncated):</strong> {data.databaseUrl}</p>
      </div>
      
      <p>If successful, test records were created and then deleted to avoid cluttering the database.</p>
    </div>
  );
} 