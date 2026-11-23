import { io } from "socket.io-client";
import { API_URL } from "./api";

let socketInstance = null;

function resolveSocketBaseUrl() {
  if (API_URL.startsWith("http")) {
    return API_URL.replace(/\/api\/?$/, "");
  }
  return undefined; // Same origin (uses Vite dev proxy)
}

export function connectSocket(token) {
  if (!token) return null;
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }
  if (socketInstance) {
    socketInstance.auth = { token };
    socketInstance.connect();
    return socketInstance;
  }

  const baseUrl = resolveSocketBaseUrl();
  socketInstance = io(baseUrl, {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function getSocket() {
  return socketInstance;
}
