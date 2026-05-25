# MULTIPLAYER - CHƠI VỚI NGƯỜI KHÁC

> Thiết kế server, giao thức Socket.IO, quản lý phòng đấu, đồng bộ state, và xử lý các tình huống thực tế.

---

## 1. KIẾN TRÚC PHÒNG ĐẤU

### 1.1. Mô hình

- **Phòng riêng tư** (private room): tạo phòng → nhận mã 6 ký tự → share cho bạn → bạn nhập mã vào.
- **Ghép cặp ngẫu nhiên** (matchmaking): post-MVP.
- 1 phòng = tối đa 2 người chơi + N người xem (post-MVP).
- Phòng được lưu **in-memory** (Map) ở MVP. Sau này có thể chuyển Redis nếu cần scale.

### 1.2. Vòng đời phòng

```
[CREATED] ─ player_1 vào ─→ [WAITING] ─ player_2 vào ─→ [PLAYING]
   │                            │                            │
   │ TTL 10 phút                │ TTL 10 phút                │ kết thúc
   │ không ai vào               │ player_1 rời               │
   ↓                            ↓                            ↓
[EXPIRED]                   [EXPIRED]                   [FINISHED]
   │                                                         │
   │ ─────────── garbage collected sau 5 phút ───────────────┘
```

### 1.3. Class Room

```typescript
// apps/server/src/rooms/Room.ts
export class Room {
  id: string; // 6 ký tự, VD "ABC123"
  status: 'waiting' | 'playing' | 'finished';
  players: {
    B: PlayerInfo | null;
    W: PlayerInfo | null;
  };
  spectators: PlayerInfo[]; // post-MVP
  state: GameState;
  createdAt: number;
  lastActivityAt: number;
  rematchRequested: { B: boolean; W: boolean };

  addPlayer(socket, name): { color: Color };
  removePlayer(socketId): void;
  applyMove(socketId, move): MoveResult;
  resign(socketId): void;
  reset(): void; // cho rematch
}

interface PlayerInfo {
  socketId: string;
  name: string;
  joinedAt: number;
  disconnectedAt?: number; // null nếu đang kết nối
}
```

### 1.4. RoomManager

```typescript
// apps/server/src/rooms/RoomManager.ts
class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();

  createRoom(socket, playerName): Room;
  joinRoom(socket, roomId, playerName): Room;
  leaveRoom(socketId): void;
  getRoomBySocketId(socketId): Room | null;
  cleanupExpired(): void; // gọi mỗi phút
}
```

---

## 2. SOCKET.IO PROTOCOL CHI TIẾT

### 2.1. Namespace

- Dùng namespace mặc định `/`. Không cần namespace riêng cho MVP.
- Mỗi socket có session trong phòng tương ứng (`socket.data.roomId`, `socket.data.color`).

### 2.2. Client → Server events

#### `room:create`

```typescript
// payload
{ playerName: string }

// response (callback)
{ ok: true, roomId: string, color: 'B' }
| { ok: false, error: string }
```

#### `room:join`

```typescript
// payload
{ roomId: string, playerName: string }

// response (callback)
{ ok: true, color: 'B' | 'W', opponent: { name: string }, state: GameState }
| { ok: false, error: 'NOT_FOUND' | 'FULL' | 'ALREADY_IN_ROOM' }
```

#### `room:leave`

```typescript
// payload: {}
// không có response, server broadcast cho đối thủ
```

#### `game:move`

```typescript
// payload
{ from: number, to: number }

// response (callback)
{ ok: true }
| { ok: false, error: 'NOT_YOUR_TURN' | 'INVALID_MOVE' | 'GAME_NOT_STARTED' | 'GAME_OVER' }

// nếu ok, server broadcast game:moveApplied cho cả 2
```

#### `game:resign`

```typescript
// payload: {}
// response: { ok: true }
// server broadcast game:over
```

#### `game:rematch`

```typescript
// payload: {}
// response: { ok: true, waiting: boolean }
// nếu cả 2 đều rematch → server broadcast game:start
```

#### `chat:message` (post-MVP)

```typescript
// payload: { text: string }
// validate: text.length <= 200, không HTML, rate limit 1/giây
```

### 2.3. Server → Client events

#### `room:opponentJoined`

```typescript
{
  name: string;
}
```

#### `room:opponentLeft`

```typescript
{ name: string, willForfeit: boolean }  // willForfeit=true nếu đang trong ván
```

#### `room:opponentReconnected`

```typescript
{
  name: string;
}
```

#### `game:start`

```typescript
{ state: GameState, players: { B: { name }, W: { name } } }
```

#### `game:moveApplied`

```typescript
{
  state: GameState,
  move: Move,
  captures: Capture[],     // gánh + vây
  serverTime: number
}
```

#### `game:moveRejected`

```typescript
{
  reason: string;
}
// chỉ gửi cho người vừa gửi move
```

#### `game:over`

```typescript
{
  winner: 'B' | 'W' | 'draw',
  reason: 'capture_all' | 'no_moves' | 'repetition' | '50_moves' | 'resign' | 'disconnect'
}
```

#### `game:syncState`

```typescript
{
  state: GameState;
}
// gửi khi client reconnect hoặc phát hiện hash khác
```

#### `error`

```typescript
{ code: string, message: string }
```

---

## 3. SERVER-SIDE VALIDATION

### 3.1. Mọi nước đi đều phải kiểm tra

```typescript
// trong handler 'game:move'
function handleMove(socket, payload, callback) {
  const room = roomManager.getRoomBySocketId(socket.id);
  if (!room) return callback({ ok: false, error: 'NO_ROOM' });
  if (room.status !== 'playing') return callback({ ok: false, error: 'GAME_NOT_STARTED' });

  const color = room.players.B?.socketId === socket.id ? 'B' : 'W';
  if (room.state.turn !== color) return callback({ ok: false, error: 'NOT_YOUR_TURN' });

  // Validate move bằng engine
  const legalMoves = engine.getLegalMoves(room.state, payload.from);
  if (!legalMoves.includes(payload.to)) {
    return callback({ ok: false, error: 'INVALID_MOVE' });
  }

  const move = { from: payload.from, to: payload.to, color };
  const newState = engine.applyMove(room.state, move);
  const captures = diffCaptures(room.state, newState);

  room.state = newState;
  room.lastActivityAt = Date.now();

  callback({ ok: true });

  // Broadcast cho cả 2
  io.to(room.id).emit('game:moveApplied', {
    state: newState,
    move,
    captures,
    serverTime: Date.now(),
  });

  if (engine.isGameOver(newState)) {
    handleGameOver(room);
  }
}
```

### 3.2. Anti-cheat

- Không trust gì từ client trừ `from` và `to`.
- Mọi state chỉ được tạo bởi server (gọi engine).
- Client gửi state lên → ignore.
- Rate limit: tối đa 5 nước đi / giây (chống spam).

---

## 4. RECONNECT & DISCONNECT

### 4.1. Disconnect detection

- Socket.IO tự bắn `disconnect` event khi client đóng tab/mất mạng.
- Server **không xóa player ngay**. Đặt `player.disconnectedAt = Date.now()`.
- Bắt đầu timer 60 giây.

### 4.2. Reconnect

Client lưu `roomId` và `playerToken` (UUID random gen 1 lần per session) trong `sessionStorage`. Khi reconnect:

```typescript
// client
socket.emit('room:reconnect', { roomId, playerToken }, (resp) => {
  if (resp.ok) {
    // server gửi game:syncState ngay sau
  } else {
    // navigate về sảnh
  }
});
```

```typescript
// server
function handleReconnect(socket, { roomId, playerToken }, cb) {
  const room = roomManager.get(roomId);
  if (!room) return cb({ ok: false, error: 'ROOM_NOT_FOUND' });

  const player = findPlayerByToken(room, playerToken);
  if (!player) return cb({ ok: false, error: 'NOT_IN_ROOM' });

  player.socketId = socket.id;
  player.disconnectedAt = null;
  socket.join(roomId);
  socket.data.roomId = roomId;
  socket.data.color = player.color;

  cb({ ok: true });
  socket.emit('game:syncState', { state: room.state });
  socket.to(roomId).emit('room:opponentReconnected', { name: player.name });
}
```

### 4.3. Timeout

- Mỗi 5 giây, scan các phòng. Nếu player có `disconnectedAt > 60s` → coi như đầu hàng.
- Bắn `game:over` cho phía còn lại.

### 4.4. UI khi mất kết nối

- Hiện banner "Đang kết nối lại..."
- Disable mọi input
- Đếm ngược 60 giây
- Sau 60s nếu chưa reconnect → hiện "Mất kết nối"

---

## 5. ĐỒNG BỘ STATE

### 5.1. Vấn đề

- Hai client có thể bị lệch state do mất gói tin, race condition, latency cao.
- Server là **nguồn sự thật** — phải có cách phát hiện và sửa lệch.

### 5.2. Giải pháp

- Server gửi `state` đầy đủ trong mỗi `game:moveApplied` (không chỉ delta).
- Mỗi state có `hash = sha256(JSON.stringify(state))`.
- Client tính hash sau apply, so sánh với `state.hash` từ server.
- Nếu khác → emit `game:requestSync` → server gửi lại state.

### 5.3. Optimistic UI

```typescript
// client
function makeMove(move) {
  // 1. Lưu state cũ làm backup
  const backup = gameStore.state;

  // 2. Áp dụng tạm thời (animation chạy)
  gameStore.set(engine.applyMove(backup, move));
  setStatus('PENDING');

  // 3. Gửi server
  socket.emit('game:move', move, (resp) => {
    if (!resp.ok) {
      // Revert
      gameStore.set(backup);
      toast.error(resp.error);
    }
    // Nếu ok, đợi 'game:moveApplied' để confirm
  });
}

// Khi nhận game:moveApplied
socket.on('game:moveApplied', ({ state }) => {
  if (hashState(gameStore.state) !== hashState(state)) {
    // Lệch — server thắng
    gameStore.set(state);
  }
  setStatus('IDLE');
});
```

---

## 6. SECURITY

### 6.1. Threat model

- **Cheating:** client gửi nước đi không hợp lệ → server reject.
- **Impersonation:** không có auth ở MVP → bất kỳ ai có roomId đều vào được. Chấp nhận cho MVP.
- **DoS:** rate limit + max rooms.
- **XSS qua tên player:** sanitize tên (chỉ cho phép `[a-zA-Z0-9_\-\s]`, max 20 ký tự).
- **Replay attack:** mỗi move có timestamp, server reject move cũ hơn 30s.

### 6.2. Rate limiting

| Action         | Limit              |
| -------------- | ------------------ |
| `room:create`  | 5 / phút / IP      |
| `room:join`    | 20 / phút / IP     |
| `game:move`    | 10 / giây / socket |
| `chat:message` | 1 / giây / socket  |

Dùng `rate-limiter-flexible` package.

### 6.3. Mã phòng

- 6 ký tự alphabet không gây nhầm lẫn: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 ký tự, bỏ I, O, 0, 1).
- Không gen mã đã tồn tại → check trùng + retry.
- Không gen mã có chuỗi tục (đơn giản: blacklist từ).

---

## 7. CẤU HÌNH SERVER

### 7.1. Express + Socket.IO setup

```typescript
// apps/server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
  pingTimeout: 20000,
  pingInterval: 25000,
});

app.get('/health', (_, res) => res.send('ok'));

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

httpServer.listen(Number(process.env.PORT ?? 3001));
```

### 7.2. Env vars

| Var                | Default | Mô tả                       |
| ------------------ | ------- | --------------------------- |
| `PORT`             | 3001    | Cổng                        |
| `CORS_ORIGIN`      | \*      | Origin allowed              |
| `MAX_ROOMS`        | 1000    | Số phòng tối đa đồng thời   |
| `ROOM_TTL_MS`      | 600000  | TTL phòng waiting (10 phút) |
| `RECONNECT_TTL_MS` | 60000   | Thời gian chờ reconnect     |
| `LOG_LEVEL`        | info    | debug/info/warn/error       |

---

## 8. LOGGING & MONITORING

### 8.1. Log mọi event quan trọng

- Room created/joined/left/expired
- Move applied/rejected
- Game over (kèm reason)
- Disconnect/reconnect

### 8.2. Metrics (post-MVP)

- Số phòng đang active
- Số ván đang chơi
- Latency trung bình giữa move và moveApplied
- Tỉ lệ reconnect thành công

---

## 9. TESTING

### 9.1. Unit test

- `RoomManager`: tạo, join, leave, expired
- `Room.applyMove`: validate đúng/sai
- Mã phòng: không trùng, không chứa từ cấm

### 9.2. Integration test

Dùng `socket.io-client` mở 2 socket, mô phỏng 1 ván:

```typescript
test('full PvP game', async () => {
  const a = io('http://localhost:3001');
  const b = io('http://localhost:3001');

  const { roomId } = await emit(a, 'room:create', { playerName: 'A' });
  await emit(b, 'room:join', { roomId, playerName: 'B' });

  // A đi nước 1
  await emit(a, 'game:move', { from: 6, to: 7 });

  // Đợi B nhận event
  const ev = await once(b, 'game:moveApplied');
  expect(ev.state.turn).toBe('W');
});
```

### 9.3. E2E test (Browser MCP)

- Mở 2 tab Chrome qua Browser MCP
- Tab 1 tạo phòng → copy code
- Tab 2 vào phòng bằng code
- Mỗi tab thực hiện 5 nước → verify state đồng bộ

---

## 10. DEPLOYMENT NOTES

### 10.1. Sticky session

- Khi scale > 1 instance, Socket.IO cần sticky session để client luôn đến đúng instance lưu state phòng.
- Hoặc: dùng Redis adapter `@socket.io/redis-adapter`.

### 10.2. Provider

- Railway/Render/Fly.io: hỗ trợ WebSocket, đơn giản triển khai.
- Vercel: KHÔNG hỗ trợ Socket.IO ở free tier (serverless functions không persistent).

### 10.3. Health check

```
GET /health → 200 "ok"
```
