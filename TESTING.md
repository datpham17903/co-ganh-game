# PLAN KIỂM THỬ

> Chiến lược test theo từng tầng (engine → bot → UI → server → E2E), kèm hướng dẫn dùng **Browser MCP** cho automation.

---

## 1. TỔNG QUAN PYRAMID

```
            ┌─────────────────┐
            │  E2E (Browser)  │  ← Browser MCP, ít nhưng quan trọng
            └─────────────────┘
          ┌───────────────────────┐
          │  Integration (socket) │  ← server + client
          └───────────────────────┘
        ┌─────────────────────────────┐
        │  Component (UI)             │  ← React Testing Library
        └─────────────────────────────┘
      ┌───────────────────────────────────┐
      │  Unit (engine, bot, utils)        │  ← Vitest, nhiều
      └───────────────────────────────────┘
```

| Tầng | Tool | Số test ước tính | Run time mục tiêu |
|------|------|------------------|-------------------|
| Unit | Vitest | 150-200 | < 5s |
| Component | RTL + Vitest | 30-50 | < 10s |
| Integration | Vitest + socket.io-client | 10-15 | < 15s |
| E2E | Playwright + Browser MCP | 8-12 scenarios | < 60s |

---

## 2. UNIT TEST - ENGINE

File: `packages/engine/tests/`

### 2.1. `board.test.ts`
- [ ] `createInitialBoard` trả về 25 phần tử
- [ ] Tổng quân đen = 8, trắng = 8, trống = 9
- [ ] Vị trí từng quân khớp layout RULES.md mục 1.3
- [ ] `index2coord(0)` = `(0,0)`, `index2coord(24)` = `(4,4)`
- [ ] `coord2index(2,3)` = 13
- [ ] Round-trip: `index2coord(coord2index(r,c))` = `(r,c)`

### 2.2. `adjacency.test.ts`
- [ ] Điểm `(0,0)` (góc) có 3 điểm kề (phải, dưới, chéo)
- [ ] Điểm `(2,2)` (giữa) có 8 điểm kề (đủ ngang dọc chéo)
- [ ] Điểm `(1,0)` (KHÔNG có chéo) chỉ có 3 điểm kề (lên, xuống, phải)
- [ ] Điểm `(1,1)` (CÓ chéo) có 8 điểm kề
- [ ] Tính đối xứng: nếu `b ∈ ADJ[a]` thì `a ∈ ADJ[b]`

### 2.3. `moves.test.ts`
- [ ] Đầu ván, đen có ≥ 3 nước hợp lệ (các quân ở hàng 1)
- [ ] Đầu ván, trắng KHÔNG có nước (chưa đến lượt) — `getAllLegalMoves(state, 'W')` trả về rỗng nếu turn ≠ W. (Hoặc: hàm trả về tất cả nước của W bất kể lượt — chốt 1 cách rồi viết test)
- [ ] Quân ở `(0,0)` đầu ván chỉ có thể đi xuống chéo nếu `(1,1)` trống
- [ ] Quân không thể đi vào ô đã có quân khác

### 2.4. `rules.test.ts` - Gánh (8 test bắt buộc)
- [ ] `gánh-ngang`: setup `W . W` ở hàng, B đi vào giữa → 2 W bị gánh
- [ ] `gánh-dọc`: tương tự cột
- [ ] `gánh-chéo`: tại điểm có đường chéo
- [ ] `gánh-không-có-đường-chéo`: B đi vào `(1,0)`, dù có 2 W ở chéo cũng không gánh
- [ ] `gánh-đa`: 1 nước gánh đồng thời ngang + dọc → cả 4 quân đổi
- [ ] `không-gánh-quân-mình`: A và B cùng màu với M
- [ ] `không-gánh-quân-đứng-yên`: M đứng yên, đối phương đi tạo thế → không tự gánh
- [ ] `không-phản-ứng-dây-chuyền`: quân vừa đổi màu không kích gánh tiếp

### 2.5. `rules.test.ts` - Vây (5 test)
- [ ] `vây-1-quân`: 1 W đơn lẻ bị 4 B bao quanh hết lối → đổi màu
- [ ] `vây-nhóm`: nhóm 2-3 W liên kết bị bao kín
- [ ] `vây-sau-gánh`: nước gánh tạo thế vây thêm
- [ ] `không-vây-nếu-còn-lối`: nhóm còn 1 ô trống kề
- [ ] `không-vây-quân-mình`

### 2.6. `game.test.ts`
- [ ] `applyMove` không mutate state cũ (deep equal trước/sau)
- [ ] Tổng quân = 16 sau mỗi nước (trừ trường hợp ô trống ban đầu)
- [ ] Đổi lượt sau mỗi nước
- [ ] `noProgressCount` reset khi có gánh/vây, +1 nếu không
- [ ] Phát hiện thắng: 1 bên = 0 quân
- [ ] Phát hiện hòa: state lặp 3 lần → status = draw
- [ ] Phát hiện hòa: noProgressCount = 50 → draw
- [ ] Phát hiện hòa: bên đi không có nước → draw
- [ ] `hashState` deterministic + thay đổi khi state thay đổi

### 2.7. Property-based testing (bonus)
Dùng `fast-check` để kiểm tra invariants:
```typescript
test.prop([gameStateArbitrary])('apply random legal move keeps total = 16', (state) => {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return;
  const move = moves[Math.floor(Math.random() * moves.length)];
  const next = applyMove(state, move);
  expect(countAll(next.board)).toBe(16);
});
```

---

## 3. UNIT TEST - BOT

File: `packages/bot/tests/`

### 3.1. `eval.test.ts`
- [ ] Win state cho `color` → `+INF`
- [ ] Loss state → `-INF`
- [ ] Draw → 0
- [ ] State đối xứng → `evaluate(s, 'B')` = `-evaluate(s, 'W')`
- [ ] State có lợi vật chất → eval dương

### 3.2. Test deterministic mỗi cấp độ
Dùng seed cố định, snapshot move:
```typescript
test('easy with seed 42 chooses move X at initial state', () => {
  const state = createInitialState();
  const move = chooseMove(state, { difficulty: 'easy', seed: 42 });
  expect(move).toEqual({ from: 6, to: 11 });  // ví dụ
});
```

### 3.3. `puzzles.test.ts` (20 puzzles)
Mỗi puzzle có:
```json
{
  "name": "fork-3-pieces",
  "fen": "WWWWW/W___W/__B__/B___B/BBBBB W",
  "expected_move": { "from": 12, "to": 13 },
  "difficulty_pass": ["medium", "hard"]
}
```
- Hard phải giải ≥ 18/20
- Medium ≥ 12/20
- Easy ≥ 5/20

### 3.4. Self-play benchmark (`pnpm bot:bench`)
Script chạy N ván giữa 2 bot, in tỉ lệ thắng:
```
Easy vs Random:    35W 5L 10D / 50  (thắng 70%)  ✓
Medium vs Easy:    42W 3L 5D / 50   (thắng 84%)  ✓
Hard vs Medium:    36W 4L 10D / 50  (thắng 72%)  ✓
Hard vs Hard:      18D / 30 (40% draw — cân bằng) ✓
```

### 3.5. Performance benchmark
```typescript
test('hard chooses move under 1500ms (95p)', async () => {
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const state = randomMidGameState(seed=i);
    const t = performance.now();
    await chooseMove(state, { difficulty: 'hard' });
    samples.push(performance.now() - t);
  }
  samples.sort((a,b) => a-b);
  expect(samples[Math.floor(samples.length * 0.95)]).toBeLessThan(1500);
});
```

---

## 4. COMPONENT TEST (UI)

File: `apps/web/src/**/*.test.tsx`

### 4.1. `<Board />`
- [ ] Render 16 quân khi state là initial
- [ ] Click quân → onPieceClick được gọi với index đúng
- [ ] Quân đang chọn có class `selected`
- [ ] Legal destinations render đúng số lượng

### 4.2. `<Piece />`
- [ ] Render màu đúng theo prop
- [ ] Animation khi prop position thay đổi
- [ ] Animation flip khi prop color thay đổi

### 4.3. `<MainMenu />`
- [ ] 3 nút chính render
- [ ] Click "Chơi với BOT" navigate đúng

### 4.4. `<RoomLobby />`
- [ ] Click "Tạo phòng" gọi socket.emit('room:create')
- [ ] Input mã phòng + click "Vào" gọi `room:join`
- [ ] Show lỗi nếu mã không tồn tại

### 4.5. `useBoardInteraction`
- [ ] State machine đúng theo FLOW.md 5.1
- [ ] Click quân địch ở IDLE → vẫn IDLE
- [ ] Click ô không hợp lệ ở PIECE_SELECTED → IDLE

---

## 5. INTEGRATION TEST - SERVER

File: `apps/server/tests/`

### 5.1. RoomManager
- [ ] Tạo phòng trả mã 6 ký tự
- [ ] Mã không trùng (mock 1000 phòng)
- [ ] Join phòng tồn tại OK
- [ ] Join phòng không tồn tại → error
- [ ] Phòng đã đầy → error
- [ ] Cleanup expired sau TTL

### 5.2. Full game flow (2 socket clients)
```typescript
test('full PvP game ends when one side has 0 pieces', async () => {
  const a = io(serverUrl);
  const b = io(serverUrl);
  
  const { roomId } = await emit(a, 'room:create', { playerName: 'A' });
  await emit(b, 'room:join', { roomId, playerName: 'B' });
  
  // Mô phỏng các nước đi đến endgame...
  for (const move of scriptedMoves) {
    const sender = move.color === 'B' ? a : b;
    await emit(sender, 'game:move', move);
    await once(b, 'game:moveApplied');
  }
  
  const over = await once(a, 'game:over');
  expect(over.winner).toBe('B');
});
```

### 5.3. Edge cases
- [ ] Move từ socket không trong phòng → error NO_ROOM
- [ ] Move không phải lượt mình → error NOT_YOUR_TURN
- [ ] Move không hợp lệ → error INVALID_MOVE
- [ ] Reconnect: A disconnect, B vẫn nhận `room:opponentLeft`, A reconnect trong 60s, B nhận `room:opponentReconnected`
- [ ] Reconnect quá 60s → A coi như thua, B nhận `game:over`
- [ ] Rate limit: spam 100 move trong 1s → bị reject

---

## 6. E2E TEST với BROWSER MCP

> Browser MCP cho phép điều khiển Chrome thật từ session. Dùng để verify ván đấu chạy đúng trên UI thật, không chỉ test logic.

### 6.1. Cài đặt Browser MCP
- Dùng `@browsermcp/mcp` (Browser MCP) hoặc Playwright MCP.
- Add vào MCP config: `mcp.json` với server browser MCP.
- Test connection: `list_tools` thấy `browser_navigate`, `browser_click`, `browser_screenshot`.

### 6.2. Scenarios bắt buộc

#### Scenario 1: Smoke test - vào trang chính
```
1. browser_navigate → http://localhost:5173
2. browser_screenshot → so sánh với baseline
3. assert: text "CỜ GÁNH" tồn tại
4. assert: 3 nút chế độ chơi tồn tại
```

#### Scenario 2: Chơi vs bot Dễ - 5 nước đầu
```
1. navigate → /
2. click "Chơi với BOT"
3. click "Dễ"
4. click "Đen"
5. click "Bắt đầu"
6. URL = /play/bot
7. click quân ở (1,0) — đợi highlight
8. click ô (2,1) (legal destination)
9. screenshot sau move
10. đợi bot phản ứng < 2s
11. screenshot sau bot move
12. assert: lượt = 'B' lại
```

#### Scenario 3: PvP đầy đủ với 2 tab
```
1. browser_open_tab tab1
2. tab1: navigate → /play/pvp
3. tab1: type tên "PlayerA"
4. tab1: click "Tạo phòng"
5. tab1: extract mã phòng từ DOM (data-room-id)
6. browser_open_tab tab2
7. tab2: navigate → /play/pvp
8. tab2: type tên "PlayerB"
9. tab2: type mã phòng
10. tab2: click "Vào"
11. cả 2 tab: assert URL chứa /play/pvp/<roomId>
12. cả 2 tab: assert bàn cờ render
13. tab1 (đen): click quân + đi 1 nước
14. tab2: assert state cập nhật trong < 500ms
15. tab2: đi nước → tab1 cập nhật
16. screenshot cả 2 tab
```

#### Scenario 4: Reconnect
```
1. setup ván PvP như scenario 3
2. tab1: đi 2 nước
3. tab1: browser_close (hoặc browser_navigate URL khác)
4. tab2: assert banner "Đối thủ mất kết nối"
5. tab1: navigate lại /play/pvp/<roomId>
6. tab1: assert state ván bằng trạng thái lúc trước (không reset)
7. tab2: assert banner biến mất, "đối thủ đã kết nối lại"
```

#### Scenario 5: Responsive
Chụp screenshot ở 4 viewport, so sánh layout:
```
- 375x667 (iPhone SE)
- 414x896 (iPhone 11)
- 768x1024 (iPad)
- 1440x900 (desktop)
```
Assert: bàn cờ không overflow, tất cả button click được.

#### Scenario 6: Accessibility
```
1. navigate → /
2. browser_run_axe (nếu MCP hỗ trợ) hoặc inject axe-core và run
3. assert: 0 violation level "critical" hoặc "serious"
```

#### Scenario 7: Đầu hàng
```
1. setup ván vs bot
2. đi 1 nước
3. click "Đầu hàng"
4. confirm modal: click "Yes"
5. assert: modal "Bạn thua" hiện
6. click "Đấu lại"
7. assert: bàn cờ reset
```

#### Scenario 8: Hết quân
Setup ván với scripted moves dẫn đến endgame trong < 30 nước:
```
1. seedGame với scripted moves
2. đi đến nước cuối
3. assert: modal "Thắng/Thua" hiện
4. assert: lý do = "gánh hết quân"
```

### 6.3. Cấu trúc file
```
apps/web/tests/e2e/
├── smoke.spec.ts
├── play-bot.spec.ts
├── play-pvp.spec.ts
├── reconnect.spec.ts
├── responsive.spec.ts
├── accessibility.spec.ts
└── fixtures/
    ├── scripted-games.ts    # nước đi mô phỏng
    └── viewports.ts
```

### 6.4. Cách chạy
```bash
# Local
pnpm e2e

# Trong CI
pnpm e2e --reporter=html
```

### 6.5. Browser MCP usage trong agent QA
QA agent sẽ:
1. Chạy `pnpm dev` (foreground task hoặc background)
2. Đợi server up (poll /health)
3. Gọi Browser MCP tool theo từng scenario
4. Capture screenshot vào `apps/web/tests/screenshots/<scenario>.png`
5. Tổng hợp report → `BUGFIX.md`

---

## 7. VISUAL REGRESSION TEST (sau)

- Lưu screenshot baseline ở `tests/screenshots/baseline/`.
- Mỗi PR: chụp lại + so sánh pixel diff.
- Threshold 1% diff → fail.
- Tools: `playwright-test` built-in `toHaveScreenshot()`.

---

## 8. TEST DATA - SCRIPTED GAMES

File: `tests/fixtures/scripted-games.ts`

```typescript
export const SHORT_GAME_BLACK_WIN: Move[] = [
  { from: 6,  to: 7,  color: 'B' },
  { from: 16, to: 12, color: 'W' },
  // ... 20-30 nước dẫn đến đen thắng
];

export const SHORT_GAME_DRAW_REPETITION: Move[] = [
  // di chuyển đi-về 3 lần để trigger draw
];
```

Dùng trong test E2E + integration để có deterministic outcome.

---

## 9. CHECKLIST KIỂM THỬ BẮT BUỘC TRƯỚC RELEASE

- [ ] Toàn bộ unit test pass (`pnpm test`)
- [ ] Coverage engine ≥ 95%
- [ ] Coverage bot ≥ 80%
- [ ] Bot benchmark đạt ngưỡng
- [ ] Tất cả 8 E2E scenarios pass
- [ ] Lighthouse Performance ≥ 90, A11y ≥ 95
- [ ] Manual test: chơi 1 ván vs hard, 1 ván PvP với người thật
- [ ] Test trên 3 trình duyệt: Chrome, Firefox, Safari
- [ ] Test trên iOS Safari + Android Chrome thật
- [ ] Không có error trong browser console
- [ ] Không có warning trong server log

---

## 10. CI/CD (POST-MVP)

```yaml
# .github/workflows/ci.yml
- pnpm install
- pnpm typecheck
- pnpm lint
- pnpm test (unit + integration)
- pnpm build
- pnpm e2e (chỉ trên main branch)
```

Run on: push tới main, mọi PR.

Cache: pnpm store, Playwright browsers.
