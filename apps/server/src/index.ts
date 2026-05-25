import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import pino from 'pino';
import { RoomManager } from './rooms/RoomManager.js';
import { registerHandlers } from './socket/handlers.js';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
  pingTimeout: 20000,
  pingInterval: 25000,
});

const rooms = new RoomManager({
  maxRooms: Number(process.env.MAX_ROOMS ?? 1000),
  waitingTtlMs: Number(process.env.ROOM_TTL_MS ?? 600_000),
  reconnectTtlMs: Number(process.env.RECONNECT_TTL_MS ?? 60_000),
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size() });
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'socket connected');
  registerHandlers(io, socket, rooms);
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'socket disconnected');
  });
});

// Cleanup loop mỗi 1 giây — ngắn vì cần check clock timeout chính xác.
const cleanupInterval = setInterval(() => {
  const { forfeited, timedOut } = rooms.cleanup();
  for (const f of forfeited) {
    io.to(f.room.id).emit('game:over', {
      winner: f.loser === 'B' ? 'W' : 'B',
      reason: 'disconnect',
    });
  }
  for (const t of timedOut) {
    io.to(t.room.id).emit('game:over', {
      winner: t.loser === 'B' ? 'W' : 'B',
      reason: 'timeout',
    });
  }
}, 1000);

// Broadcast clock state mỗi giây cho phòng đang chơi để client sync.
const clockBroadcast = setInterval(() => {
  // Iterate rooms qua RoomManager — cần expose một method.
  // Implement đơn giản: rooms.forEachActive callback.
  rooms.forEachPlaying((room) => {
    io.to(room.id).emit('clock:update', { clock: room.clockSnapshot() });
  });
}, 1000);

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => {
  logger.info({ port }, 'server listening');
});

// Graceful shutdown for tests
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  clearInterval(clockBroadcast);
  httpServer.close();
  process.exit(0);
});

export { app, httpServer, io, rooms };
