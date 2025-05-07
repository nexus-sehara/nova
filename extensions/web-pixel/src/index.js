import {register} from "@shopify/web-pixels-extension";

register(({ analytics, browser, config }) => {
  // Initialize with account ID from settings or use a default
  const accountID = config?.accountID || 'demo-account';
  console.log(`Web pixel initialized with account ID: ${accountID}`);

  // Shopify sandbox-safe session ID logic
  let sessionId = null;
  if (browser && browser.sessionId) {
    sessionId = browser.sessionId;
  } else if (analytics && analytics.clientId) {
    sessionId = analytics.clientId;
  } else {
    sessionId = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // Try to get user ID if available (Shopify customer ID)
  const getUserId = (event) => {
    if (event.context && event.context.customer && event.context.customer.id) {
      return event.context.customer.id;
    }
    if (event.customer && event.customer.id) {
      return event.customer.id;
    }
    return null;
  };

  const BEACON_ENDPOINTS = [
    'https://nova-ebgc.onrender.com/api/pixel-events',
    'https://nova-ebgc.onrender.com/api/pixel-events.pixel.gif',
  ];

  const getNestedValue = (obj, path, defaultValue = null) => {
    return path.split('.').reduce((acc, part) => acc && acc[part] ? acc[part] : defaultValue, obj);
  };

  const eventTypes = [
    'page_viewed',
    'product_viewed',
    'collection_viewed',
    'search_submitted',
    'product_added_to_cart',
    'product_removed_from_cart',
    'cart_viewed',
    'checkout_started',
    'checkout_completed',
    'payment_info_submitted',
    'customer_account_created',
    'customer_logged_in'
  ];

  const trackEvent = async (eventType, trackingParams) => {
    for (const endpoint of BEACON_ENDPOINTS) {
      try {
        console.log(`Trying to send ${eventType} to ${endpoint}`);
        await fetch(`${endpoint}?${trackingParams.toString()}`, {
          method: 'GET',
          mode: 'no-cors'
        });
        console.log(`Successfully sent ${eventType} event to ${endpoint}`);
        return;
      } catch (error) {
        console.error(`Failed to send to ${endpoint}:`, error);
      }
    }
    console.error(`All endpoints failed for ${eventType} event`);
  };

  eventTypes.forEach(eventType => {
    analytics.subscribe(eventType, (event) => {
      console.log(`${eventType} event detected`, event);
      let shopDomain = 'unknown-shop.myshopify.com';
      const context = event.context || {};
      if (getNestedValue(context, 'document.location.host')) {
        shopDomain = context.document.location.host;
      } else if (getNestedValue(context, 'shop.domain')) {
        shopDomain = context.shop.domain;
      }
      const userId = getUserId(event);
      const trackingParams = new URLSearchParams({
        event: eventType,
        shop: shopDomain,
        ts: Date.now().toString(),
        acc: accountID,
        id: sessionId,
        user_id: userId || '',
      });
      if (eventType === 'product_viewed') {
        const product = getNestedValue(event, 'data.productVariant.product');
        const variant = getNestedValue(event, 'data.productVariant');
        if (product) {
          trackingParams.append('product_id', product.id || '');
          trackingParams.append('product_title', product.title || '');
          trackingParams.append('product_category', product.productType || '');
          trackingParams.append('product_brand', product.vendor || '');
          trackingParams.append('product_price', getNestedValue(variant, 'price.amount', ''));
          trackingParams.append('variant_id', variant?.id || '');
        }
      } else if (eventType === 'product_added_to_cart' || eventType === 'product_removed_from_cart') {
        const cartLine = getNestedValue(event, 'data.cartLine');
        if (cartLine) {
          const merchandise = cartLine.merchandise || {};
          const product = merchandise.product || {};
          trackingParams.append('product_id', product.id || '');
          trackingParams.append('product_title', product.title || '');
          trackingParams.append('product_category', product.productType || '');
          trackingParams.append('product_brand', product.vendor || '');
          trackingParams.append('product_price', getNestedValue(merchandise, 'price.amount', ''));
          trackingParams.append('variant_id', merchandise.id || '');
          trackingParams.append('quantity', cartLine.quantity || '1');
        }
      } else if (eventType === 'checkout_completed') {
        const order = getNestedValue(event, 'data.checkout.order');
        if (order) {
          trackingParams.append('order_id', order.id || '');
          trackingParams.append('order_total', getNestedValue(event, 'data.checkout.totalPrice.amount') || '0');
        }
      }
      trackEvent(eventType, trackingParams);
    });
  });
});
