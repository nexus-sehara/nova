import { PrismaClient } from "@prisma/client";

export async function loader({ request }) {
  try {
    console.log("Testing database connection on Render...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    
    const prisma = new PrismaClient();
    
    // Test creating a session
    const sessionId = `test-render-${Date.now()}`;
    
    const session = await prisma.pixelSession.create({
      data: {
        sessionId,
        shopDomain: 'render-test.myshopify.com',
        startedAt: new Date(),
        endedAt: new Date()
      }
    });
    
    // Test creating a ShopifyEvent
    const event = await prisma.shopifyEvent.create({
      data: {
        eventName: 'test_event_render',
        shopDomain: 'render-test.myshopify.com', 
        eventData: { source: 'render-test' },
        timestamp: new Date(),
        sessionId
      }
    });
    
    // Test creating a PixelEvent
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop: 'render-test.myshopify.com',
        eventName: 'test_event_render',
        eventData: JSON.stringify({ source: 'render-test' }),
        accountId: 'render-test',
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
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Database test successful on Render',
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set',
      sessionId,
      sessionDbId: session.id,
      eventDbId: event.id,
      pixelEventDbId: pixelEvent.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Database test error on Render:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 