import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL, getAuthHeaders } from "@/lib/api";

/**
 * Establishes an authenticated real-time SSE stream (`admin` or `user` mode)
 * with Bearer header support and automatic reconnection + React Query cache sync.
 */
export function useSupportStream({ mode = "user", ticketId = null, enabled = true, onEvent } = {}) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsConnected(false);
      return;
    }

    let cancelled = false;
    let activeController = null;
    let retryTimer = null;
    let attempt = 0;

    const streamUrl =
      mode === "admin"
        ? `${API_URL}/admin/support/stream`
        : `${API_URL}/support/stream`;

    const handleParsedPayload = (payload) => {
      if (!payload || !payload.ticket) return;

      if (mode === "admin") {
        if (payload.ticketId) {
          queryClient.setQueryData(["admin-support-detail", String(payload.ticketId)], payload.ticket);
        }
        queryClient.invalidateQueries({ queryKey: ["admin-support"] });
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      } else {
        queryClient.setQueryData(["my-support-tickets"], (prev) => {
          const list = Array.isArray(prev) ? [...prev] : [];
          const idx = list.findIndex((t) => String(t._id) === String(payload.ticket._id));
          if (idx >= 0) {
            list.splice(idx, 1);
          }
          return [payload.ticket, ...list];
        });
      }

      if (typeof onEventRef.current === "function") {
        onEventRef.current(payload);
      }
    };

    const connect = async () => {
      if (cancelled) return;
      activeController = new AbortController();

      try {
        const headers = getAuthHeaders();
        const res = await fetch(streamUrl, {
          method: "GET",
          headers: {
            ...headers,
            Accept: "text/event-stream"
          },
          credentials: "include",
          signal: activeController.signal
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream unavailable (${res.status})`);
        }

        attempt = 0;
        if (!cancelled) setIsConnected(true);

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            const lines = block.split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const rawJson = line.slice(5).trim();
                if (!rawJson) continue;
                try {
                  const parsed = JSON.parse(rawJson);
                  handleParsedPayload(parsed);
                } catch {
                  // Ignore non-JSON heartbeat or partial frames
                }
              }
            }
          }
        }
      } catch {
        // Reconnect cleanly below
      } finally {
        if (!cancelled) {
          setIsConnected(false);
          attempt += 1;
          const delay = Math.min(5000, 1200 * attempt);
          retryTimer = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      setIsConnected(false);
      if (retryTimer) clearTimeout(retryTimer);
      if (activeController) activeController.abort();
    };
  }, [mode, ticketId, enabled, queryClient]);

  return { isConnected };
}
