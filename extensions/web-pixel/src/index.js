import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, init, settings }) => {
    // Initialize with your account ID from settings
    const accountID = settings.accountID || 'demo-account';
    console.log(`Web pixel initialized with account ID: ${accountID}`);
    
    // Configure API endpoint - using a variable allows easier changes later
    const API_BASE_URL = settings.apiBaseUrl || 'https://nova-ebgc.onrender.com';
    const API_ENDPOINT = `${API_BASE_URL}/api/pixel-events`;
    
    console.log(`Web pixel configured to send events to: ${API_ENDPOINT}`);

    // ===== CUSTOMER EVENTS =====
    
    // Triggered when a customer views a page
    analytics.subscribe('page_viewed', (event) => {
      console.log('Page viewed', event);
      sendToAnalytics('page_viewed', event);
    });

    // Triggered when a customer creates an account
    analytics.subscribe('customer_account_created', (event) => {
      console.log('Customer account created', event);
      sendToAnalytics('customer_account_created', event);
    });
    
    // Triggered when a customer logs in
    analytics.subscribe('customer_logged_in', (event) => {
      console.log('Customer logged in', event);
      sendToAnalytics('customer_logged_in', event);
    });

    // ===== PRODUCT EVENTS =====
    
    // Triggered when a product is viewed
    analytics.subscribe('product_viewed', (event) => {
      console.log('Product viewed', event);
      // Access product details
      const product = event.data.productVariant;
      console.log(`Product: ${product?.title || 'unknown'}, Price: ${product?.price?.amount || 'unknown'}`);
      sendToAnalytics('product_viewed', event);
    });
    
    // Triggered when a collection is viewed
    analytics.subscribe('collection_viewed', (event) => {
      console.log('Collection viewed', event);
      sendToAnalytics('collection_viewed', event);
    });
    
    // ===== CART EVENTS =====
    
    // Triggered when a product is added to cart
    analytics.subscribe('product_added_to_cart', (event) => {
      console.log('Product added to cart', event);
      // Access cart details
      const cartLine = event.data.cartLine;
      if (cartLine) {
        console.log(`Added ${cartLine.quantity} of ${cartLine.merchandise?.product?.title || 'unknown product'}`);
      }
      sendToAnalytics('product_added_to_cart', event);
    });
    
    // Triggered when cart is viewed
    analytics.subscribe('cart_viewed', (event) => {
      console.log('Cart viewed', event);
      sendToAnalytics('cart_viewed', event);
    });
    
    // ===== CHECKOUT EVENTS =====
    
    // Triggered when checkout is started
    analytics.subscribe('checkout_started', (event) => {
      console.log('Checkout started', event);
      sendToAnalytics('checkout_started', event);
    });
    
    // Triggered when checkout is completed (purchase made)
    analytics.subscribe('checkout_completed', (event) => {
      console.log('Checkout completed', event);
      // Access order details
      const checkout = event.data.checkout;
      if (checkout?.order) {
        console.log(`Order ID: ${checkout.order.id || 'unknown'}, Total: ${checkout.totalPrice?.amount || 'unknown'}`);
      }
      sendToAnalytics('checkout_completed', event);
    });

    // ===== SEARCH EVENTS =====
    
    // Triggered when a search is performed
    analytics.subscribe('search_submitted', (event) => {
      console.log('Search submitted', event);
      if (event.data.searchResult) {
        console.log(`Search query: ${event.data.searchResult.query || 'unknown'}`);
      }
      sendToAnalytics('search_submitted', event);
    });

// Helper function to send data to your analytics service
function sendToAnalytics(eventName, eventData) {
  try {
    // Get shop domain from the event context if available
    let shopDomain = 'mysmartap.myshopify.com'; // Default fallback
    
    // Try to get shop from different possible locations in the event data
    if (eventData.context && eventData.context.document && eventData.context.document.location) {
      shopDomain = eventData.context.document.location.host;
    } else if (eventData.context && eventData.context.shop) { // Deprecated, but good fallback
      shopDomain = eventData.context.shop.domain;
    }

    // Create the payload with all necessary data
    const payload = {
      accountID: accountID, // accountID is defined in the outer scope
      eventName: eventName,
      name: eventName, // Include name for backward compatibility
      data: eventData, // This includes the full event object from Shopify
      timestamp: new Date().toISOString(),
      shop: shopDomain,
      // Include clientId for session tracking, it's often in eventData.clientId
      clientId: eventData.clientId 
    };

    console.log(`Sending ${eventName} event to API for shop ${shopDomain}`);
    
    // Check if browser.fetch is available
    if (!browser || typeof browser.fetch !== 'function') {
      console.error('Browser fetch API not available. Cannot send analytics event.');
      return;
    }

    // Retry logic for resiliency
    let retries = 0;
    const maxRetries = 3;
    
    const sendWithRetry = () => {
      browser.fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! Status: ${response.status}. Response: ${text}`);
          });
        }
        return response.json(); 
      })
      .then(data => {
        console.log(`Successfully sent ${eventName} to API:`, data);
      })
      .catch(error => {
        console.error(`Error sending ${eventName} event to API:`, error);
        
        // Implement retry logic
        if (retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 100; // Exponential backoff
          console.log(`Retrying in ${delay}ms... (Attempt ${retries} of ${maxRetries})`);
          
          setTimeout(sendWithRetry, delay);
        } else {
          console.error(`Failed to send ${eventName} after ${maxRetries} attempts.`);
        }
      });
    };
    
    // Start the send process
    sendWithRetry();

  } catch (error) {
    console.error(`Error in sendToAnalytics for ${eventName}:`, error);
  }
}
});
