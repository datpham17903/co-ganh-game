import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import pino from 'pino';

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

app.get('/health', (_req, res) => {
  res.send('ok');
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'socket connected');
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'socket disconnected');
  });
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => {
  logger.info({ port }, 'server listening');
});
