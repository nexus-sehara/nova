// Direct test of database operations
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Create a PixelSession
    const sessionId = `test-session-${Date.now()}`;
    
    console.log('Creating test session with ID:', sessionId);
    
    const session = await prisma.pixelSession.create({
      data: {
        sessionId: sessionId,
        shopDomain: 'test-shop.myshopify.com',
        startedAt: new Date(),
        endedAt: new Date()
      }
    });
    
    console.log('✅ Session created successfully:', session);
    
    // Test 2: Create a ShopifyEvent
    console.log('Creating test ShopifyEvent...');
    
    const event = await prisma.shopifyEvent.create({
      data: {
        eventName: 'test_event',
        shopDomain: 'test-shop.myshopify.com', 
        eventData: { source: 'test' },
        timestamp: new Date(),
        sessionId: sessionId
      }
    });
    
    console.log('✅ ShopifyEvent created successfully:', event);
    
    // Test 3: Create a PixelEvent
    console.log('Creating test PixelEvent...');
    
    const pixelEvent = await prisma.pixelEvent.create({
      data: {
        shop: 'test-shop.myshopify.com',
        eventName: 'test_event',
        eventData: JSON.stringify({ source: 'test' }),
        accountId: 'test-account',
        timestamp: new Date()
      }
    });
    
    console.log('✅ PixelEvent created successfully:', pixelEvent);
    
    // Clean up the test data
    console.log('Cleaning up test data...');
    
    await prisma.shopifyEvent.delete({
      where: { id: event.id }
    });
    
    await prisma.pixelEvent.delete({
      where: { id: pixelEvent.id }
    });
    
    await prisma.pixelSession.delete({
      where: { id: session.id }
    });
    
    console.log('✅ Test data cleaned up successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 