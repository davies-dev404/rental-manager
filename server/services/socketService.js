const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const { getJwtSecret } = require('../middleware/securityMiddleware');
const logger = require('../utils/logger');

let ioInstance = null;

function initSocketServer(httpServer, corsOptions = {}) {
  if (process.env.ENABLE_SOCKET_IO === 'false') {
    logger.info('socket_io_disabled_by_config');
    return null;
  }

  ioInstance = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Authenticate every socket handshake cleanly using JWT + revocation checks
  ioInstance.use(async (socket, next) => {
    try {
      const authToken =
        socket.handshake?.auth?.token ||
        (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();

      if (!authToken) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(authToken, getJwtSecret());
      const user = await User.findById(decoded.id).select(
        'name email role isSuperAdmin accountStatus tokenVersion passwordChangedAt organizationOwner tenantId'
      );

      if (!user) return next(new Error('User not found'));
      if (['suspended', 'deactivated'].includes(user.accountStatus)) {
        return next(new Error('Account suspended or deactivated'));
      }
      if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.tokenVersion || 0)) {
        return next(new Error('Session revoked'));
      }
      if (user.passwordChangedAt && decoded.iat && Number(decoded.iat) < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
        return next(new Error('Password recently changed'));
      }

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired session token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const u = socket.user;
    const uid = String(u._id);
    const role = String(u.role || 'landlord').toLowerCase();

    socket.join(`user:${uid}`);

    if (role === 'superadmin' || u.isSuperAdmin) {
      socket.join('superadmin:global');
    } else if (role === 'caretaker' && u.organizationOwner) {
      socket.join(`landlord:${String(u.organizationOwner)}`);
    } else if (role === 'tenant' && u.tenantId) {
      socket.join(`tenant:${String(u.tenantId)}`);
    } else {
      socket.join(`landlord:${uid}`);
    }

    // Strict ownership verification for explicit room subscriptions
    socket.on('subscribe:landlord', (targetLandlordId, ack) => {
      const targetId = String(targetLandlordId || '');
      const allowed =
        role === 'superadmin' ||
        u.isSuperAdmin === true ||
        targetId === uid ||
        (role === 'caretaker' && u.organizationOwner && targetId === String(u.organizationOwner));

      if (!allowed) {
        logger.warn('socket_unauthorized_room_attempt', { userId: uid, targetLandlordId: targetId });
        if (typeof ack === 'function') ack({ ok: false, message: 'Unauthorized landlord room subscription' });
        socket.emit('error:unauthorized', { message: 'Unauthorized landlord room subscription' });
        return;
      }

      socket.join(`landlord:${targetId}`);
      if (typeof ack === 'function') ack({ ok: true, room: `landlord:${targetId}` });
    });
  });

  logger.info('socket_io_initialized');
  return ioInstance;
}

function emitToLandlord(landlordId, eventName, payload) {
  if (!ioInstance || !landlordId) return false;
  ioInstance.to(`landlord:${String(landlordId)}`).emit(eventName, payload);
  return true;
}

function emitToAdmins(eventName, payload) {
  if (!ioInstance) return false;
  ioInstance.to('superadmin:global').emit(eventName, payload);
  return true;
}

function getSocketTelemetry() {
  if (!ioInstance) {
    return { initialized: false, connectedClients: 0, adapter: 'inactive' };
  }
  return {
    initialized: true,
    connectedClients: ioInstance.engine?.clientsCount || 0,
    adapter: 'socket.io'
  };
}

async function closeSocketServer() {
  if (!ioInstance) return;
  await new Promise((resolve) => ioInstance.close(() => resolve()));
  ioInstance = null;
}

module.exports = {
  initSocketServer,
  emitToLandlord,
  emitToAdmins,
  getSocketTelemetry,
  closeSocketServer
};
