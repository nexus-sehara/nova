import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, init, settings }) => {
    // Log the browser object to inspect its properties
    console.log("Inspecting browser object:", browser);
    if (browser) {
      console.log("browser.fetch type:", typeof browser.fetch);
    }

    // Initialize with your account ID from settings
    const accountID = settings.accountID || 'demo-account';
    console.log(`Web pixel initialized with account ID: ${accountID}`);

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
      console.log(`Product: ${product.title}, Price: ${product.price.amount}`);
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
      console.log(`Added ${cartLine.quantity} of ${cartLine.merchandise.product.title}`);
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
      console.log(`Order ID: ${checkout.order.id}, Total: ${checkout.totalPrice.amount}`);
      sendToAnalytics('checkout_completed', event);
    });

    // ===== SEARCH EVENTS =====
    
    // Triggered when a search is performed
    analytics.subscribe('search_submitted', (event) => {
      console.log('Search submitted', event);
      console.log(`Search query: ${event.data.searchResult.query}`);
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
      data: eventData, // This includes the full event object from Shopify
      timestamp: new Date().toISOString(),
      shop: shopDomain,
      // Include clientId for session tracking, it's often in eventData.clientId
      clientId: eventData.clientId 
    };

    console.log(`Sending ${eventName} event via BROWSER fetch to API for shop ${shopDomain}`);
    
    const apiUrl = 'https://coral-annex-gmt-proceeds.trycloudflare.com/api/pixel-events'; // <-- UPDATED URL

    if (!browser || typeof browser.fetch !== 'function') {
      console.error('browser.fetch is not available or not a function. Cannot send analytics event. Type:', typeof browser.fetch);
      return; // Exit if browser.fetch is not usable
    }

    browser.fetch(apiUrl, { // <-- USE browser.fetch AND UPDATED URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}. Response body: ${text}`);
        });
      }
      return response.json(); 
    })
    .then(data => {
      console.log(`Successfully sent ${eventName} to API:`, data);
    })
    .catch(error => {
      console.error(`Error sending ${eventName} event to API using browser.fetch:`, error);
    });

  } catch (error) {
    console.error(`Error in sendToAnalytics (before fetch) for ${eventName}:`, error);
  }
}
});
