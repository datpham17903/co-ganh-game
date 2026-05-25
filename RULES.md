# LUẬT CỜ GÁNH - CHI TIẾT KỸ THUẬT

> Tài liệu này là **nguồn sự thật** (source of truth) cho mọi logic luật chơi. Mọi subagent làm engine/bot/UI phải đọc kỹ.
> Tham khảo: https://vi.wikipedia.org/wiki/C%E1%BB%9D_g%C3%A1nh

---

## 1. BÀN CỜ

### 1.1. Cấu trúc

- Bàn cờ là lưới **5×5 = 25 điểm giao** (không phải ô).
- Quân được đặt **tại các điểm giao**, không phải trong ô.
- Hệ tọa độ: dùng `(row, col)` với `row ∈ [0..4]`, `col ∈ [0..4]`. Điểm `(0,0)` ở góc trên-trái.

### 1.2. Đường nối (kết nối giữa các điểm)

Mỗi điểm có thể kết nối với các điểm lân cận theo 3 loại đường:

- **Đường ngang:** mọi điểm `(r, c)` ↔ `(r, c±1)` (luôn có)
- **Đường dọc:** mọi điểm `(r, c)` ↔ `(r±1, c)` (luôn có)
- **Đường chéo:** chỉ một số điểm có. Theo bàn cờ chuẩn, đường chéo nối tại các điểm mà tổng `(r+c)` chẵn — tức các giao điểm "đậm" trên bàn truyền thống.

**Bảng tra điểm có đường chéo** (điểm có thể đi chéo tới 4 hướng):

```
(0,0) (0,2) (0,4)
(1,1) (1,3)
(2,0) (2,2) (2,4)
(3,1) (3,3)
(4,0) (4,2) (4,4)
```

Các điểm còn lại chỉ đi được ngang/dọc.

> **Quy ước cài đặt:** lưu sẵn `adjacency[25]` là mảng các điểm kề (precomputed) để tra cứu O(1).

### 1.3. Vị trí xuất phát

Mỗi bên có **8 quân**, đặt ở 2 hàng cận biên của mình:

- **Quân ĐEN** (đi trước, theo quy ước): hàng 0 và hàng 1.
- **Quân TRẮNG**: hàng 3 và hàng 4.
- **Hàng 2** (giữa) và 1 ô đặc biệt để trống ban đầu.

Layout chuẩn (ký hiệu: `B`=Đen, `W`=Trắng, `.`=trống):

```
Row 0: B B B B B
Row 1: B . . . B
Row 2: W . . . B
Row 3: W . . . W
Row 4: W W W W W
```

Tổng: 8 đen + 8 trắng + 9 ô trống = 25.

> **Cách đặt:** quân nằm ở các điểm rìa bàn (theo Wikipedia "Cờ gánh"). Đen ở 5 điểm hàng 0, 2 điểm cột 0+4 hàng 1, và (2,4); Trắng ở 5 điểm hàng 4, 2 điểm cột 0+4 hàng 3, và (2,0). Đường chia đôi theo đường chéo phụ.

---

## 2. LƯỢT ĐI

- Quân **ĐEN đi trước**.
- Mỗi lượt người chơi di chuyển **đúng 1 quân** sang **1 điểm trống kề** (theo đường nối, không nhảy qua quân khác).
- Sau khi di chuyển, kiểm tra theo thứ tự:
  1. Có **gánh** nào không → đổi màu các quân bị gánh.
  2. Có **vây/chẹt** nào không → đổi màu các quân bị vây.
  3. Có **mở** không → cảnh báo (chỉ để hiển thị, không bắt buộc chơi như cũ).
  4. Kiểm tra **kết thúc ván**.
- Đổi lượt cho đối thủ.

> Không có ăn quân, chỉ có **đổi màu**. Tổng số quân trên bàn luôn = 16 (trừ khi cả hai cùng có ô trống).

---

## 3. LUẬT GÁNH

### 3.1. Định nghĩa

Sau nước đi, gọi quân vừa di chuyển là `M` (màu của người đang đi). Với mỗi đường nối thẳng đi qua `M` (ngang, dọc, hoặc chéo nếu áp dụng), kiểm tra:

- Tồn tại 2 điểm `A` và `B` đối xứng qua `M` trên cùng một đường thẳng (cùng hướng, cùng khoảng cách = 1).
- `A` và `B` cùng màu **đối phương** (khác màu với `M`).

→ Khi đó **A và B bị gánh**, đổi sang màu của `M`.

### 3.2. Điều kiện chính xác

- **Chỉ áp dụng khi quân vừa di chuyển vào**, không áp dụng cho quân đứng yên.
- **Phải có đường nối hình học** giữa A-M-B (xem mục 1.2). Nếu M ở điểm không có đường chéo thì không xét gánh chéo qua M.
- Nhiều cặp gánh có thể xảy ra cùng lúc (gánh ngang + dọc + chéo) → tất cả đều đổi màu.
- **Phản ứng dây chuyền KHÔNG xảy ra:** sau khi gánh, các quân vừa đổi màu KHÔNG kích hoạt gánh tiếp theo. Chỉ quân `M` mới gánh được.

### 3.3. Ví dụ

```
Trước:    Sau khi B di chuyển vào (2,2):
W . W    W . W
. B .    . . .
W . W →  B . B  (4 quân W chéo + ngang/dọc bị gánh)
. . .    . . .
```

_Ví dụ minh họa chỉ phần xung quanh, không phải toàn bàn._

### 3.4. Test case bắt buộc cho engine

- `gánh-ngang`: 1 quân giữa 2 quân địch theo hàng ngang
- `gánh-dọc`: theo cột dọc
- `gánh-chéo`: tại điểm có đường chéo
- `gánh-không-có-đường-chéo`: tại điểm `(1,0)` (không có đường chéo) thì không gánh chéo
- `gánh-đa`: gánh đồng thời 2-3 hướng = nhiều cặp một lúc
- `không-gánh-quân-mình`: A và B cùng màu với M → không gánh
- `không-gánh-quân-đứng-yên`: M đứng yên, đối phương đi vào tạo thế → không tự gánh
- `không-phản-ứng-dây-chuyền`: quân vừa đổi màu không kích gánh tiếp

---

## 4. LUẬT VÂY (CHẸT)

### 4.1. Định nghĩa

Sau khi xử lý gánh, kiểm tra mỗi nhóm liên thông quân **đối phương** (cùng màu, kết nối qua đường nối):

- Nếu nhóm đó **không có nước đi hợp lệ** (không quân nào trong nhóm có thể di chuyển sang điểm trống kề) → **toàn bộ nhóm bị vây**.
- Tất cả quân trong nhóm đổi sang màu của người vừa đi.

### 4.2. Cách kiểm tra (thuật toán)

1. Sau xử lý gánh, lặp qua tất cả quân **đối phương** trên bàn.
2. Dùng **flood-fill** để tìm các nhóm liên thông (theo đường nối).
3. Với mỗi nhóm: duyệt từng quân, từng điểm kề. Nếu tồn tại điểm kề trống → nhóm còn lối thoát.
4. Nhóm không có lối thoát nào → bị vây → đổi màu toàn bộ.

### 4.3. Lưu ý

- Vây áp dụng **sau** khi gánh đã xử lý xong (vì gánh có thể tạo ra thế vây mới).
- Vây có thể xảy ra **mà không cần gánh trước** (chỉ nhờ nước đi che lối thoát cuối).
- Vây không phản ứng dây chuyền cho lượt mình.
- Một quân đơn lẻ (nhóm 1 phần tử) cũng bị vây nếu không có ô kề trống.

### 4.4. Test case bắt buộc

- `vây-1-quân`: 1 quân địch bị bao quanh hoàn toàn
- `vây-nhóm`: nhóm 2-3 quân bị bao quanh
- `vây-sau-gánh`: gánh xong tạo thế vây
- `không-vây-nếu-còn-lối`: nhóm còn 1 ô trống kề → không vây
- `không-vây-quân-mình`: chỉ kiểm tra nhóm đối phương

---

## 5. LUẬT MỞ

### 5.1. Định nghĩa

"Mở" là khi **đối phương** chủ động di chuyển quân của họ vào vị trí mà sẽ bị quân ta gánh ở lượt sau. Đây là **lựa chọn chiến thuật**, không phải bắt buộc.

### 5.2. Trong dự án này

- **KHÔNG ép buộc** đối phương phải gánh.
- Engine **không xử lý đặc biệt** luật mở.
- UI có thể **highlight cảnh báo** nếu nước đi của bot/người chơi tạo thế bị gánh ngay lượt sau (chỉ với độ khó Dễ/Trung bình hỗ trợ học người mới).

> Quyết định: bỏ qua luật "ép gánh" để đơn giản hóa, đúng với cách chơi giao hữu phổ biến.

---

## 6. ĐIỀU KIỆN KẾT THÚC VÁN

### 6.1. Thắng/Thua

- **Thắng:** Đối phương không còn quân nào trên bàn.
  - Trên thực tế, điều này hiếm xảy ra vì mỗi nước chỉ đổi màu, không loại bỏ. Nhưng nếu một bên đổi được hết 8 quân địch thành quân mình → thắng.
- **Tổng quát:** Nếu một bên có **0 quân** (do tất cả đã đổi màu) → bên đó **thua**.

### 6.2. Hòa

- **Lặp thế cờ 3 lần:** Nếu cùng một thế bàn (vị trí + màu + lượt đi) xuất hiện 3 lần → hòa.
- **Hết nước đi của bên đang đi:** Bên đang đi không có nước hợp lệ → **hòa** (theo quy ước dự án).
- **Đếm số nước không gánh/vây:** Nếu **50 nước liên tiếp** không có gánh hoặc vây nào → hòa.

> Các luật hòa giúp tránh ván kéo dài vô hạn.

### 6.3. Đầu hàng

- Người chơi có thể **đầu hàng** bất cứ lúc nào → đối phương thắng.
- Trong PvP, mất kết nối quá **60 giây** → tính như đầu hàng (cấu hình được).

---

## 7. CẤU TRÚC DỮ LIỆU CHUẨN

### 7.1. Trạng thái bàn cờ

```typescript
type Color = 'B' | 'W'; // Đen / Trắng
type Cell = Color | null; // null = trống

interface GameState {
  board: Cell[]; // 25 phần tử, index = row*5 + col
  turn: Color; // lượt hiện tại
  moveHistory: Move[]; // toàn bộ nước đi
  capturedHistory: Capture[]; // log gánh/vây để replay
  status: 'playing' | 'B_won' | 'W_won' | 'draw';
  drawReason?: 'repetition' | 'no_moves' | '50_moves';
  noProgressCount: number; // đếm 50 nước không gánh/vây
}

interface Move {
  from: number; // 0..24
  to: number;
  color: Color;
}

interface Capture {
  type: 'ganh' | 'vay';
  positions: number[]; // index các quân bị đổi màu
  byMove: number; // số thứ tự nước đi gây ra
}
```

### 7.2. API Engine (chuẩn để mọi subagent dùng)

```typescript
// packages/engine/src/index.ts
export function createInitialState(): GameState;
export function getLegalMoves(state: GameState, from: number): number[];
export function getAllLegalMoves(state: GameState, color?: Color): Move[];
export function applyMove(state: GameState, move: Move): GameState; // immutable
export function isGameOver(state: GameState): boolean;
export function getWinner(state: GameState): Color | 'draw' | null;
export function hashState(state: GameState): string; // để check lặp 3 lần
```

---

## 8. CHECKLIST TEST CASE BẮT BUỘC

Engine phải pass **tất cả** test sau (sẽ liệt kê chi tiết trong [TESTING.md](TESTING.md)):

- [ ] Khởi tạo bàn cờ đúng layout
- [ ] Sinh nước đi hợp lệ tại mọi điểm (kể cả góc, biên, điểm có/không đường chéo)
- [ ] Gánh: 8 test case ở mục 3.4
- [ ] Vây: 5 test case ở mục 4.4
- [ ] Phản ứng đúng thứ tự gánh → vây
- [ ] Phát hiện thắng/thua khi 1 bên = 0 quân
- [ ] Phát hiện hòa: lặp 3 lần, hết nước, 50 nước không tiến triển
- [ ] Bất biến: tổng số quân trên bàn = 16 sau mỗi nước
- [ ] Bất biến: applyMove không mutate state cũ
