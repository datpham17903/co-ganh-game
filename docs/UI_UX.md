# UI/UX DESIGN

> Thiết kế giao diện, design system, và cách dùng **Stitch MCP** để sinh mockup ban đầu.

---

## 1. NGUYÊN TẮC THIẾT KẾ

1. **Bàn cờ là trung tâm:** mọi thứ khác hỗ trợ bàn cờ.
2. **Không dạy trong UI:** dùng tooltip + trang hướng dẫn riêng. UI chính sạch sẽ.
3. **Phản hồi tức thì:** mọi click có hiệu ứng visual + audio.
4. **Mobile-first:** thiết kế cho 375px trước, scale lên desktop.
5. **Tôn vinh truyền thống:** màu sắc + kiểu chữ gợi cờ tướng/cờ Việt cổ.

---

## 2. BRAND & DESIGN TOKENS

### 2.1. Bảng màu

```scss
// Light mode
--bg-primary: #f5e6c8; // nâu nhạt giấy cũ
--bg-board: #d9b074; // gỗ vàng
--bg-board-line: #6b3f1d; // nâu đậm đường kẻ
--piece-black: #1a1a1a; // đen
--piece-black-edge: #444;
--piece-white: #faf7ee; // ngà
--piece-white-edge: #999;
--accent: #c0392b; // đỏ son (highlight, win)
--accent-2: #2e7d32; // xanh lá (legal move)
--text-primary: #2c1810;
--text-muted: #6b5444;
--surface: #fff8e7;
--shadow: rgba(50, 30, 10, 0.18);

// Dark mode
--bg-primary: #1a1410;
--bg-board: #4a3621;
--bg-board-line: #8b6f47;
--piece-white: #f0e6c8;
--text-primary: #f5e6c8;
--text-muted: #a89070;
--surface: #2a1f18;
```

### 2.2. Typography

```css
--font-display: 'Be Vietnam Pro', 'SF Pro', sans-serif; /* tiêu đề */
--font-body: 'Inter', system-ui, sans-serif;
--font-num: 'JetBrains Mono', monospace; /* mã phòng, đếm */

--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 24px;
--text-2xl: 32px;
--text-3xl: 48px; /* hero */
```

### 2.3. Spacing & radius

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;

--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-full: 9999px;
```

### 2.4. Animation

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--dur-fast: 150ms;
--dur-normal: 250ms;
--dur-slow: 400ms;
```

---

## 3. SCREEN LAYOUTS

### 3.1. Trang chủ (`/`)

```
┌─────────────────────────────────────────────────────┐
│ [Logo Cờ Gánh]                       [⚙][VI/EN]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│           CỜ GÁNH                                   │
│           Cờ truyền thống Việt Nam                  │
│                                                     │
│       ┌──────────────────────────┐                  │
│       │  ▶  CHƠI VỚI BOT          │                 │
│       └──────────────────────────┘                  │
│       ┌──────────────────────────┐                  │
│       │  ◎  CHƠI ONLINE           │                 │
│       └──────────────────────────┘                  │
│       ┌──────────────────────────┐                  │
│       │  ⚎  CHƠI 2 NGƯỜI          │                 │
│       └──────────────────────────┘                  │
│                                                     │
│       [📖 Hướng dẫn luật chơi]                      │
│                                                     │
│   *Bàn cờ minh họa nền (mờ, scroll lên) *           │
└─────────────────────────────────────────────────────┘
```

### 3.2. Chọn độ khó BOT (modal)

```
┌─────────────────────────────────┐
│   CHƠI VỚI BOT             [×]  │
├─────────────────────────────────┤
│                                 │
│   Độ khó                        │
│   ┌─────┐ ┌─────┐ ┌─────┐      │
│   │ Dễ  │ │TBình│ │ Khó │      │
│   └─────┘ └─────┘ └─────┘      │
│                                 │
│   Màu quân                      │
│   ┌─────────┐ ┌─────────┐      │
│   │ ● Đen   │ │ ○ Trắng │      │
│   │  (trước)│ │         │      │
│   └─────────┘ └─────────┘      │
│                                 │
│   [   BẮT ĐẦU   ]               │
└─────────────────────────────────┘
```

### 3.3. Sảnh PvP (`/play/pvp`)

```
┌────────────────────────────────────────────┐
│ ← Quay lại            CHƠI ONLINE          │
├────────────────────────────────────────────┤
│                                            │
│   Tên hiển thị                             │
│   ┌────────────────────────────────────┐   │
│   │ Người chơi                          │   │
│   └────────────────────────────────────┘   │
│                                            │
│   ┌────────────────────────────────────┐   │
│   │  ➕ TẠO PHÒNG MỚI                   │   │
│   └────────────────────────────────────┘   │
│                                            │
│   ─────────── HOẶC ───────────             │
│                                            │
│   Mã phòng                                 │
│   ┌──────────────┐  ┌────────┐            │
│   │  ABC123      │  │ VÀO    │            │
│   └──────────────┘  └────────┘            │
│                                            │
└────────────────────────────────────────────┘
```

### 3.4. Trang chơi cờ (`/play/bot` hoặc `/play/pvp/:id`)

#### Desktop (≥1024px)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Menu                  CỜ GÁNH                  [⚙][🔊]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐    ┌─────────────────────────────────┐   │
│  │ 🤖 Bot Khó     │    │                                 │   │
│  │ ● 8 quân       │    │                                 │   │
│  │   ┌────────┐   │    │                                 │   │
│  │   │00:32   │   │    │                                 │   │
│  │   └────────┘   │    │       BÀN CỜ 5×5                │   │
│  │ ◀ ĐANG NGHĨ.. │    │                                 │   │
│  ├────────────────┤    │                                 │   │
│  │ ● Bạn          │    │                                 │   │
│  │ ○ 8 quân       │    │                                 │   │
│  │   ┌────────┐   │    │                                 │   │
│  │   │05:12   │   │    │                                 │   │
│  │   └────────┘   │    │                                 │   │
│  └────────────────┘    └─────────────────────────────────┘   │
│                                                               │
│  ┌────────────────┐    ┌─────────────────────────────────┐   │
│  │ Lịch sử        │    │ [Đầu hàng]    [Đấu lại]         │   │
│  │ 1. B: a1→b2    │    └─────────────────────────────────┘   │
│  │ 2. W: e5→d4    │                                          │
│  │ 3. B: b2→c3    │                                          │
│  │    (gánh ×2)   │                                          │
│  │ ...            │                                          │
│  └────────────────┘                                          │
└───────────────────────────────────────────────────────────────┘
```

#### Mobile

```
┌──────────────────────┐
│ ←   Cờ Gánh    ⚙ 🔊 │
├──────────────────────┤
│ 🤖 Bot Khó    ● 8   │
│ Đang nghĩ...   00:32│
├──────────────────────┤
│                      │
│                      │
│      BÀN CỜ          │
│      (full)          │
│                      │
│                      │
├──────────────────────┤
│ ● Bạn         ○ 8   │
│ Lượt của bạn  05:12 │
├──────────────────────┤
│ [Đầu hàng] [≡ Sử]   │
└──────────────────────┘
```

### 3.5. Modal kết thúc ván

```
┌─────────────────────────────────┐
│           🏆                     │
│        BẠN THẮNG!                │
│                                  │
│  Lý do: gánh hết quân đối thủ   │
│  Thời gian: 5 phút 32 giây      │
│  Số nước đi: 23                 │
│                                  │
│  [Đấu lại]   [Đổi độ khó]       │
│  [Về menu]                      │
└─────────────────────────────────┘
```

---

## 4. COMPONENTS

### 4.1. Bàn cờ (`<Board />`)

- SVG `viewBox="0 0 500 500"`, responsive 100% width.
- Padding 40px mỗi cạnh → bàn cờ thực tế 420×420px.
- Đường kẻ: `stroke-width: 2px`, màu `--bg-board-line`.
- Đường chéo chỉ kẻ tại các điểm có (xem RULES.md mục 1.2).
- Background: gradient gỗ + texture noise nhẹ.

### 4.2. Quân cờ (`<Piece />`)

- `<circle r="22">` với gradient + shadow.
- Quân đen: gradient `#2C2C2C → #0A0A0A`, viền `#000`.
- Quân trắng: gradient `#FAF7EE → #D9CFB8`, viền `#888`.
- Animation di chuyển: dùng Framer Motion `layoutId={pieceId}`.
- Animation gánh: flip 3D quanh trục Y, đổi màu giữa flip.

### 4.3. Highlight nước hợp lệ

- `<circle r="8">` màu `--accent-2` opacity 0.6, pulse animation.
- Nếu nước đó có gánh → vẽ thêm vòng `<circle r="14">` viền đỏ pulse.

### 4.4. Player card

```jsx
<div className="player-card">
  <Avatar />
  <Name />
  <PieceCount color="B" count={8} />
  <Timer />
  <TurnIndicator active={isTurn} />
</div>
```

- Active turn: viền đèn pulse `--accent`
- Bot đang nghĩ: spinner + text "Đang nghĩ..."

### 4.5. Move history

- List scroll, item: `số. Quân: from→to (gánh ×N) (vây ×M)`
- Click item → highlight nước đó trên bàn (chỉ sau ván)
- Toggle thu gọn / mở rộng trên mobile

### 4.6. Toast / Notification

- Vị trí: top-center desktop, top-full mobile.
- 4 loại: info, success, warning, error.
- Auto-dismiss 3 giây.

---

## 5. DÙNG STITCH MCP SINH MOCKUP

### 5.1. Stitch MCP là gì

Stitch là MCP server của Google sinh mockup UI từ prompt text. Dùng để có wireframe nhanh ở Phase 2 trước khi code thật.

### 5.2. Quy trình

1. Cài đặt Stitch MCP server (xem README.md mục cài đặt MCP).
2. Mở session chat với MCP.
3. Gửi prompt theo format dưới.
4. Lưu output (URL hình hoặc Figma file) vào `docs/mockups/`.
5. Subagent UI dùng làm tham khảo, KHÔNG copy y nguyên.

### 5.3. Prompts mẫu cho Stitch MCP

#### Mockup trang chủ

```
Create a homepage mockup for a Vietnamese traditional board game called "Cờ Gánh".
Style: warm, traditional, paper texture background, brown and cream colors.
Layout: centered hero with game title in elegant Vietnamese font,
3 large CTA buttons stacked vertically (Play Bot, Play Online, Play Local),
small "How to play" link below.
Top right: settings icon and language toggle.
Mobile-first, also show desktop variant.
Show a faded board diagram in the background.
```

#### Mockup trang chơi

```
Create a gameplay screen mockup for "Cờ Gánh" — a Vietnamese chess variant.
Center: 5x5 grid board with diagonal lines at certain points, 16 round pieces
(8 black, 8 ivory) placed at intersection points.
Left sidebar (desktop): two player cards (opponent on top, player on bottom),
each with avatar, name, piece count, timer, turn indicator with glowing effect.
Below board: move history list and action buttons (Resign, Rematch).
Color palette: warm browns, cream, paper texture, accent red for highlights.
Show both desktop and mobile layouts.
```

#### Mockup modal kết thúc

```
Create a game-over modal mockup for "Cờ Gánh".
Centered card with: trophy icon, big "You Win!" text in Vietnamese ("Bạn Thắng!"),
reason of win, time and move count stats, 3 buttons: Rematch, Change Difficulty,
Back to Menu. Confetti subtle animation around the card.
Background dimmed.
```

#### Mockup hướng dẫn luật

```
Create an illustrated guide page for the rules of "Cờ Gánh".
Include 4 sections: Bàn cờ (board), Di chuyển (moves), Gánh (capture by sandwich),
Vây (capture by surrounding). Each section has a small board diagram showing
the rule, with arrows and highlights. Vietnamese text. Print-style illustration,
warm tones.
```

### 5.4. Cách subagent UI dùng output

- Lưu hình mockup vào `docs/mockups/<screen>.png`.
- Khi code component, mở mockup tham khảo bố cục, spacing, hierarchy.
- KHÔNG generate HTML từ ảnh tự động — code tay với shadcn/ui + Tailwind để giữ nhất quán.
- Nếu mockup khác design tokens (mục 2) → ưu tiên design tokens.

---

## 6. ASSETS CẦN CHUẨN BỊ

### 6.1. Hình ảnh

- `logo.svg` (logo Cờ Gánh)
- `texture-paper.png` (background nhẹ)
- `texture-wood.jpg` (bàn cờ, nén WebP)
- `og-image.png` (1200×630, social share)
- `favicon.ico` + `favicon.svg`

### 6.2. Âm thanh (`/public/sounds/`)

- `select.mp3` (~80ms, click nhẹ)
- `move.mp3` (~150ms, đặt quân gỗ)
- `capture.mp3` (~300ms, gánh)
- `surround.mp3` (~400ms, vây)
- `win.mp3` (~1.5s, fanfare)
- `lose.mp3` (~1.5s)
- `draw.mp3` (~1s)

Tất cả audio < 100KB. Có thể dùng nguồn miễn phí (freesound.org, zapsplat).

### 6.3. Fonts

- Be Vietnam Pro (Google Fonts) — display
- Inter (Google Fonts) — body
- JetBrains Mono (Google Fonts) — mono

Self-host trong `/public/fonts/` để tránh CLS.

---

## 7. ACCESSIBILITY

| Yêu cầu             | Cài đặt                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| Contrast ≥ 4.5:1    | Test bằng axe DevTools                                                              |
| Keyboard navigation | Arrow + Enter + Esc                                                                 |
| Screen reader       | aria-label cho mọi piece + cell                                                     |
| Reduced motion      | `@media (prefers-reduced-motion)` tắt animation                                     |
| Color blind         | Quân không chỉ phân biệt bằng màu — dùng pattern (chấm/gạch) ở mode "high contrast" |
| Focus visible       | Outline đậm khi tab                                                                 |
| Skip links          | "Skip to board" cho keyboard user                                                   |

---

## 8. RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
.container {
  /* base 375px */
}

@media (min-width: 640px) {
  /* sm — landscape phone */
}
@media (min-width: 768px) {
  /* md — tablet */
}
@media (min-width: 1024px) {
  /* lg — desktop */
}
@media (min-width: 1280px) {
  /* xl — large desktop */
}
```

### Bàn cờ ở các size

| Viewport | Board size                     |
| -------- | ------------------------------ |
| 375px    | 320×320 (full width − padding) |
| 768px    | 480×480                        |
| 1024px   | 500×500 cố định                |

---

## 9. CHECKLIST UI/UX

- [ ] Mọi screen có version mobile + desktop
- [ ] Mọi action có loading state nếu > 200ms
- [ ] Mọi error có message thân thiện (không hiện code error)
- [ ] Không có "click region" < 44×44px (mobile-friendly)
- [ ] Test với người không biết luật — họ tự chơi được sau xem hướng dẫn 1 lần
- [ ] Test trên iPhone SE (375px) và iPad
- [ ] Test với screen reader (VoiceOver/NVDA)
- [ ] Test keyboard-only navigation
- [ ] Test reduced motion mode
- [ ] Lighthouse: Performance > 90, A11y > 95
