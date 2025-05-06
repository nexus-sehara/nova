import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, config }) => {
  // Initialize with account ID from settings or use a default
  const accountID = config?.accountID || 'demo-account';
  console.log(`Web pixel initialized with account ID: ${accountID}`);
  
  // Define endpoints for different fallback mechanisms
  const API_ENDPOINT = 'https://nova-ebgc.onrender.com/api/pixel-events';
  const BEACON_ENDPOINT = 'https://nova-ebgc.onrender.com/api/pixel-beacon';
  
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
      
      console.log(`Attempting to send ${eventType} event to ${API_ENDPOINT}`);
      
      // Try multiple approaches in sequence - optimized for Shopify sandbox environment
      
      // Approach 1: Use fetch with no-cors mode - this works in the Shopify sandbox
      const sendWithFetch = () => {
        return new Promise((resolve, reject) => {
          try {
            // Using fetch with no-cors mode to avoid CORS issues in the sandbox
            fetch(`${BEACON_ENDPOINT}?event=${encodeURIComponent(eventType)}&shop=${encodeURIComponent(shopDomain)}&ts=${Date.now()}&acc=${encodeURIComponent(accountID)}`, {
              method: 'GET',
              mode: 'no-cors' // Critical: Use no-cors mode for sandbox environment
            })
            .then(() => {
              console.log(`Successfully sent ${eventType} with query params`);
              resolve(true);
            })
            .catch(error => {
              console.error(`Fetch error for ${eventType}:`, error);
              reject(error);
            });
          } catch (error) {
            console.error(`Fetch setup error for ${eventType}:`, error);
            reject(error);
          }
        });
      };
      
      // Approach 2: XMLHttpRequest as fallback
      const sendWithXhr = () => {
        return new Promise((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_ENDPOINT, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
              if (this.status >= 200 && this.status < 300) {
                console.log(`Successfully sent ${eventType} with XMLHttpRequest`);
                resolve(true);
              } else {
                console.error(`Error sending ${eventType}. Status: ${this.status}`);
                reject(new Error(`HTTP status ${this.status}`));
              }
            };
            
            xhr.onerror = function() {
              console.error(`Network error while sending ${eventType}`);
              reject(new Error('Network error'));
            };
            
            xhr.send(JSON.stringify(payload));
          } catch (error) {
            console.error(`XHR error for ${eventType}:`, error);
            reject(error);
          }
        });
      };
      
      // Start with fetch with no-cors which works well in sandboxed environments,
      // then try XMLHttpRequest as a fallback
      sendWithFetch().catch(() => sendWithXhr()).catch(finalError => {
        console.error(`All tracking methods failed for ${eventType}:`, finalError);
      });
    });
  });
});
