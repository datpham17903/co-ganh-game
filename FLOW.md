# USER FLOW & GAME FLOW

> Mô tả luồng người dùng từ lúc vào trang đến kết thúc ván, kèm các edge case.

---

## 1. SITE MAP

```
/                       Trang chủ - chọn chế độ
├── /play/bot           Chơi với BOT (chọn độ khó + màu quân)
├── /play/local         Chơi 2 người trên 1 máy
├── /play/pvp           Sảnh PvP (tạo/vào phòng)
│   └── /play/pvp/:id   Phòng đấu cụ thể
├── /rules              Hướng dẫn luật chơi
└── /settings           Cài đặt (âm thanh, theme, ngôn ngữ)
```

---

## 2. USER FLOW CHÍNH

### 2.1. Vào trang lần đầu
```
[Vào /] 
  ↓
[Hiển thị MainMenu]
  - Nút "Chơi với BOT" 
  - Nút "Chơi với bạn (online)"
  - Nút "Chơi 2 người (cùng máy)"
  - Nút "Hướng dẫn"
  - Icon cài đặt (góc phải)
  ↓
User click 1 trong các nút
```

### 2.2. Flow: Chơi với BOT
```
[Click "Chơi với BOT"]
  ↓
[Hiện modal/page chọn:]
  - Độ khó: ○ Dễ  ● Trung bình  ○ Khó
  - Màu quân: ● Đen (đi trước)  ○ Trắng
  - Nút "Bắt đầu"
  ↓
[Vào /play/bot, khởi tạo ván]
  - Nếu user chọn Trắng → BOT đi trước
  - Hiển thị bàn cờ, thông tin 2 bên, lượt
  ↓
[Vòng lặp ván đấu — xem mục 3]
  ↓
[Kết thúc → modal: "Thắng/Thua/Hòa"]
  - Nút "Đấu lại" (reset, giữ độ khó)
  - Nút "Đổi độ khó"
  - Nút "Về menu"
```

### 2.3. Flow: Chơi PvP online
```
[Click "Chơi với bạn (online)"]
  ↓
[Vào /play/pvp - sảnh]
  - Nhập tên hiển thị (auto-load từ localStorage)
  - 2 lựa chọn:
    [A] Tạo phòng → server trả mã 6 ký tự VD: "ABC123"
        → Hiển thị mã + nút copy + chờ đối thủ
    [B] Vào phòng → input mã → click "Vào"
  ↓
[Khi 2 người đã vào /play/pvp/:id]
  - Server bắn event "game:start"
  - Hiển thị bàn cờ
  - Người tạo phòng = ĐEN (đi trước)
  - Người vào sau = TRẮNG
  ↓
[Vòng lặp ván đấu PvP — xem mục 4]
  ↓
[Kết thúc]
  - Modal: thắng/thua/hòa
  - Nút "Đấu lại" → gửi rematch request
  - Nút "Rời phòng" → về sảnh
```

### 2.4. Flow: Chơi 2 người cùng máy (local)
```
[Click "Chơi 2 người (cùng máy)"]
  ↓
[Vào /play/local]
  - Bàn cờ hiển thị
  - 2 người thay nhau click trên cùng màn hình
  - Không có bot, không có server
  ↓
[Kết thúc → modal kết quả]
```

---

## 3. GAME FLOW (vs BOT/local)

```
┌─────────────────────────────────────────┐
│ TURN START                              │
└────────┬────────────────────────────────┘
         ↓
   ┌─────────────┐
   │ Lượt của ai?│
   └──┬───────┬──┘
      │       │
   USER    BOT
      ↓       ↓
┌──────────┐  ┌─────────────────────────┐
│ Chờ user │  │ Bot tính toán (worker)  │
│  click   │  │ - difficulty=easy: ~50ms│
│          │  │ - medium: ~200ms        │
│          │  │ - hard: ~1-3s           │
│          │  │ Tối thiểu 500ms để      │
│          │  │ user thấy "đang nghĩ"   │
└────┬─────┘  └─────────┬───────────────┘
     │ click quân       │
     ↓                  │
┌────────────────┐      │
│ Chọn quân:     │      │
│ - validate     │      │
│ - hiện legal   │      │
│   destinations │      │
└────┬───────────┘      │
     │ click ô đích     │
     ↓                  ↓
┌─────────────────────────────────────────┐
│ APPLY MOVE                              │
│ - engine.applyMove(state, move)         │
│ - process gánh → đổi màu                │
│ - process vây → đổi màu                 │
│ - cập nhật moveHistory + capturedHistory│
└────┬────────────────────────────────────┘
     ↓
┌─────────────────────────┐
│ ANIMATION + SOUND       │
│ - Quân di chuyển: 250ms │
│ - Quân bị gánh đổi màu: │
│   - flash + flip: 400ms │
│ - Sound: move/capture   │
└────┬────────────────────┘
     ↓
┌─────────────────────────┐
│ CHECK END               │
│ - 1 bên = 0 quân?       │
│ - lặp 3 lần?            │
│ - 50 nước không tiến?   │
│ - bên đi không có nước? │
└────┬────────────────────┘
     ↓
   ┌──────────────┐
   │ Game over?   │
   └──┬────────┬──┘
     YES       NO
      ↓        ↓
   END     SWITCH TURN → quay lại đầu
   ↓
[Hiển thị modal kết quả]
```

---

## 4. GAME FLOW (PvP online)

```
PLAYER A (ĐEN)              SERVER                 PLAYER B (TRẮNG)
─────────────              ──────                 ────────────────

1. Click chọn quân
   - validate local bằng engine
   - highlight legal destinations
   (KHÔNG gửi server)
   
2. Click ô đích
   - emit('game:move', {from, to})
   - UI: hiện trạng thái "đang gửi..."
                          ↓
                          3. Nhận event
                          4. Validate:
                             - Đúng lượt?
                             - Nước hợp lệ?
                          5a. Nếu OK:
                             - applyMove
                             - emit('game:moveApplied',
                                    {state, captures}) cho cả 2
                          5b. Nếu sai:
                             - emit('game:moveRejected',
                                    {reason}) chỉ A
                          ↓                ↓
6. Nhận moveApplied                       6. Nhận moveApplied
   - chạy animation                          - chạy animation
   - cập nhật state                          - cập nhật state
   - lượt → B                                - lượt → B (mình)
                          
7. Chờ B đi...                            7. Đến lượt mình → click...
```

### 4.1. Edge cases PvP

| Tình huống | Xử lý |
|-----------|-------|
| User đóng tab giữa ván | Server giữ phòng 60s, chờ reconnect (cùng socket session) |
| Mất kết nối > 60s | Tự động xử thua, đối thủ thắng |
| Server reject move | Revert UI, hiện toast "Nước đi không hợp lệ" |
| Đối thủ rời phòng trước khi ván bắt đầu | Quay về sảnh, hiện toast |
| Đối thủ rời phòng giữa ván | Đối thủ thua, hiện modal thắng |
| 2 client có state lệch nhau | Server gửi `game:syncState` khi phát hiện hash khác |
| User refresh trang | Reconnect bằng `roomId` lưu trong sessionStorage, server gửi lại state |
| Spam click nhiều nước đi | Server chỉ chấp nhận nếu đúng lượt; client disable input khi chưa nhận xác nhận |

---

## 5. INTERACTION TRÊN BÀN CỜ (chi tiết click)

### 5.1. State machine của tương tác
```
┌──────────┐  click quân mình  ┌──────────────────┐
│   IDLE   │─────────────────→│  PIECE_SELECTED  │
│          │                   │                  │
│          │                   │ - hiện legal dst │
│          │                   │ - quân đang chọn │
│          │                   │   có viền nổi    │
└──────────┘                   └─┬──┬──┬──────────┘
     ↑                           │  │  │
     │                           │  │  └→ click quân khác (mình)
     │                           │  │     → đổi sang quân mới
     │                           │  │     (vẫn PIECE_SELECTED)
     │                           │  │
     │                           │  └→ click quân địch hoặc ô không hợp lệ
     │                           │     → IDLE (bỏ chọn)
     │                           │
     │                           └→ click ô đích hợp lệ
     │     ┌──────────────────────────┐
     │     ↓                          
     │  APPLY MOVE → ANIMATING ──────┐
     │                                │
     └──────── animation done ────────┘
```

### 5.2. Quy ước UX
- **Click quân mình:** chọn (hoặc chọn lại quân khác).
- **Click ô trống không hợp lệ:** bỏ chọn (về IDLE).
- **Click quân địch:** bỏ chọn.
- **Drag-and-drop:** hỗ trợ ở phase polish (không bắt buộc MVP).
- **Hover quân:** hiện preview legal destinations (chỉ desktop).
- **Mobile:** chỉ click, không hover.
- **Khi không phải lượt mình:** tất cả click vào quân mình → toast "Chưa đến lượt".
- **Khi đang animation:** disable mọi input.

---

## 6. ANIMATION & ÂM THANH

| Sự kiện | Animation | Sound |
|---------|-----------|-------|
| Chọn quân | Viền sáng + scale 1.1 | `select.mp3` (nhẹ) |
| Hover legal dst (desktop) | Highlight ô đích pulse | (không) |
| Di chuyển quân | Translate position 250ms ease-out | `move.mp3` |
| Quân bị gánh | Flip 3D 400ms + flash màu | `capture.mp3` |
| Quân bị vây | Pulse + flip + flash đỏ | `surround.mp3` |
| Kết thúc thắng | Pháo hoa CSS, modal slide-up | `win.mp3` |
| Kết thúc thua | Modal fade-in, không pháo hoa | `lose.mp3` |
| Hòa | Modal fade-in | `draw.mp3` |
| Hết giờ (nếu có) | Đếm ngược 5s cuối: pulse đỏ | `tick.mp3` |

> Tất cả âm thanh có thể tắt qua settings. Không tự bật âm thanh khi user mới vào (browser policy).

---

## 7. CÁC MODAL & TOAST

### Modal
- **End game:** thắng/thua/hòa + nút đấu lại/đổi độ khó/về menu
- **Confirm resign:** "Bạn chắc chắn đầu hàng?" Yes/No
- **Confirm leave room:** "Rời phòng sẽ thua, tiếp tục?" Yes/No
- **Settings:** âm thanh, theme, ngôn ngữ
- **How to play:** ảnh + text giải thích luật

### Toast
- "Nước đi không hợp lệ" (server reject)
- "Đối thủ đã rời phòng"
- "Mất kết nối, đang thử lại..."
- "Đã sao chép mã phòng"
- "Đã kết nối lại"

---

## 8. ACCESSIBILITY (A11Y)

- Mỗi quân có `aria-label="Quân đen tại hàng X cột Y"`.
- Mỗi điểm có thể click có `role="button"` + `tabindex="0"`.
- Hỗ trợ điều hướng bàn phím:
  - Arrow keys: di chuyển con trỏ trên bàn cờ
  - Enter/Space: chọn / xác nhận nước đi
  - Escape: bỏ chọn
- Contrast màu: AA tối thiểu (WCAG 2.1).
- Có chế độ "high contrast" trong settings (sau).

---

## 9. RESPONSIVE LAYOUT

### Desktop (≥ 1024px)
```
┌──────────────────────────────────────────┐
│ [Logo]              Menu  Settings  Lang │
├──────────────────────────────────────────┤
│                                           │
│  ┌──────────┐    ┌─────────────────────┐ │
│  │ Player B │    │                     │ │
│  │ 8 quân   │    │                     │ │
│  ├──────────┤    │     BÀN CỜ 5x5      │ │
│  │  TURN ▶  │    │                     │ │
│  │ 0:30     │    │                     │ │
│  ├──────────┤    │                     │ │
│  │ Player W │    └─────────────────────┘ │
│  │ 8 quân   │                            │
│  └──────────┘    [Lịch sử nước đi]      │
│                                           │
└──────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────┐
│ ☰  Logo   ⚙  │
├──────────────┤
│ Player B (8) │
├──────────────┤
│              │
│   BÀN CỜ     │
│   (full      │
│    width)    │
│              │
├──────────────┤
│ Player W (8) │
├──────────────┤
│ ▶ Lượt: B    │
├──────────────┤
│ [Đầu hàng]   │
└──────────────┘
```

---

## 10. CHECKLIST FLOW BẮT BUỘC

- [ ] User mới có thể chơi BOT trong < 5 click từ trang chủ
- [ ] Tạo phòng PvP và share link < 3 thao tác
- [ ] Mọi modal có nút đóng (X) hoặc click outside
- [ ] Mọi action không thể đảo có confirm (đầu hàng, rời phòng giữa ván)
- [ ] Mất mạng có UI thông báo + nút thử lại
- [ ] Ván đầu tiên không yêu cầu đăng ký/đăng nhập
- [ ] Có nút "Hướng dẫn luật" truy cập từ mọi nơi
