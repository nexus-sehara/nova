// JavaScript module for querying the database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Query all sessions
    console.log('=== PIXEL SESSIONS ===');
    const sessions = await prisma.pixelSession.findMany({
      orderBy: { endedAt: 'desc' },
      take: 10
    });
    console.log(JSON.stringify(sessions, null, 2));
    console.log(`Total sessions: ${sessions.length}`);
    
    // Query all events
    console.log('\n=== SHOPIFY EVENTS ===');
    const events = await prisma.shopifyEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    console.log(JSON.stringify(events, null, 2));
    console.log(`Total events: ${events.length}`);
    
    // Query all pixel events
    console.log('\n=== PIXEL EVENTS ===');
    const pixelEvents = await prisma.pixelEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    console.log(JSON.stringify(pixelEvents, null, 2));
    console.log(`Total pixel events: ${pixelEvents.length}`);
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 