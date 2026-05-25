# KIẾN TRÚC HỆ THỐNG

> Tài liệu kỹ thuật chi tiết: thiết kế module, data flow, API contract, deployment.

---

## 1. TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                │
│  ┌────────────┐    ┌────────────┐    ┌──────────────────────┐  │
│  │   React    │←──→│  Zustand   │←──→│  Engine (validate)   │  │
│  │     UI     │    │   Store    │    │  + Bot (chơi đơn)    │  │
│  └─────┬──────┘    └─────┬──────┘    └──────────────────────┘  │
│        │                 │                                      │
│        │            ┌────┴─────┐                                │
│        │            │ Socket.IO│                                │
│        │            │  Client  │                                │
│        │            └────┬─────┘                                │
└────────┼─────────────────┼──────────────────────────────────────┘
         │ HTTP            │ WebSocket
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NODE SERVER                               │
│  ┌────────────┐    ┌────────────┐    ┌──────────────────────┐  │
│  │  Express   │    │ Socket.IO  │    │  Room Manager        │  │
│  │  (static)  │    │   Server   │←──→│  (in-memory Map)     │  │
│  └────────────┘    └─────┬──────┘    └──────────┬───────────┘  │
│                          │                      │              │
│                    ┌─────┴──────────────────────┴──────────┐   │
│                    │  Engine (authoritative validation)    │   │
│                    └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Nguyên lý
1. **Engine dùng chung** cho cả FE và BE → đảm bảo logic luật giống hệt.
2. **Server-authoritative cho PvP:** mọi nước đi phải được server chấp nhận trước khi UI hai bên cập nhật.
3. **Local cho chế độ vs Bot:** không cần server, engine + bot chạy hoàn toàn trên client.

---

## 2. MODULE BREAKDOWN

### 2.1. `packages/engine` (Pure logic, no I/O)
| File | Trách nhiệm | Export chính |
|------|-------------|--------------|
| `types.ts` | Định nghĩa types | `Color`, `Cell`, `GameState`, `Move`, `Capture` |
| `board.ts` | Khởi tạo bàn, helper tọa độ | `createInitialBoard`, `index2coord`, `coord2index` |
| `adjacency.ts` | Bảng kề precomputed | `ADJACENCY: number[][]` (25 phần tử) |
| `moves.ts` | Sinh nước đi | `getLegalMoves`, `getAllLegalMoves` |
| `rules.ts` | Xử lý gánh + vây | `processGanh`, `processVay` |
| `game.ts` | Vòng lặp ván | `applyMove`, `isGameOver`, `getWinner`, `hashState` |
| `index.ts` | Re-export public API | (barrel) |

**Yêu cầu:** Pure functions, không dùng `Math.random` (trừ test fixture), không I/O.

### 2.2. `packages/bot`
| File | Trách nhiệm |
|------|-------------|
| `types.ts` | `BotDifficulty = 'easy' \| 'medium' \| 'hard'`, `BotConfig` |
| `eval.ts` | Hàm đánh giá thế cờ (heuristic) |
| `easy.ts` | Random hợp lệ, ưu tiên gánh nếu có |
| `medium.ts` | Minimax depth 3 |
| `hard.ts` | Minimax + alpha-beta + iterative deepening (depth 4-6) |
| `index.ts` | `chooseMove(state, difficulty): Promise<Move>` |

Chi tiết: xem [BOT.md](BOT.md).

### 2.3. `apps/web` (Frontend)
```
src/
├── components/         # UI primitives (Button, Modal, etc.)
├── features/
│   ├── board/
│   │   ├── Board.tsx              # Render bàn cờ SVG
│   │   ├── Piece.tsx              # 1 quân cờ
│   │   ├── BoardOverlay.tsx       # Highlight nước đi hợp lệ
│   │   └── useBoardInteraction.ts
│   ├── game/
│   │   ├── GameProvider.tsx       # Cung cấp GameState
│   │   ├── useGame.ts             # Hook chính
│   │   ├── MoveHistory.tsx        # Lịch sử nước đi
│   │   ├── PlayerInfo.tsx         # Thông tin 2 người chơi
│   │   └── EndGameModal.tsx
│   ├── bot/
│   │   ├── botWorker.ts           # Web Worker chạy bot
│   │   └── useBotMove.ts
│   ├── room/
│   │   ├── RoomLobby.tsx          # Tạo/vào phòng
│   │   ├── useSocket.ts           # Hook Socket.IO client
│   │   └── usePvPGame.ts          # Đồng bộ state qua socket
│   └── menu/
│       └── MainMenu.tsx
├── pages/
│   ├── HomePage.tsx               # /
│   ├── PlayBotPage.tsx            # /play/bot
│   ├── PlayPvPPage.tsx            # /play/pvp/:roomId
│   └── HowToPlayPage.tsx          # /rules
├── stores/
│   ├── gameStore.ts               # Zustand: state ván đang chơi
│   ├── settingsStore.ts           # Âm thanh, theme, ngôn ngữ
│   └── socketStore.ts
├── lib/
│   ├── socket.ts                  # Singleton socket client
│   └── audio.ts                   # Quản lý âm thanh
└── App.tsx
```

### 2.4. `apps/server` (Backend)
```
src/
├── index.ts                       # Entry: Express + Socket.IO
├── socket/
│   ├── handlers.ts                # Đăng ký socket events
│   ├── events.ts                  # Constants tên event
│   └── auth.ts                    # (sau) JWT cho user đăng ký
├── rooms/
│   ├── RoomManager.ts             # Tạo/xóa/tìm phòng
│   ├── Room.ts                    # 1 phòng = 2 player + GameState
│   └── matchmaking.ts             # (sau) ghép cặp ngẫu nhiên
└── utils/
    └── codes.ts                   # Sinh mã phòng 6 ký tự
```

---

## 3. DATA FLOW

### 3.1. Chế độ vs BOT (local)
```
1. User click quân ĐEN
   → Board.onPieceClick(from)
   → useGame.selectPiece(from)
   → engine.getLegalMoves(state, from) trả về [to1, to2, ...]
   → BoardOverlay highlight các nước hợp lệ

2. User click ô đích
   → useGame.makeMove({from, to, color: 'B'})
   → engine.applyMove(state, move) → newState
   → gameStore.set(newState)
   → UI re-render + animation

3. Đến lượt TRẮNG (BOT)
   → useEffect phát hiện turn === 'W'
   → botWorker.postMessage({state, difficulty})
   → bot.chooseMove() chạy trong Web Worker
   → onmessage → useGame.makeMove(botMove)
```

### 3.2. Chế độ PvP (online)
```
Player A (ĐEN)                  Server                    Player B (TRẮNG)
─────────────                  ──────                    ────────────────
1. Chọn quân + click ô đích
2. emit('move', {from, to})  ───→
                              3. Validate bằng engine
                              4. Nếu hợp lệ:
                                 - applyMove vào Room.state
                                 - emit('moveApplied', state)
                                                        ───→ 5. Cập nhật UI
                              ←─── 5. Cập nhật UI
6. Cập nhật UI                                          6. Đến lượt mình
```

**Quan trọng:**
- Client KHÔNG được trust nước đi của chính mình → phải đợi `moveApplied` từ server.
- Optimistic UI (preview nước đi) chỉ là animation, không thay đổi state cho đến khi nhận xác nhận.
- Nếu server reject → revert + show error.

---

## 4. SOCKET.IO PROTOCOL

Chi tiết đầy đủ trong [MULTIPLAYER.md](MULTIPLAYER.md). Tóm tắt:

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|-------|
| `room:create` | `{ playerName }` | Tạo phòng mới, server trả `roomId` |
| `room:join` | `{ roomId, playerName }` | Vào phòng |
| `room:leave` | `{}` | Rời phòng |
| `game:move` | `{ from, to }` | Gửi nước đi |
| `game:resign` | `{}` | Đầu hàng |
| `game:rematch` | `{}` | Yêu cầu đấu lại |
| `chat:message` | `{ text }` | Tin nhắn (sau) |

### Server → Client
| Event | Payload | Mô tả |
|-------|---------|-------|
| `room:joined` | `{ roomId, color, opponent }` | Xác nhận vào phòng |
| `room:opponentJoined` | `{ name }` | Đối thủ vào |
| `room:opponentLeft` | `{}` | Đối thủ rời |
| `game:start` | `{ state }` | Bắt đầu ván |
| `game:moveApplied` | `{ state, move, captures }` | Nước đi hợp lệ |
| `game:moveRejected` | `{ reason }` | Nước đi bị từ chối |
| `game:over` | `{ winner, reason }` | Kết thúc |
| `error` | `{ code, message }` | Lỗi chung |

---

## 5. STATE MANAGEMENT

### 5.1. Zustand stores
```typescript
// gameStore.ts
interface GameStore {
  state: GameState;
  selectedFrom: number | null;
  legalDestinations: number[];
  mode: 'bot' | 'pvp' | 'local';
  myColor: Color;
  isMyTurn: boolean;
  selectPiece: (idx: number) => void;
  clearSelection: () => void;
  makeMove: (move: Move) => void;
  resetGame: () => void;
  setState: (s: GameState) => void;
}

// settingsStore.ts (persist localStorage)
interface SettingsStore {
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  language: 'vi' | 'en';
  botDifficulty: BotDifficulty;
  toggleSound: () => void;
  setTheme: (t) => void;
  setBotDifficulty: (d) => void;
}
```

### 5.2. Chiến lược cho PvP
- `gameStore` lưu state, KHÔNG xử lý logic gánh/vây ở client cho PvP.
- Mọi mutation phải đến từ event `game:moveApplied` từ server.
- Client chỉ tự xử lý `selectPiece` và preview nước đi hợp lệ (read-only validate bằng engine).

---

## 6. WEB WORKER CHO BOT

Bot hard có thể nghĩ 1-3 giây → phải chạy trong Web Worker để không block UI.

```typescript
// botWorker.ts
self.onmessage = async (e) => {
  const { state, difficulty } = e.data;
  const move = await chooseMove(state, difficulty);
  self.postMessage(move);
};
```

```typescript
// useBotMove.ts
const worker = useRef(new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' }));

useEffect(() => {
  if (gameStore.state.turn !== myColor && mode === 'bot') {
    worker.current.postMessage({ state: gameStore.state, difficulty });
    worker.current.onmessage = (e) => gameStore.makeMove(e.data);
  }
}, [gameStore.state.turn]);
```

---

## 7. RENDERING BÀN CỜ

### 7.1. SVG (chọn) vs Canvas
- **SVG** dễ làm responsive, dễ animation với Framer Motion, dễ accessibility (mỗi quân là `<g>` có aria-label).
- Canvas khó accessibility, không cần thiết với 25 điểm tĩnh.
- → **Chọn SVG**.

### 7.2. Cấu trúc SVG
```jsx
<svg viewBox="0 0 500 500">
  {/* Lưới đường */}
  <g className="grid">
    {edges.map(([a, b]) => <line .../>)}
  </g>
  {/* Điểm giao */}
  <g className="points">
    {points.map((p, i) => <circle r="3" .../>)}
  </g>
  {/* Highlight nước hợp lệ */}
  <g className="highlights">
    {legalDestinations.map(i => <circle className="legal-target"/>)}
  </g>
  {/* Quân cờ */}
  <g className="pieces">
    {pieces.map(p => <Piece key={p.id} {...p}/>)}
  </g>
</svg>
```

### 7.3. Tọa độ pixel
```typescript
const SIZE = 500;
const PADDING = 40;
const STEP = (SIZE - 2 * PADDING) / 4;
// (row, col) → (x, y) = (PADDING + col*STEP, PADDING + row*STEP)
```

---

## 8. PERSISTENCE

### 8.1. MVP (không tài khoản)
- LocalStorage: cài đặt, tên hiển thị, preferred difficulty.
- IndexedDB (sau): replay ván đấu.

### 8.2. Khi có tài khoản (Phase sau)
- PostgreSQL: `users`, `matches`, `move_history`, `ratings`.
- Redis: phiên đăng nhập + cache phòng đấu.

---

## 9. DEPLOYMENT

### 9.1. MVP
- **Frontend:** Vercel hoặc Netlify (build static)
- **Backend:** Railway / Render / Fly.io (Node + Socket.IO)
- **Domain:** chưa cần, dùng subdomain free
- **HTTPS:** auto từ provider

### 9.2. Cấu hình
| Env var | Mô tả | Default |
|---------|-------|---------|
| `PORT` | Cổng server | `3001` |
| `CORS_ORIGIN` | Origin frontend | `http://localhost:5173` |
| `MAX_ROOMS` | Số phòng tối đa | `1000` |
| `ROOM_TTL_MIN` | TTL phòng không hoạt động | `60` |

---

## 10. NGUYÊN TẮC CODE

1. **Engine pure:** không phụ thuộc DOM, Node, browser API.
2. **Immutable state:** `applyMove` trả state mới, không mutate.
3. **No magic numbers:** dùng constants (`BOARD_SIZE`, `PIECE_COUNT`, ...).
4. **Tên rõ ràng tiếng Anh** trong code, comment + docs tiếng Việt.
5. **TypeScript strict mode:** `noImplicitAny`, `strictNullChecks`.
6. **File < 300 dòng:** tách nếu vượt.
7. **Test trước khi merge:** mọi PR có test mới hoặc cập nhật test cũ.
