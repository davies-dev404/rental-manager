export function isMsimamiziHost() {
  if (import.meta.env?.VITE_APP_MODE === "msimamizi") return true;
  if (typeof window === "undefined") return false;
  const host = (window.location.hostname || "").toLowerCase();
  return host === "msimamizi.afrinextech.co.ke" || host.startsWith("msimamizi.");
}

export function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  const host = (window.location.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

export function isMsimamiziPath(pathname = "") {
  return pathname === "/msimamizi" || pathname.startsWith("/msimamizi/");
}

export function isMsimamiziMode(pathname = "") {
  if (isMsimamiziHost()) return true;
  if (isLocalDevHost() && isMsimamiziPath(pathname)) return true;
  return false;
}

export function getAdminBasePath() {
  return isMsimamiziHost() ? "" : "/msimamizi";
}

export function adminHref(subPath = "/") {
  const base = getAdminBasePath();
  const cleanSub = subPath === "/" ? "" : (subPath.startsWith("/") ? subPath : `/${subPath}`);
  if (!base) return cleanSub || "/";
  return `${base}${cleanSub}`;
}
