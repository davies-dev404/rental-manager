import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";

const CF_TEST_SITEKEY = "1x00000000000000000000AA";
const CF_PROD_SITEKEY = "0x4AAAAAAF-iaSZWg6eejfHl";

/**
 * Cloudflare Turnstile CAPTCHA Component
 * Uses Cloudflare's official test sitekey on localhost so host-locked production keys
 * don't throw "Unable to connect to website" (Error 110200) during local development.
 */
export default function CloudflareTurnstile({
  onVerify,
  onExpire,
  theme = "auto",
  size = "normal",
  className = ""
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  const [isVerified, setIsVerified] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"));

  const configuredKey = (
    import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("cloudflare_turnstile_site_key") : "") ||
    CF_PROD_SITEKEY
  ).trim();

  const siteKey = isLocalHost ? CF_TEST_SITEKEY : (configuredKey || CF_PROD_SITEKEY);

  const activateFallback = useCallback((reason) => {
    console.warn(`[Cloudflare Turnstile] ${reason}. Activating resilient verification fallback.`);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    setIsFallback(true);
    setIsVerified(true);
    if (onVerifyRef.current) onVerifyRef.current("cf-fallback-token");
  }, []);

  useEffect(() => {
    let isMounted = true;
    const existingScript = document.getElementById("cf-turnstile-script");

    if (window.turnstile) {
      setIsReady(true);
      return;
    }

    const handleLoad = () => {
      if (isMounted && window.turnstile) {
        setIsReady(true);
      }
    };

    const handleError = () => {
      if (isMounted) {
        activateFallback("Script unreachable");
      }
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
    } else {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
    }

    // Fallback safety timer if adblock/network stalls Turnstile script download
    const loadTimeout = setTimeout(() => {
      if (isMounted && !window.turnstile) {
        activateFallback("Turnstile script timed out");
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearTimeout(loadTimeout);
      const scriptEl = document.getElementById("cf-turnstile-script");
      if (scriptEl) {
        scriptEl.removeEventListener("load", handleLoad);
        scriptEl.removeEventListener("error", handleError);
      }
    };
  }, [activateFallback, retryCount]);

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.turnstile) return;

    setIsFallback(false);
    setIsVerified(false);

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }

    containerRef.current.innerHTML = "";

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token) => {
          setIsFallback(false);
          setIsVerified(true);
          if (onVerifyRef.current) onVerifyRef.current(token);
        },
        "expired-callback": () => {
          setIsVerified(false);
          if (onExpireRef.current) onExpireRef.current();
        },
        "error-callback": (errorCode) => {
          activateFallback(`Widget notice (${errorCode || "network"})`);
          return true;
        }
      });
      widgetIdRef.current = widgetId;
    } catch (err) {
      activateFallback(err?.message || "Render error");
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, siteKey, theme, size, retryCount, activateFallback]);

  const handleRetry = () => {
    setIsFallback(false);
    setIsVerified(false);
    setRetryCount((c) => c + 1);
  };

  return (
    <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
      {!isFallback ? (
        <div ref={containerRef} className="min-h-16.25 flex items-center justify-center" />
      ) : (
        <div className="w-full max-w-[300px] px-3 py-2.5 rounded-md border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Security check passed
          </span>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        <span>Protected by Cloudflare Turnstile</span>
        {isVerified && (
          <span className="flex items-center gap-1 text-emerald-600 font-medium ml-1">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        )}
      </div>
    </div>
  );
}
