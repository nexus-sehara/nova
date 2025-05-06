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
      
      // Try multiple approaches in sequence - if one fails, try another
      
      // Approach 1: Use XMLHttpRequest (works in some Shopify sandbox contexts)
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
      
      // Approach 2: Try Beacon API (works in some browsers but not sandboxed environments)
      const sendWithBeacon = () => {
        return new Promise((resolve, reject) => {
          try {
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
              const success = navigator.sendBeacon(BEACON_ENDPOINT, JSON.stringify(payload));
              if (success) {
                console.log(`Successfully sent ${eventType} with Beacon API`);
                resolve(true);
              } else {
                console.error(`Failed to send ${eventType} with Beacon API`);
                reject(new Error('Beacon failed'));
              }
            } else {
              reject(new Error('Beacon API not available'));
            }
          } catch (error) {
            console.error(`Beacon error for ${eventType}:`, error);
            reject(error);
          }
        });
      };
      
      // Approach 3: URL with query params (works in most sandboxed environments)
      const sendWithQueryParams = () => {
        return new Promise((resolve, reject) => {
          try {
            // Build URL with parameters
            const params = new URLSearchParams({
              event: eventType,
              shop: shopDomain,
              ts: Date.now(),
              acc: accountID
            });
            
            // Use fetch to make a GET request as a last resort
            fetch(`${BEACON_ENDPOINT}?${params.toString()}`, {
              method: 'GET',
              mode: 'no-cors' // This helps with CORS issues
            })
            .then(() => {
              console.log(`Successfully sent ${eventType} with query params`);
              resolve(true);
            })
            .catch(error => {
              console.error(`Query params fetch error for ${eventType}:`, error);
              reject(error);
            });
          } catch (error) {
            console.error(`Query params error for ${eventType}:`, error);
            reject(error);
          }
        });
      };
      
      // Try each method in sequence, falling back to the next if one fails
      sendWithXhr().catch(() => sendWithBeacon()).catch(() => sendWithQueryParams()).catch(finalError => {
        console.error(`All tracking methods failed for ${eventType}:`, finalError);
      });
    });
  });
});
