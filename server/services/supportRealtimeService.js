const { EventEmitter } = require('events');

const supportBus = new EventEmitter();
supportBus.setMaxListeners(0);

const adminStreams = new Set();
const userStreams = new Map(); // key (userId or lower email) -> Set<res>

function sanitizeTicketForUser(ticketObj) {
  if (!ticketObj) return null;
  const plain = typeof ticketObj.toObject === 'function' ? ticketObj.toObject() : { ...ticketObj };
  plain.responses = (plain.responses || []).filter((r) => !r.isInternalNote);
  return plain;
}

function writeSseEvent(res, eventName, payload) {
  if (!res || res.writableEnded || res.destroyed) return false;
  try {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    return true;
  } catch {
    return false;
  }
}

function initSseHeaders(req, res) {
  req.setTimeout?.(0);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(': connected\n\n');
}

function registerAdminStream(req, res) {
  initSseHeaders(req, res);
  adminStreams.add(res);
  req.on('close', () => {
    adminStreams.delete(res);
  });
}

function registerUserStream(req, res, keys = []) {
  initSseHeaders(req, res);
  const cleanKeys = keys.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean);
  for (const key of cleanKeys) {
    if (!userStreams.has(key)) userStreams.set(key, new Set());
    userStreams.get(key).add(res);
  }
  req.on('close', () => {
    for (const key of cleanKeys) {
      const set = userStreams.get(key);
      if (set) {
        set.delete(res);
        if (set.size === 0) userStreams.delete(key);
      }
    }
  });
}

function publishSupportEvent({ type = 'ticket_updated', ticket, isInternalNote = false }) {
  if (!ticket) return;
  const adminTicket = typeof ticket.toObject === 'function' ? ticket.toObject() : ticket;

  const adminPayload = {
    type,
    ticketId: String(adminTicket._id),
    ticket: adminTicket,
    timestamp: new Date().toISOString()
  };

  for (const res of adminStreams) {
    if (!writeSseEvent(res, 'support_update', adminPayload)) {
      adminStreams.delete(res);
    }
  }

  // Never send internal admin-only notes to end users
  if (isInternalNote) return;

  const targetKeys = new Set();
  const uid = adminTicket.userId?._id || adminTicket.userId;
  if (uid) targetKeys.add(String(uid).toLowerCase());
  if (adminTicket.email) targetKeys.add(String(adminTicket.email).trim().toLowerCase());

  const userPayload = {
    type,
    ticketId: String(adminTicket._id),
    ticket: sanitizeTicketForUser(adminTicket),
    timestamp: new Date().toISOString()
  };

  const notified = new Set();
  for (const key of targetKeys) {
    const set = userStreams.get(key);
    if (!set) continue;
    for (const res of set) {
      if (notified.has(res)) continue;
      notified.add(res);
      if (!writeSseEvent(res, 'support_update', userPayload)) {
        set.delete(res);
      }
    }
  }
}

// Keep-alive ping every 20s (unref'd so tests/CLI exit cleanly)
const heartbeatTimer = setInterval(() => {
  for (const res of adminStreams) {
    if (res.writableEnded || res.destroyed) {
      adminStreams.delete(res);
      continue;
    }
    try {
      res.write(': ping\n\n');
    } catch {
      adminStreams.delete(res);
    }
  }
  for (const [key, set] of userStreams.entries()) {
    for (const res of set) {
      if (res.writableEnded || res.destroyed) {
        set.delete(res);
        continue;
      }
      try {
        res.write(': ping\n\n');
      } catch {
        set.delete(res);
      }
    }
    if (set.size === 0) userStreams.delete(key);
  }
}, 20000);
if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();

module.exports = {
  registerAdminStream,
  registerUserStream,
  publishSupportEvent,
  sanitizeTicketForUser
};
