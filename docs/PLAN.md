# PLAN TỔNG QUÁT - WEBSITE CỜ GÁNH ONLINE

> **Mục tiêu:** Xây dựng website chơi Cờ Gánh (cờ truyền thống Việt Nam) online, hỗ trợ chơi với BOT 3 mức độ và chơi với người khác qua mạng.

---

## 1. PHẠM VI DỰ ÁN (SCOPE)

### Tính năng chính (MUST HAVE)

- [x] Bàn cờ 5×5 (25 điểm) đúng luật cờ gánh truyền thống
- [x] Logic luật chơi đầy đủ: di chuyển, gánh, vây (chẹt), mở
- [x] Chơi với BOT 3 mức độ: **Dễ / Trung bình / Khó**
- [x] Chơi PvP online qua phòng (room code)
- [x] Animation di chuyển quân, hiệu ứng gánh/vây
- [x] Lịch sử nước đi (move history) + undo (chỉ chế độ với BOT)
- [x] Highlight nước đi hợp lệ khi chọn quân
- [x] Hiển thị lượt đi, đếm quân hai bên
- [x] Responsive: desktop + mobile
- [x] Âm thanh (đặt quân, gánh, thắng/thua) - bật/tắt được

### Tính năng phụ (NICE TO HAVE)

- [ ] Tài khoản người dùng (đăng ký/đăng nhập)
- [ ] Bảng xếp hạng (leaderboard)
- [ ] Chat trong phòng PvP
- [ ] Replay ván đấu
- [ ] Chế độ xem (spectator)
- [ ] Đa ngôn ngữ (VI/EN)

### Ngoài phạm vi (OUT OF SCOPE)

- ❌ App native iOS/Android
- ❌ Giao dịch trong game
- ❌ Giải đấu có thưởng

---

## 2. CÔNG NGHỆ (TECH STACK)

### Frontend

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS + shadcn/ui
- **State:** Zustand (game state) + React Query (server state)
- **Realtime:** Socket.IO client
- **Animation:** Framer Motion
- **Routing:** React Router v6

### Backend

- **Runtime:** Node.js 20 + TypeScript
- **Server:** Express + Socket.IO
- **DB:** SQLite (dev) / PostgreSQL (prod) - chỉ dùng nếu có tài khoản
- **In-memory store:** Map cho phòng đấu (đủ cho MVP)

### Tooling

- **Test:** Vitest (unit) + Playwright (E2E)
- **Lint:** ESLint + Prettier
- **CI:** GitHub Actions (sau)
- **Package manager:** pnpm

### MCP hỗ trợ

- **Stitch MCP:** Sinh mockup UI/UX, design tokens
- **Browser MCP:** Tự động hóa kiểm thử E2E, chụp màn hình

---

## 3. KIẾN TRÚC THƯ MỤC (TARGET)

```
co-ganh/
├── apps/
│   ├── web/                    # Frontend React
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── features/
│   │   │   │   ├── board/      # Bàn cờ + quân
│   │   │   │   ├── game/       # Game state, hooks
│   │   │   │   ├── bot/        # AI client wrapper
│   │   │   │   ├── room/       # Phòng PvP
│   │   │   │   └── menu/       # Menu chính
│   │   │   ├── lib/            # Utils
│   │   │   ├── pages/          # Routes
│   │   │   ├── stores/         # Zustand
│   │   │   └── styles/
│   │   └── ...
│   └── server/                 # Backend Node
│       ├── src/
│       │   ├── socket/         # Socket.IO handlers
│       │   ├── rooms/          # Room manager
│       │   └── index.ts
│       └── ...
├── packages/
│   ├── engine/                 # Core game logic (shared FE+BE)
│   │   ├── src/
│   │   │   ├── board.ts        # Khởi tạo + biểu diễn bàn cờ
│   │   │   ├── moves.ts        # Sinh nước đi hợp lệ
│   │   │   ├── rules.ts        # Luật gánh/vây/mở
│   │   │   ├── game.ts         # Vòng lặp ván đấu
│   │   │   └── types.ts
│   │   └── tests/              # Unit test luật
│   └── bot/                    # AI bot
│       ├── src/
│       │   ├── easy.ts         # Random + tránh thua
│       │   ├── medium.ts       # Minimax depth 3
│       │   ├── hard.ts         # Minimax + alpha-beta + heuristic
│       │   └── eval.ts         # Hàm đánh giá thế cờ
│       └── tests/
└── docs/                       # Tài liệu (file .md hiện tại)
```

---

## 4. LỘ TRÌNH (ROADMAP) - 6 GIAI ĐOẠN

| Phase  | Tên         | Output chính                                       | Subagent phụ trách |
| ------ | ----------- | -------------------------------------------------- | ------------------ |
| **P0** | Setup       | Monorepo, lint, test runner                        | `setup-agent`      |
| **P1** | Engine      | Logic luật cờ gánh chuẩn 100% test                 | `engine-agent`     |
| **P2** | UI cơ bản   | Bàn cờ render, click di chuyển, chơi local 2 người | `ui-agent`         |
| **P3** | BOT         | 3 mức AI, tích hợp vào UI                          | `bot-agent`        |
| **P4** | Multiplayer | Server Socket.IO, phòng đấu, đồng bộ               | `mp-agent`         |
| **P5** | Polish      | Animation, âm thanh, responsive, A/B test bug      | `polish-agent`     |
| **P6** | QA & Deploy | E2E test, bug fix, deploy                          | `qa-agent`         |

Chi tiết task từng phase: xem **[TASKS.md](TASKS.md)**.

---

## 5. NGUYÊN TẮC LÀM VIỆC

1. **Engine-first:** Logic luật chơi phải hoàn thiện và pass 100% unit test trước khi làm UI.
2. **Shared engine:** Cùng một module `engine` dùng cho cả FE (validate ngay) và BE (xác thực chống cheat).
3. **Server authoritative:** Mọi nước đi PvP phải được server xác thực trước khi broadcast.
4. **Test-driven luật:** Mỗi luật (gánh, vây, mở) có test case riêng dựa trên ví dụ trong [RULES.md](RULES.md).
5. **MCP đúng chỗ:**
   - Stitch MCP: chỉ dùng ở **P2** để sinh mockup ban đầu, không dùng để generate code production.
   - Browser MCP: dùng ở **P6** để chạy E2E và chụp screenshot báo cáo.
6. **Mỗi subagent đọc:** `RULES.md` + `ARCHITECTURE.md` + task của mình trong `TASKS.md`.

---

## 6. TIÊU CHÍ HOÀN THÀNH (DEFINITION OF DONE)

Một feature được coi là DONE khi:

- [ ] Code đã merge vào branch chính
- [ ] Có unit test (engine/bot) hoặc E2E test (UI/multiplayer)
- [ ] Test pass 100% trên CI
- [ ] Đã chạy thử bằng Browser MCP và verify bằng screenshot
- [ ] Không còn warning lint/typecheck
- [ ] Đã cập nhật trạng thái trong `TASKS.md`
- [ ] Bug phát sinh đã ghi vào `BUGFIX.md`

---

## 7. CÁC FILE TÀI LIỆU LIÊN QUAN

| File                               | Nội dung                               |
| ---------------------------------- | -------------------------------------- |
| [RULES.md](RULES.md)               | Luật cờ gánh chi tiết + ví dụ          |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Thiết kế kỹ thuật, data model, API     |
| [FLOW.md](FLOW.md)                 | User flow + game flow                  |
| [BOT.md](BOT.md)                   | Thiết kế AI 3 mức độ                   |
| [MULTIPLAYER.md](MULTIPLAYER.md)   | Giao thức Socket.IO, phòng đấu         |
| [UI_UX.md](UI_UX.md)               | Mockup, design system, dùng Stitch MCP |
| [TASKS.md](TASKS.md)               | Phân chia task cho subagents           |
| [TESTING.md](TESTING.md)           | Test plan chi tiết                     |
| [BUGFIX.md](BUGFIX.md)             | Quy trình theo dõi và fix bug          |
