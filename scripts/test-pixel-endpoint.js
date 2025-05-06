// Simple script to test the pixel endpoints directly

const testPixelBeacon = async () => {
  // Create a test event with all required fields
  const testParams = new URLSearchParams({
    event: 'test_event',
    shop: 'test-shop.myshopify.com',
    ts: Date.now(),
    acc: 'test-account',
    id: `test-${Date.now()}`
  });
  
  const url = `https://nova-ebgc.onrender.com/api/pixel-beacon?${testParams}`;
  
  console.log(`Testing pixel beacon endpoint: ${url}`);
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log('✅ Beacon endpoint test successful!');
    } else {
      console.error(`❌ Beacon endpoint test failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error testing beacon endpoint:', error);
  }
};

// Test function for the direct API endpoint
const testPixelEvents = async () => {
  const testEvent = {
    accountID: 'test-account',
    eventName: 'test_event',
    data: { test: 'data' },
    timestamp: new Date().toISOString(),
    shop: 'test-shop.myshopify.com',
    clientId: `test-${Date.now()}`
  };
  
  console.log(`Testing pixel events endpoint with payload:`, testEvent);
  
  try {
    const response = await fetch('https://nova-ebgc.onrender.com/api/pixel-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Pixel events endpoint test successful!', data);
    } else {
      console.error(`❌ Pixel events endpoint test failed: ${response.status} ${response.statusText}`, data);
    }
  } catch (error) {
    console.error('❌ Error testing pixel events endpoint:', error);
  }
};

// Run the tests
const runTests = async () => {
  console.log('🚀 Starting pixel endpoint tests...');
  console.log('----------------------------------------');
  
  await testPixelBeacon();
  console.log('----------------------------------------');
  
  await testPixelEvents();
  console.log('----------------------------------------');
  
  console.log('Tests completed!');
};

runTests(); 