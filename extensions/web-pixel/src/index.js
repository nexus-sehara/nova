import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, config }) => {
  // Initialize with account ID from settings or use a default
  const accountID = config?.accountID || 'demo-account';
  console.log(`Web pixel initialized with account ID: ${accountID}`);
  
  // Use relative URL for API endpoint - this is important for Shopify's web pixel sandbox
  const API_ENDPOINT = 'https://nova-ebgc.onrender.com/api/pixel-events';
  console.log(`Web pixel configured to send events to: ${API_ENDPOINT}`);

  // Utility function to safely access nested properties
  const getNestedValue = (obj, path, defaultValue = null) => {
    return path.split('.').reduce((acc, part) => acc && acc[part] ? acc[part] : defaultValue, obj);
  };

  // Handle all standard Shopify events
  const eventTypes = [
    'page_viewed',
    'product_viewed',
    'collection_viewed',
    'search_submitted',
    'product_added_to_cart',
    'cart_viewed',
    'checkout_started',
    'checkout_completed',
    'payment_info_submitted',
    'customer_account_created',
    'customer_logged_in'
  ];

  // Subscribe to all events
  eventTypes.forEach(eventType => {
    analytics.subscribe(eventType, (event) => {
      console.log(`${eventType} event detected`, event);
      
      // For specific events, log additional details
      if (eventType === 'product_viewed') {
        const product = getNestedValue(event, 'data.productVariant');
        if (product) {
          console.log(`Product: ${getNestedValue(product, 'product.title', 'unknown')}, Price: ${getNestedValue(product, 'price.amount', 'unknown')}`);
        }
      } else if (eventType === 'checkout_completed') {
        const checkout = getNestedValue(event, 'data.checkout');
        if (checkout) {
          console.log(`Order ID: ${getNestedValue(checkout, 'order.id', 'unknown')}, Total: ${getNestedValue(checkout, 'totalPrice.amount', 'unknown')}`);
        }
      }
      
      // Try to get shop domain from event context
      let shopDomain = 'unknown-shop.myshopify.com';
      const context = event.context || {};
      
      if (getNestedValue(context, 'document.location.host')) {
        shopDomain = context.document.location.host;
      } else if (getNestedValue(context, 'shop.domain')) {
        shopDomain = context.shop.domain;
      }
      
      // Create payload for the API
      const payload = {
        accountID: accountID,
        eventName: eventType,
        data: event.data || {},
        timestamp: new Date().toISOString(),
        shop: shopDomain,
        clientId: event.clientId || event.id || `anonymous-${Date.now()}`
      };
      
      // Log attempted send
      console.log(`Attempting to send ${eventType} event to ${API_ENDPOINT}`);
      
      // Use XMLHttpRequest which is more reliable in the Shopify sandbox
      try {
        // Create a traditional XMLHttpRequest - this is more widely supported in Shopify's sandbox
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Setup callbacks
        xhr.onload = function() {
          if (this.status >= 200 && this.status < 300) {
            console.log(`Successfully sent ${eventType} to API:`, this.responseText);
          } else {
            console.error(`Error sending ${eventType} to API. Status: ${this.status}`, this.responseText);
          }
        };
        
        xhr.onerror = function() {
          console.error(`Network error while sending ${eventType} to API`);
        };
        
        // Send the request
        xhr.send(JSON.stringify(payload));
        
      } catch (error) {
        console.error(`Failed to send ${eventType} event:`, error);
        
        // Fallback to a simple pixel approach if XMLHttpRequest fails
        try {
          const img = new Image();
          const queryParams = `event=${encodeURIComponent(eventType)}&shop=${encodeURIComponent(shopDomain)}&ts=${Date.now()}`;
          img.src = `${API_ENDPOINT}/pixel.gif?${queryParams}`;
          console.log(`Attempted fallback pixel tracking for ${eventType}`);
        } catch (imgError) {
          console.error('Even fallback pixel tracking failed:', imgError);
        }
      }
    });
  });
});
