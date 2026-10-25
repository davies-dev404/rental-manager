/**
 * Meta (Facebook) Pixel Integration Utility
 * Supports official fbq tracking for PageView, CompleteRegistration, Lead, InitiateCheckout, etc.
 */

let isInitialized = false;
let currentPixelId = null;

export const initMetaPixel = (customPixelId) => {
  if (typeof window === "undefined") return;

  const pixelId =
    customPixelId ||
    import.meta.env.VITE_FACEBOOK_PIXEL_ID ||
    import.meta.env.VITE_META_PIXEL_ID ||
    localStorage.getItem("meta_pixel_id") ||
    "";

  if (!pixelId) {
    return;
  }

  currentPixelId = pixelId;

  // Standard Meta Pixel Code
  if (!window.fbq) {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );
  }

  try {
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
    isInitialized = true;
    console.log(`📊 [Meta Pixel] Initialized with ID: ${pixelId}`);
  } catch (err) {
    console.warn("[Meta Pixel] Initialization warning:", err);
  }
};

/**
 * Track standard or custom Meta Pixel event
 */
export const trackPixelEvent = (eventName, params = {}) => {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", eventName, params);
  } catch (e) {
    console.warn(`[Meta Pixel] Error tracking ${eventName}:`, e);
  }
};

export const trackCustomPixelEvent = (eventName, params = {}) => {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("trackCustom", eventName, params);
  } catch (e) {
    console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, e);
  }
};

export const trackPageView = (path) => {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", "PageView", { path: path || window.location.pathname });
  } catch (e) {
    console.warn("[Meta Pixel] PageView tracking warning:", e);
  }
};

export const trackRegistration = (method = "email") => {
  trackPixelEvent("CompleteRegistration", {
    status: "success",
    registration_method: method,
    currency: "KES"
  });
};

export const trackOnboardingLead = (role, unitsCount, tier) => {
  trackPixelEvent("Lead", {
    content_name: `Onboarding Lead - ${role}`,
    content_category: "Rental Portfolio Setup",
    units_count: unitsCount,
    subscription_tier: tier,
    currency: "KES"
  });
};

export const trackInitiateCheckout = (planName, price) => {
  trackPixelEvent("InitiateCheckout", {
    content_name: planName,
    value: price,
    currency: "KES"
  });
};

export const getMetaPixelId = () => currentPixelId;
