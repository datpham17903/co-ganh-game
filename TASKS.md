# PHÂN CHIA TASK CHO SUBAGENTS

> Mỗi subagent là một worker độc lập, có scope và deliverable rõ ràng. Chạy tuần tự theo phase, một số task trong cùng phase có thể chạy song song.

---

## QUY TẮC CHUNG CHO MỌI SUBAGENT

1. **Đọc trước khi code:**
   - `PLAN.md` (nắm bối cảnh)
   - `RULES.md` (nếu task liên quan logic)
   - `ARCHITECTURE.md` (nắm kiến trúc + naming convention)
   - Task của mình ở dưới
2. **Output bắt buộc:**
   - Code đặt đúng path đã quy ước
   - Test đi kèm (unit/integration/E2E tùy task)
   - Cập nhật trạng thái trong `TASKS.md` (hoặc báo cho main agent cập nhật)
3. **Coding standard:**
   - TypeScript strict, không `any`
   - File < 300 dòng
   - Comment tiếng Việt, code identifier tiếng Anh
   - Dùng đúng API engine đã định nghĩa, không tự thêm
4. **Khi gặp lỗi:**
   - Log vào `BUGFIX.md` mục "Encountered"
   - Nếu blocker → dừng và báo main agent
5. **Verify trước khi báo done:**
   - `pnpm typecheck` pass
   - `pnpm test` pass cho package của mình
   - Nếu UI: chạy `pnpm dev` mở browser xem có lỗi console không

---

## PHASE 0 — SETUP (1 subagent)

### `setup-agent`
**Scope:** Khởi tạo monorepo, công cụ phát triển.

**Tasks:**
- [ ] Tạo monorepo với pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Tạo cấu trúc thư mục theo `ARCHITECTURE.md` mục 2
- [ ] Setup TypeScript shared config (`tsconfig.base.json`)
- [ ] Setup ESLint + Prettier (config dùng chung)
- [ ] Setup Vitest cho `packages/*`
- [ ] Setup Vite cho `apps/web`
- [ ] Setup tsx + nodemon cho `apps/server`
- [ ] Setup Tailwind + shadcn/ui cho `apps/web`
- [ ] Tạo script root: `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm typecheck`, `pnpm lint`
- [ ] Khởi tạo git repo, .gitignore
- [ ] Tạo `.env.example` cho server
- [ ] Tạo Husky + lint-staged (pre-commit)
- [ ] Verify: `pnpm install && pnpm typecheck && pnpm test` chạy pass với placeholder

**Deliverable:** Monorepo build/typecheck/test pass với placeholder code.

**Definition of Done:**
- `pnpm dev` khởi cả frontend và backend cùng lúc
- Hot reload hoạt động
- Lint chạy được, format on save hoạt động

---

## PHASE 1 — ENGINE (1 subagent)

### `engine-agent`
**Scope:** Logic luật cờ gánh đầy đủ trong `packages/engine`.

**Pre-requisites:** Đọc kỹ `RULES.md` toàn bộ.

**Tasks:**
- [ ] Định nghĩa types trong `types.ts` theo `RULES.md` mục 7
- [ ] Implement `board.ts`:
  - `createInitialBoard()` đúng layout
  - `index2coord(i)`, `coord2index(r, c)`
- [ ] Implement `adjacency.ts`:
  - Precompute mảng `ADJACENCY: number[][]` (25 phần tử)
  - Tuân thủ luật đường chéo theo RULES.md mục 1.2
  - Test bằng tay 5-6 điểm cụ thể
- [ ] Implement `moves.ts`:
  - `getLegalMoves(state, from): number[]`
  - `getAllLegalMoves(state, color?): Move[]`
- [ ] Implement `rules.ts`:
  - `processGanh(board, movedTo, color): { board, captured: number[] }`
  - `processVay(board, byColor): { board, captured: number[] }`
  - Tuân thủ thứ tự: gánh → vây
  - **KHÔNG phản ứng dây chuyền** (xem RULES.md mục 3.2)
- [ ] Implement `game.ts`:
  - `applyMove(state, move): GameState` (immutable)
  - `isGameOver(state): boolean`
  - `getWinner(state): Color | 'draw' | null`
  - `hashState(state): string` (dùng cho check lặp 3 lần)
  - Cập nhật `noProgressCount` (cho luật 50 nước)
- [ ] Implement `index.ts` re-export public API
- [ ] **Tests bắt buộc** (xem RULES.md mục 8 + TESTING.md):
  - Khởi tạo bàn đúng layout
  - 8 test gánh
  - 5 test vây
  - Thứ tự gánh → vây
  - Kết thúc ván (4 điều kiện)
  - Bất biến tổng quân = 16
  - Bất biến applyMove không mutate
- [ ] Coverage ≥ 95% cho engine

**Deliverable:** `packages/engine` build pass, test pass 100%, coverage ≥ 95%.

**Definition of Done:**
- Tất cả test trong `TESTING.md` mục 2 pass
- Có thể import vào cả frontend và backend không lỗi
- `npm pack` tạo được package hợp lệ

---

## PHASE 2 — UI CƠ BẢN (2 subagents song song)

### `ui-board-agent`
**Scope:** Component bàn cờ + tương tác cơ bản.

**Pre-requisites:** `engine-agent` xong, đọc `UI_UX.md` + `FLOW.md`.

**Tasks:**
- [ ] Component `<Board />` SVG:
  - Vẽ lưới 5×5 với đường chéo đúng vị trí
  - Background gỗ + texture
  - Responsive 100% width, max 500px
- [ ] Component `<Piece />`:
  - Quân đen/trắng với gradient + shadow
  - Animation di chuyển (Framer Motion `layoutId`)
  - Animation flip khi đổi màu (gánh/vây)
- [ ] Component `<BoardOverlay />`:
  - Highlight quân đang chọn
  - Highlight legal destinations (pulse)
  - Highlight ô có gánh (vòng đỏ thêm)
- [ ] Hook `useBoardInteraction`:
  - Quản lý state machine: IDLE → PIECE_SELECTED → ANIMATING (FLOW.md 5.1)
  - Click handlers
- [ ] Story/Demo page hiển thị bàn cờ với state cứng
- [ ] Test:
  - Render đúng số quân đầu ván
  - Click quân hiện legal destinations
  - Click ô đích gọi callback đúng

**Deliverable:** Bàn cờ render đẹp, click chọn quân hiện highlight đúng.

### `ui-shell-agent`
**Scope:** Khung trang, navigation, menu chính, settings, không bao gồm bàn cờ.

**Pre-requisites:** Đọc `UI_UX.md`.

**Tasks:**
- [ ] Setup React Router với các route trong `FLOW.md` mục 1
- [ ] Component `<MainMenu />` (trang chủ)
- [ ] Component `<HowToPlayPage />` (tĩnh, có ảnh minh họa luật)
- [ ] Component `<SettingsModal />`:
  - Toggle sound
  - Toggle theme
  - Toggle language (placeholder, chưa cần i18n)
- [ ] Component `<Toast />` system
- [ ] Layout chung: header, footer (nếu có)
- [ ] Stitch MCP: chạy 4 prompt trong `UI_UX.md` mục 5.3 → lưu mockup vào `docs/mockups/`
- [ ] Zustand store `settingsStore` với persist localStorage
- [ ] Test:
  - Routing hoạt động
  - Settings modal mở/đóng
  - Toast hiển thị + auto dismiss

**Deliverable:** App có shell hoàn chỉnh, navigate được giữa các trang.

---

## PHASE 3 — BOT (1 subagent)

### `bot-agent`
**Scope:** AI bot 3 mức độ trong `packages/bot`.

**Pre-requisites:** `engine-agent` xong, đọc `BOT.md` toàn bộ.

**Tasks:**
- [ ] `prng.ts`: Mulberry32 seeded PRNG
- [ ] `eval.ts`: Hàm đánh giá theo BOT.md mục 2
- [ ] `eval-config.ts`: Trọng số (ban đầu dùng giá trị trong BOT.md, tinh chỉnh sau)
- [ ] `easy.ts`: Random + tránh tự sát (BOT.md mục 3)
- [ ] `search.ts`: Minimax + alpha-beta core
- [ ] `ordering.ts`: Move ordering
- [ ] `medium.ts`: Minimax depth 3 (BOT.md mục 4)
- [ ] `quiescence.ts`: Quiescence search
- [ ] `hard.ts`: Iterative deepening + transposition table (BOT.md mục 5)
- [ ] `index.ts`: `chooseMove(state, config)` switch difficulty
- [ ] **Tests:**
  - Unit test eval (snapshot 5-10 thế cờ)
  - Unit test mỗi cấp độ với seed cố định → deterministic
  - 20 puzzle test (BOT.md mục 7.3)
- [ ] **Self-play benchmark** (BOT.md mục 7.2):
  - Easy vs Random ≥ 70%
  - Medium vs Easy ≥ 80%
  - Hard vs Medium ≥ 70%
  - Script `pnpm bot:bench`
- [ ] **Performance:**
  - Easy < 100ms, Medium < 500ms, Hard 95p < 1500ms

**Tích hợp UI (sau khi bot hoàn thiện):**
- [ ] `apps/web/src/features/bot/botWorker.ts`: Web Worker
- [ ] `useBotMove` hook: trigger bot khi đến lượt + thinking delay
- [ ] Trang `/play/bot` với chọn độ khó

**Deliverable:** Có thể chơi với bot 3 mức độ qua UI, bot pass benchmark.

**Definition of Done:**
- Bot không bao giờ chọn nước không hợp lệ
- Bot không freeze UI (chạy trong worker)
- Self-play benchmark đạt yêu cầu
- 20 puzzle test pass đủ ngưỡng

---

## PHASE 4 — MULTIPLAYER (2 subagents tuần tự)

### `mp-server-agent`
**Scope:** Backend Socket.IO + room management.

**Pre-requisites:** `engine-agent` xong, đọc `MULTIPLAYER.md` toàn bộ.

**Tasks:**
- [ ] Setup Express + Socket.IO trong `apps/server`
- [ ] `utils/codes.ts`: sinh mã phòng 6 ký tự (MULTIPLAYER.md 6.3)
- [ ] `rooms/Room.ts`: class Room theo MULTIPLAYER.md 1.3
- [ ] `rooms/RoomManager.ts`: quản lý phòng + cleanup expired
- [ ] `socket/handlers.ts`: đăng ký tất cả events từ MULTIPLAYER.md mục 2
  - `room:create`, `room:join`, `room:leave`, `room:reconnect`
  - `game:move`, `game:resign`, `game:rematch`
- [ ] Server-side validation cho mọi nước đi (MULTIPLAYER.md 3.1)
- [ ] Reconnect logic (MULTIPLAYER.md 4)
- [ ] Rate limiting (MULTIPLAYER.md 6.2)
- [ ] Health check `/health`
- [ ] Logging cấu trúc (pino)
- [ ] **Tests:**
  - Unit test RoomManager
  - Unit test Room.applyMove
  - Integration test 2 socket: tạo phòng, vào phòng, đi nước, kết thúc
  - Integration test reconnect
  - Integration test rate limit

**Deliverable:** Server chạy được, 2 client có thể chơi 1 ván trọn vẹn.

### `mp-client-agent`
**Scope:** Frontend tích hợp socket + sảnh PvP.

**Pre-requisites:** `mp-server-agent` xong + `ui-board-agent` xong.

**Tasks:**
- [ ] `lib/socket.ts`: singleton client với reconnection logic
- [ ] `stores/socketStore.ts`: Zustand cho connection state
- [ ] `features/room/RoomLobby.tsx`: form tạo / vào phòng
- [ ] `features/room/usePvPGame.ts`: hook đồng bộ state qua socket
- [ ] Optimistic UI cho move (MULTIPLAYER.md 5.3)
- [ ] Trang `/play/pvp` (sảnh) và `/play/pvp/:id` (phòng)
- [ ] UI mất kết nối: banner + countdown 60s + retry
- [ ] Modal "đối thủ rời phòng" / "đối thủ thắng do disconnect"
- [ ] sessionStorage lưu `roomId` + `playerToken` cho reconnect
- [ ] Confirm dialog khi đầu hàng / rời phòng
- [ ] Test E2E (Playwright + Browser MCP):
  - Mở 2 tab → chơi 1 ván trọn vẹn
  - Tab 1 disconnect → tab 2 thấy banner → tab 1 reconnect → resume
  - Đầu hàng → tab kia thấy modal thắng

**Deliverable:** 2 user có thể chơi PvP qua link, phòng đấu ổn định.

---

## PHASE 5 — POLISH (1 subagent)

### `polish-agent`
**Scope:** Animation, âm thanh, responsive, end-game flow.

**Pre-requisites:** Phase 2-4 xong.

**Tasks:**
- [ ] **Animation:**
  - Quân di chuyển smooth (đã có từ board-agent, refine)
  - Flip 3D khi gánh/vây (Framer Motion variants)
  - Hiệu ứng pháo hoa CSS khi thắng
  - Pulse turn indicator
  - Modal slide/fade
- [ ] **Âm thanh:**
  - Tích hợp Howler.js
  - Preload tất cả file trong `public/sounds/`
  - `lib/audio.ts` với play/stop/setVolume
  - Tôn trọng `settingsStore.soundEnabled`
  - Không tự bật âm thanh khi vào trang (browser policy)
- [ ] **Move history:**
  - Component scroll, item format đẹp
  - Hover/click hiện nước đi (sau ván)
  - Mobile: collapsible drawer
- [ ] **Player cards:**
  - Timer countdown (cấu hình thời gian/lượt)
  - Bot "đang nghĩ" spinner
  - Active turn glow
- [ ] **End game modal:**
  - Stats (số nước, thời gian)
  - Confetti khi thắng
  - Replay button (post-MVP, để placeholder)
- [ ] **Responsive:**
  - Test 375px, 768px, 1024px, 1440px
  - Bàn cờ tự scale, không overflow
  - Mobile: drawer cho move history
- [ ] **Accessibility:**
  - aria-label đầy đủ
  - Keyboard navigation (arrows + enter)
  - Reduced motion
  - Focus visible
- [ ] **Hướng dẫn luật:**
  - Trang `/rules` với 4 section + diagram tĩnh
  - Mỗi diagram là SVG nhỏ minh họa

**Deliverable:** UX hoàn chỉnh, smooth, nhìn pro, mobile + desktop.

---

## PHASE 6 — QA & DEPLOY (1 subagent)

### `qa-agent`
**Scope:** Kiểm thử end-to-end + deploy.

**Pre-requisites:** Tất cả phase trước xong.

**Tasks:**
- [ ] **Test plan từ TESTING.md:**
  - Chạy toàn bộ unit test, fix nếu fail
  - Viết E2E test scenarios chính (Playwright + Browser MCP)
  - Run E2E trên Chrome, Firefox, Safari (nếu có)
  - Run trên mobile viewport
- [ ] **Browser MCP scenarios:**
  - Chơi vs bot từng độ khó, screenshot kết quả
  - PvP 2 tab, screenshot sync
  - Test reconnect: disconnect tab 1, đợi 30s, reconnect, verify state
  - Test responsive: chụp 4 viewport size
  - Test accessibility: chạy axe-core qua MCP
- [ ] **Bug fix:**
  - Mọi bug ghi vào `BUGFIX.md`
  - Fix theo priority: critical > high > medium > low
- [ ] **Performance:**
  - Lighthouse run, đạt mục tiêu trong UI_UX.md mục 9 cuối
  - Bundle size: `apps/web` build < 500KB gzipped
  - Code splitting cho `/play/pvp` route
- [ ] **Deploy:**
  - Frontend: Vercel / Netlify
  - Backend: Railway / Render
  - Cấu hình env vars production
  - Domain (nếu có)
  - HTTPS, CORS đúng
- [ ] **Smoke test trên production:**
  - Chơi vs bot 1 ván
  - PvP 1 ván giữa 2 thiết bị thật
- [ ] **README.md production:**
  - Hướng dẫn cài đặt local
  - Hướng dẫn deploy
  - Tech stack
  - Screenshot

**Deliverable:** Website live, không bug critical, đạt Lighthouse mục tiêu.

---

## BẢNG TRẠNG THÁI TỔNG HỢP

| Phase | Subagent | Trạng thái | Ngày bắt đầu | Ngày xong |
|-------|----------|-----------|--------------|-----------|
| P0 | setup-agent | ⬜ Chưa bắt đầu | - | - |
| P1 | engine-agent | ⬜ Chưa bắt đầu | - | - |
| P2 | ui-board-agent | ⬜ Chưa bắt đầu | - | - |
| P2 | ui-shell-agent | ⬜ Chưa bắt đầu | - | - |
| P3 | bot-agent | ⬜ Chưa bắt đầu | - | - |
| P4 | mp-server-agent | ⬜ Chưa bắt đầu | - | - |
| P4 | mp-client-agent | ⬜ Chưa bắt đầu | - | - |
| P5 | polish-agent | ⬜ Chưa bắt đầu | - | - |
| P6 | qa-agent | ⬜ Chưa bắt đầu | - | - |

**Trạng thái:** ⬜ chưa bắt đầu / 🟡 đang làm / ✅ hoàn thành / ❌ blocked

---

## DEPENDENCY GRAPH

```
P0 setup
  ↓
P1 engine ──────────────────┐
  ↓                         │
P2 board ───┐               │
  ↓         ↓               │
P3 bot      P2 shell        │
  ↓                         │
  └─────────┬───────────────┤
            ↓               ↓
            P4 server ──→  P4 client
                           ↓
                           P5 polish
                           ↓
                           P6 QA & deploy
```

**Có thể song song:**
- P2 board ∥ P2 shell (sau P1)
- P3 bot ∥ P4 server (sau P1, không phụ thuộc UI)

---

## KHI SUBAGENT BÁO XONG

Main agent kiểm tra:
1. Đọc code subagent đã viết
2. Chạy test xem có pass không
3. Nếu task có UI: chạy `pnpm dev` và verify bằng Browser MCP
4. Đánh dấu ✅ trong TASKS.md
5. Trigger subagent tiếp theo theo dependency graph
