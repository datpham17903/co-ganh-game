# THIẾT KẾ AI BOT - 3 MỨC ĐỘ KHÓ

> Module `packages/bot` cung cấp 3 cấp độ AI: **Dễ / Trung bình / Khó**. Mỗi cấp độ là một chiến lược ra quyết định độc lập, dùng chung hàm đánh giá và sinh nước đi từ engine.

---

## 1. INTERFACE CHUNG

```typescript
// packages/bot/src/types.ts
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotConfig {
  difficulty: BotDifficulty;
  randomness?: number;       // 0..1, độ ngẫu nhiên (chỉ áp dụng cho easy/medium)
  maxThinkMs?: number;       // giới hạn thời gian nghĩ
  seed?: number;             // để reproduce ván đấu (test)
}

// packages/bot/src/index.ts
export async function chooseMove(
  state: GameState,
  config: BotConfig
): Promise<Move>;
```

**Quy ước:**
- Hàm trả về `Promise` để cho phép cả Web Worker và sync.
- Bot **không gọi engine.applyMove** với side effect — nó dùng `applyMove` của engine để mô phỏng (engine pure).
- Nếu không có nước đi hợp lệ → throw `NoLegalMoveError` (engine sẽ kết thúc ván).

---

## 2. HÀM ĐÁNH GIÁ THẾ CỜ (eval)

`eval(state, color)` trả về số điểm: dương nếu `color` đang lợi, âm nếu bất lợi. Giá trị tuyệt đối lớn = lợi/bất lợi nhiều hơn.

### 2.1. Các thành phần điểm
| Yếu tố | Trọng số | Mô tả |
|--------|----------|-------|
| **Material** | `+100 / quân` | Hiệu số quân: `myCount - oppCount` × 100 |
| **Mobility** | `+2 / nước đi` | Số nước hợp lệ của mình − của đối phương |
| **Center control** | `+10 cho điểm trung tâm` | Điểm `(2,2)` và 4 điểm cạnh giữa |
| **Threat** | `+50 / quân địch sắp gánh` | Số quân địch sẽ bị gánh nếu mình đi tốt nhất |
| **Vulnerability** | `−40 / quân mình sắp bị gánh` | Số quân mình bị đe dọa gánh ngay lượt sau |
| **Trapped opp** | `+30 / quân địch sắp bị vây` | Số quân địch bị bao quanh gần kín |
| **Edge bonus** | `+5 / quân ở góc` | Quân ở góc khó bị gánh chéo |
| **Win/Loss** | `±100000` | Nếu state là win/loss tuyệt đối |

### 2.2. Cài đặt
```typescript
export function evaluate(state: GameState, color: Color): number {
  if (state.status === `${color}_won`) return INF;
  if (state.status === `${oppColor}_won`) return -INF;
  if (state.status === 'draw') return 0;

  const my = countPieces(state.board, color);
  const opp = countPieces(state.board, oppColor);
  let score = (my - opp) * 100;

  score += (mobility(state, color) - mobility(state, oppColor)) * 2;
  score += centerControl(state, color);
  score += threats(state, color) * 50;
  score -= threats(state, oppColor) * 40;
  score += trappedOpp(state, color) * 30;
  score += edgeBonus(state, color);

  return score;
}
```

### 2.3. Tinh chỉnh
- Sau Phase 4, chạy 100 ván self-play giữa các bộ trọng số → chọn bộ tốt nhất.
- Lưu cấu hình trong `packages/bot/src/eval-config.ts` để dễ tinh chỉnh.

---

## 3. CẤP ĐỘ DỄ

### 3.1. Mục tiêu
- Người mới chơi vẫn thắng được sau vài ván.
- Không thua ngay lập tức (tránh nước đi tự sát).
- Có chút bất ngờ để không nhàm chán.

### 3.2. Thuật toán
```
1. Sinh tất cả nước đi hợp lệ.
2. Loại các nước đi "tự sát" (di chuyển vào vị trí bị gánh ngay):
   - Mô phỏng nước đi
   - Mô phỏng nước đi tốt nhất của đối phương ở 1-ply (greedy)
   - Nếu mất ≥ 2 quân → loại
3. Trong các nước còn lại:
   - 30% xác suất chọn nước có gánh > 0 (nếu có)
   - 70% chọn ngẫu nhiên
4. Nếu mọi nước đều "tự sát" → chọn nước mất ít nhất.
```

### 3.3. Tham số mặc định
```typescript
{ difficulty: 'easy', randomness: 0.7, maxThinkMs: 100 }
```

### 3.4. Đặc điểm hành vi
- Hay bỏ qua thế gánh có sẵn.
- Đôi khi tự đặt vào thế bị gánh nhỏ (mất 1 quân).
- Không tính xa.

---

## 4. CẤP ĐỘ TRUNG BÌNH

### 4.1. Mục tiêu
- Người chơi trung cấp phải tập trung mới thắng được.
- Không bao giờ bỏ lỡ gánh hiển nhiên.
- Không bao giờ tự sát rõ ràng.

### 4.2. Thuật toán: Minimax depth 3 + Alpha-Beta
```typescript
function minimax(state, depth, alpha, beta, color, maximizing): number {
  if (depth === 0 || isGameOver(state)) {
    return evaluate(state, color);
  }
  const moves = orderMoves(getAllLegalMoves(state, state.turn));
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      best = Math.max(best, minimax(next, depth-1, alpha, beta, color, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // prune
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      best = Math.min(best, minimax(next, depth-1, alpha, beta, color, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}
```

### 4.3. Move ordering (tăng tốc cắt tỉa)
Sắp xếp nước đi theo thứ tự có thể tốt nhất trước:
1. Nước có gánh
2. Nước tránh bị gánh
3. Nước vào trung tâm
4. Còn lại

### 4.4. Tham số
```typescript
{ difficulty: 'medium', randomness: 0.1, maxThinkMs: 500 }
```

- Có 10% xác suất chọn nước thứ 2 (gần tốt nhất) để không quá máy móc.
- Depth 3 = nghĩ 3 lượt (mình-địch-mình).

---

## 5. CẤP ĐỘ KHÓ

### 5.1. Mục tiêu
- Người chơi giỏi phải vất vả mới hòa.
- Không có nước thua hiển nhiên.
- Tận dụng được mọi thế gánh dây chuyền.

### 5.2. Thuật toán: Iterative Deepening + Alpha-Beta + Quiescence
```
1. Iterative deepening: depth 1, 2, 3, ... cho đến khi hết thời gian (1500ms)
2. Mỗi depth: minimax + alpha-beta + transposition table
3. Tại leaf: nếu vừa có gánh/vây → mở rộng thêm 1-2 ply (quiescence)
4. Move ordering nâng cao:
   - Nước trong bảng PV (principal variation) của lần lặp trước
   - Killer moves (nước gây cắt tỉa ở depth khác)
   - History heuristic
```

### 5.3. Transposition table (cache)
```typescript
const TT = new Map<string, { depth: number; score: number; flag: 'exact'|'lower'|'upper' }>();

const hash = hashState(state);
if (TT.has(hash) && TT.get(hash).depth >= depth) {
  // dùng lại kết quả
}
```

### 5.4. Quiescence search
Tránh "horizon effect" — chỉ dừng tìm kiếm khi state "yên" (không vừa gánh/vây). Nếu vừa gánh, tiếp tục tìm 1-2 ply để xem đối phương có gánh lại không.

### 5.5. Opening book (sau)
- Lưu 20-30 thế khai cuộc tốt vào file JSON.
- Bot tra trước khi chạy minimax.

### 5.6. Tham số
```typescript
{ difficulty: 'hard', randomness: 0, maxThinkMs: 1500 }
```

### 5.7. Hiệu năng yêu cầu
- Bàn 5×5 với ~16 quân, branching factor trung bình 5-8 nước/quân → ~30-50 nước/lượt.
- Depth 5 ≈ 30^5 = 24M nodes (chưa pruning).
- Với alpha-beta tốt: ~100K nodes thực tế → chạy được trong 1.5s trên Web Worker.
- Nếu chậm → giảm depth hoặc thêm pruning.

---

## 6. WEB WORKER

Cả 3 cấp độ đều chạy trong Web Worker để không block UI:

```typescript
// apps/web/src/features/bot/botWorker.ts
import { chooseMove } from '@co-ganh/bot';

self.onmessage = async (e: MessageEvent) => {
  const { state, config, requestId } = e.data;
  try {
    const move = await chooseMove(state, config);
    self.postMessage({ requestId, move });
  } catch (err) {
    self.postMessage({ requestId, error: err.message });
  }
};
```

**Thinking delay tối thiểu** để UX tốt hơn:
- Easy: ≥ 300ms
- Medium: ≥ 500ms
- Hard: ≥ 800ms (vì khó thì user mong đợi bot nghĩ lâu)

Nếu bot tính xong trước, chờ thêm bằng `setTimeout`.

---

## 7. CHIẾN LƯỢC TEST

### 7.1. Unit test
- Test `evaluate` cho thế cờ cụ thể (snapshot)
- Test các thành phần: `mobility`, `threats`, `centerControl`
- Test `chooseMove` với seed cố định → deterministic

### 7.2. Self-play
Test sức mạnh tương đối:
| Match | Số ván | Yêu cầu |
|-------|--------|---------|
| Easy vs Random | 50 | Easy thắng ≥ 70% |
| Medium vs Easy | 50 | Medium thắng ≥ 80% |
| Hard vs Medium | 50 | Hard thắng ≥ 70% |
| Hard vs Hard (mirror) | 30 | Hòa ≥ 40% (cân bằng) |

Script: `pnpm bot:bench`.

### 7.3. Test puzzle
Tập 20 thế cờ có "nước duy nhất đúng" (gánh dây chuyền 4-6 quân, vây bắt buộc, thoát thua...).
- Hard phải giải được ≥ 18/20.
- Medium ≥ 12/20.
- Easy ≥ 5/20.

Lưu trong `packages/bot/tests/puzzles.json`.

### 7.4. Performance benchmark
```
Easy:    < 100ms / nước
Medium:  < 500ms / nước (trung bình)
Hard:    < 1500ms / nước (95 percentile)
```
Đo trên: Node 20, máy tham chiếu 4-core 2.4GHz.

---

## 8. CẤU TRÚC FILE

```
packages/bot/
├── src/
│   ├── types.ts
│   ├── eval.ts                # evaluate + helpers
│   ├── eval-config.ts         # weights (tinh chỉnh)
│   ├── easy.ts                # chooseMoveEasy
│   ├── medium.ts              # chooseMoveMedium (minimax depth 3)
│   ├── hard.ts                # chooseMoveHard (iterative deepening)
│   ├── search.ts              # Minimax core + alpha-beta + TT
│   ├── ordering.ts            # Move ordering
│   ├── quiescence.ts          # Quiescence search
│   ├── prng.ts                # Seeded PRNG (Mulberry32) cho deterministic test
│   └── index.ts               # chooseMove(state, config) → switch difficulty
├── tests/
│   ├── eval.test.ts
│   ├── easy.test.ts
│   ├── medium.test.ts
│   ├── hard.test.ts
│   ├── puzzles.json
│   ├── puzzles.test.ts
│   └── bench.ts               # self-play benchmark
└── package.json
```

---

## 9. NHỮNG ĐIỀU CẦN TRÁNH

- ❌ Đừng dùng `Math.random()` trực tiếp trong logic bot. Dùng PRNG có seed (`prng.ts`) để test reproducible.
- ❌ Đừng mutate `GameState` trong bot. Luôn dùng `applyMove` (immutable).
- ❌ Đừng tính lại legal moves trong vòng lặp đệ quy nếu có thể cache.
- ❌ Đừng đặt depth quá sâu cho hard mà không có alpha-beta + ordering — sẽ timeout.
- ❌ Đừng bỏ qua case `getAllLegalMoves` trả về rỗng — engine phải xử lý là hết nước → hòa hoặc thua.

---

## 10. HƯỚNG MỞ RỘNG (POST-MVP)

- **Adaptive difficulty:** điều chỉnh độ khó dựa trên tỉ lệ thắng/thua của user.
- **MCTS (Monte Carlo Tree Search):** thay minimax cho hard, có thể mạnh hơn ở một số thế.
- **Neural net evaluator:** train một mạng nhỏ trên ván self-play, thay heuristic. Yêu cầu data lớn.
- **Personality:** bot "tấn công" / "phòng thủ" — chỉnh trọng số khác nhau.
