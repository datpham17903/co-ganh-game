import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'node:net';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { registerHandlers } from '../src/socket/handlers.js';
import { Events } from '../src/socket/events.js';

let httpServer: HttpServer;
let io: IOServer;
let url: string;
let rooms: RoomManager;

beforeAll(async () => {
  httpServer = createServer();
  io = new IOServer(httpServer);
  rooms = new RoomManager();
  io.on('connection', (socket) => registerHandlers(io, socket, rooms));
  await new Promise<void>((res) => httpServer.listen(() => res()));
  const addr = httpServer.address() as AddressInfo;
  url = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await io.close();
  await new Promise<void>((res) => httpServer.close(() => res()));
});

function emit<T>(s: ClientSocket, event: string, payload: unknown): Promise<T> {
  return new Promise((res) => s.emit(event, payload, (resp: T) => res(resp)));
}

function once<T>(s: ClientSocket, event: string): Promise<T> {
  return new Promise((res) => s.once(event, (data: T) => res(data)));
}

function client(): Promise<ClientSocket> {
  return new Promise((res) => {
    const s = ioClient(url, { transports: ['websocket'], forceNew: true });
    s.once('connect', () => res(s));
  });
}

describe('Socket integration: full PvP flow', () => {
  it('create + join + first move broadcast', async () => {
    const a = await client();
    const b = await client();

    const created = await emit<{ ok: boolean; roomId: string; color: 'B'; playerToken: string }>(
      a,
      Events.ROOM_CREATE,
      { playerName: 'Alice' },
    );
    expect(created.ok).toBe(true);
    expect(created.roomId).toHaveLength(6);

    const joinedP = once<{ state: unknown; players: unknown }>(a, Events.GAME_START);
    const joined = await emit<{
      ok: boolean;
      color: 'W';
      playerToken: string;
      state: unknown;
    }>(b, Events.ROOM_JOIN, { roomId: created.roomId, playerName: 'Bob' });
    expect(joined.ok).toBe(true);
    expect(joined.color).toBe('W');
    await joinedP;

    // A đi nước (1,0) → (1,1)
    const moveAppliedB = once<{ state: { turn: 'B' | 'W' } }>(b, Events.GAME_MOVE_APPLIED);
    const mv = await emit<{ ok: boolean }>(a, Events.GAME_MOVE, { from: 5, to: 6 });
    expect(mv.ok).toBe(true);
    const ev = await moveAppliedB;
    expect(ev.state.turn).toBe('W');

    a.disconnect();
    b.disconnect();
  });

  it('reject nước không hợp lệ', async () => {
    const a = await client();
    const b = await client();
    const created = await emit<{ ok: boolean; roomId: string }>(a, Events.ROOM_CREATE, {
      playerName: 'A',
    });
    await emit(b, Events.ROOM_JOIN, { roomId: created.roomId, playerName: 'B' });

    const mv = await emit<{ ok: boolean; error?: string }>(a, Events.GAME_MOVE, {
      from: 0,
      to: 24,
    });
    expect(mv.ok).toBe(false);
    expect(mv.error).toBe('INVALID_MOVE');

    a.disconnect();
    b.disconnect();
  });

  it('reject nước không phải lượt mình', async () => {
    const a = await client();
    const b = await client();
    const created = await emit<{ ok: boolean; roomId: string }>(a, Events.ROOM_CREATE, {
      playerName: 'A',
    });
    await emit(b, Events.ROOM_JOIN, { roomId: created.roomId, playerName: 'B' });

    // B đi trước (sai lượt — Đen đi trước)
    const mv = await emit<{ ok: boolean; error?: string }>(b, Events.GAME_MOVE, {
      from: 15,
      to: 16,
    });
    expect(mv.ok).toBe(false);
    expect(mv.error).toBe('NOT_YOUR_TURN');

    a.disconnect();
    b.disconnect();
  });

  it('reject tên không hợp lệ', async () => {
    const a = await client();
    const r = await emit<{ ok: boolean; error?: string }>(a, Events.ROOM_CREATE, {
      playerName: '<script>',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_NAME');
    a.disconnect();
  });

  it('reconnect bằng playerToken khôi phục state', async () => {
    const a = await client();
    const b = await client();
    const created = await emit<{ ok: boolean; roomId: string; playerToken: string }>(
      a,
      Events.ROOM_CREATE,
      { playerName: 'A' },
    );
    await emit(b, Events.ROOM_JOIN, { roomId: created.roomId, playerName: 'B' });
    await emit(a, Events.GAME_MOVE, { from: 5, to: 6 });

    a.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const a2 = await client();
    const recon = await emit<{ ok: boolean; color: 'B' | 'W'; state?: { moveHistory: unknown[] } }>(
      a2,
      Events.ROOM_RECONNECT,
      { roomId: created.roomId, playerToken: created.playerToken },
    );
    expect(recon.ok).toBe(true);
    expect(recon.color).toBe('B');
    expect(recon.state?.moveHistory).toHaveLength(1);

    a2.disconnect();
    b.disconnect();
  });

  it('resign trigger game:over cho cả 2', async () => {
    const a = await client();
    const b = await client();
    const created = await emit<{ ok: boolean; roomId: string }>(a, Events.ROOM_CREATE, {
      playerName: 'A',
    });
    await emit(b, Events.ROOM_JOIN, { roomId: created.roomId, playerName: 'B' });

    const overA = once<{ winner: 'B' | 'W' | 'draw' }>(a, Events.GAME_OVER);
    const overB = once<{ winner: 'B' | 'W' | 'draw' }>(b, Events.GAME_OVER);
    await emit(a, Events.GAME_RESIGN, {});

    const [evA, evB] = await Promise.all([overA, overB]);
    expect(evA.winner).toBe('W');
    expect(evB.winner).toBe('W');

    a.disconnect();
    b.disconnect();
  });
});
