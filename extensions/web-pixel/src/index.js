import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, config }) => {
  // Initialize with account ID from settings or use a default
  const accountID = config?.accountID || 'demo-account';
  console.log(`Web pixel initialized with account ID: ${accountID}`);
  
  // Define endpoint for tracking
  const BEACON_ENDPOINT = 'https://nova-ebgc.onrender.com/api/pixel_beacon';
  
  console.log(`Web pixel configured to send events to: ${BEACON_ENDPOINT}`);

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
      
      // Generate tracking parameters
      const trackingParams = new URLSearchParams({
        event: eventType,
        shop: shopDomain,
        ts: Date.now().toString(),
        acc: accountID,
        id: event.id || event.clientId || `anon-${Date.now()}`
      });
      
      // Add additional data for specific events
      if (eventType === 'product_viewed') {
        const product = getNestedValue(event, 'data.productVariant.product');
        if (product) {
          trackingParams.append('product_id', product.id || '');
          trackingParams.append('product_title', product.title || '');
        }
      } else if (eventType === 'checkout_completed') {
        const order = getNestedValue(event, 'data.checkout.order');
        if (order) {
          trackingParams.append('order_id', order.id || '');
          trackingParams.append('order_total', getNestedValue(event, 'data.checkout.totalPrice.amount') || '0');
        }
      }
      
      console.log(`Sending ${eventType} event to ${BEACON_ENDPOINT}`);
      
      // Use fetch with no-cors mode - this is proven to work in Shopify's sandbox
      try {
        fetch(`${BEACON_ENDPOINT}?${trackingParams.toString()}`, {
          method: 'GET',
          mode: 'no-cors' // Critical for Shopify's sandbox environment
        })
        .then(() => {
          console.log(`Successfully sent ${eventType} event`);
        })
        .catch(error => {
          console.error(`Error sending ${eventType} event:`, error);
        });
      } catch (error) {
        console.error(`Failed to set up fetch for ${eventType} event:`, error);
      }
    });
  });
});
