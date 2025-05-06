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
  
  // Try all possible URLs to find which one works
  const urls = [
    `https://nova-ebgc.onrender.com/api/pixel-beacon?${testParams}`,
    `https://nova-ebgc.onrender.com/api/pixel_beacon?${testParams}`,
    `https://nova-ebgc.onrender.com/api/pixelbeacon?${testParams}`
  ];
  
  for (const url of urls) {
    console.log(`Testing pixel beacon endpoint: ${url}`);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Beacon endpoint test successful for ${url}!`);
      } else {
        console.error(`❌ Beacon endpoint test failed for ${url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error testing beacon endpoint ${url}:`, error);
    }
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
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
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