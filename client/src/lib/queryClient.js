import { QueryClient } from "@tanstack/react-query";

const CACHE_KEY_PREFIX = "makaziflow_rq_cache_v1_";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MAX_ENTRY_BYTES = 400 * 1024; // 400KB per query entry
const MAX_TOTAL_BYTES = 2 * 1024 * 1024; // 2MB total persisted cache per user

function getStoredUserId() {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem("rental_user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.token || parsed.token === "undefined" || parsed.token === "null") return null;
        return parsed._id || parsed.id || parsed.email || null;
    } catch {
        return null;
    }
}

async function throwIfResNotOk(res) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
}
export async function apiRequest(method, url, data) {
    const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
    });
    await throwIfResNotOk(res);
    return res;
}
export const getQueryFn = ({ on401: unauthorizedBehavior }) => async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/"), {
        credentials: "include",
    });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
    }
    await throwIfResNotOk(res);
    return await res.json();
};

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            staleTime: 15_000, // Instant cached renders on tab switches; background refresh after 15s
            gcTime: CACHE_TTL_MS,
            retry: 1,
        },
        mutations: {
            retry: false,
        },
    },
});

let activeCacheUserId = null;
let persistTimer = null;

export function hydrateQueryCacheForUser(userOrId) {
    if (typeof window === "undefined") return;
    const userId = typeof userOrId === "string"
        ? userOrId
        : (userOrId?._id || userOrId?.id || userOrId?.email || getStoredUserId());

    if (!userId) return;

    if (activeCacheUserId && activeCacheUserId !== userId) {
        queryClient.clear();
    }
    activeCacheUserId = userId;

    try {
        const raw = window.localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;

        const now = Date.now();
        // Mark disk-hydrated entries slightly stale so React Query renders them immediately
        // (<10ms) while still revalidating fresh data silently in the background.
        const hydratedTimestamp = now - 60_000;

        for (const entry of parsed) {
            if (!entry || !Array.isArray(entry.queryKey) || entry.data === undefined) continue;
            if (entry.updatedAt && now - entry.updatedAt > CACHE_TTL_MS) continue;
            const existing = queryClient.getQueryData(entry.queryKey);
            if (existing === undefined) {
                queryClient.setQueryData(entry.queryKey, entry.data, {
                    updatedAt: Math.min(entry.updatedAt || hydratedTimestamp, hydratedTimestamp),
                });
            }
        }
    } catch {
        // Ignore corrupted persisted cache
    }
}

export function savePersistedQueryCache() {
    if (typeof window === "undefined") return;
    const userId = activeCacheUserId || getStoredUserId();
    if (!userId) return;

    try {
        const queries = queryClient.getQueryCache().getAll();
        const serializedEntries = [];
        let totalBytes = 2; // []

        // Prefer freshest entries first
        const sorted = [...queries]
            .filter((q) => q.state.status === "success" && q.state.data !== undefined && Array.isArray(q.queryKey))
            .sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0));

        for (const q of sorted) {
            try {
                const payload = JSON.stringify({
                    queryKey: q.queryKey,
                    data: q.state.data,
                    updatedAt: q.state.dataUpdatedAt || Date.now(),
                });
                if (payload.length > MAX_ENTRY_BYTES) continue;
                if (totalBytes + payload.length + 1 > MAX_TOTAL_BYTES) break;
                serializedEntries.push(payload);
                totalBytes += payload.length + 1;
            } catch {
                // Skip non-serializable values
            }
        }

        window.localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, `[${serializedEntries.join(",")}]`);
    } catch {
        // Ignore storage quota errors
    }
}

export function clearPersistedQueryCache(userId) {
    if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
    }
    queryClient.clear();
    if (typeof window === "undefined") return;
    try {
        if (userId) {
            window.localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
        } else {
            const keysToRemove = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
    } catch {
        // Ignore storage errors
    }
    activeCacheUserId = null;
}

if (typeof window !== "undefined") {
    // Hydrate synchronously before the initial React render so refresh never flashes empty state
    hydrateQueryCacheForUser(getStoredUserId());

    queryClient.getQueryCache().subscribe((event) => {
        if (event?.type === "updated" && event?.action?.type === "success") {
            if (persistTimer) clearTimeout(persistTimer);
            persistTimer = setTimeout(() => {
                persistTimer = null;
                savePersistedQueryCache();
            }, 250);
        }
    });

    window.addEventListener("pagehide", savePersistedQueryCache);
    window.addEventListener("beforeunload", savePersistedQueryCache);
}
