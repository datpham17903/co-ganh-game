# Cờ Gánh Online

Web app chơi **Cờ Gánh** — cờ truyền thống Việt Nam — với BOT 3 mức độ, chơi PvP online qua mã phòng, hoặc 2 người cùng máy.

[![Play now](https://img.shields.io/badge/Play-Now-orange)](https://co-ganh-game.vercel.app) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

> Cờ Gánh là trò chơi cờ dân gian Việt Nam, phổ biến ở các vùng nông thôn miền Trung và miền Nam. Đọc thêm trên [Wikipedia](https://vi.wikipedia.org/wiki/C%E1%BB%9D_g%C3%A1nh).

## Cách chơi

### Bàn cờ

- Bàn 5×5 = **25 điểm giao**.
- Mỗi bên có **8 quân**, đặt sẵn ở rìa bàn (hàng đầu + hàng cuối).
- **Đen** đi trước.
- Đường nối: ngang, dọc, và **chéo** chỉ tại những điểm có (hàng + cột) chẵn.

```
   ●─●─●─●─●     ← 8 quân Đen
   │ ╲│╱ │ ╲│╱ │
   ●─┼─●─┼─●     (chéo chỉ ở điểm có (r+c) chẵn)
   │ ╱│╲ │ ╱│╲ │
   ○─┼─○─┼─○
   │ ╲│╱ │ ╲│╱ │
   ○─○─○─○─○     ← 8 quân Trắng
```

### Di chuyển

Mỗi lượt, bạn di chuyển **1 quân** sang một điểm trống **kề** theo đường nối. Không nhảy, không bay xa.

### Gánh (sandwich capture)

Khi quân vừa đi của bạn nằm **giữa** 2 quân đối phương trên cùng 1 đường thẳng (ngang / dọc / chéo nếu có) → 2 quân đối phương đó **đổi sang màu của bạn**.

Quan trọng: **không phản ứng dây chuyền** — chỉ tính lúc quân vừa di chuyển vào vị trí, không lan tiếp.

### Vây (chẹt)

Sau khi xử lý gánh, nếu **một nhóm liên thông** quân đối phương không còn nước đi nào hợp lệ (mọi điểm kề đều đã có quân) → **cả nhóm đổi màu** sang màu bạn.

### Kết thúc ván

- Một bên còn **0 quân** → bên đó **thua**.
- Bên đang đi **không còn nước hợp lệ** → **hòa**.
- Cùng thế cờ lặp lại **3 lần** → hòa.
- **50 nước liên tiếp** không có gánh / vây → hòa.

## Chế độ chơi

### Chơi với BOT

3 mức độ:

- **Dễ** — đi gần như ngẫu nhiên, ưu tiên gánh nếu có (300ms suy nghĩ).
- **Trung bình** — minimax depth 3, có heuristic vật chất + di động (500ms).
- **Khó** — minimax depth 4-5 với alpha-beta + iterative deepening (1.5s).

Bot chạy trong Web Worker, không block UI.

### Chơi PvP online

- Tạo phòng → nhận **mã 6 ký tự** → share cho bạn để vào.
- Phòng **public** hiện trong sảnh, ai cũng vào được; có thể đặt **mật khẩu**.
- **Đồng hồ** 10 phút mỗi bên, mất kết nối có **60 giây reconnect**.
- **Spectator**: phòng public cho phép xem trận, có **chat** trong phòng.
- **Forfeit** để bỏ cuộc giữa trận, đối thủ thắng.

### Chơi 2 người

Cùng máy tính, luân phiên Đen / Trắng — không cần đăng nhập, không cần internet.

## Thử nhanh

🎮 [**Chơi online ngay tại co-ganh-game.vercel.app**](https://co-ganh-game.vercel.app)

Hoặc chạy local:

```bash
pnpm install
pnpm dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Zustand + Framer Motion
- **Backend:** Node 20 + Express + Socket.IO + pino
- **Engine + Bot:** TypeScript pure (chia sẻ qua monorepo pnpm)
- **Test:** Vitest unit/integration + Playwright E2E

## Cấu trúc

```
co-ganh/
├── apps/
│   ├── web/           Frontend Vite + React
│   └── server/        Backend Express + Socket.IO
├── packages/
│   ├── engine/        Logic luật cờ gánh
│   └── bot/           AI 3 cấp độ
├── docs/              Tài liệu thiết kế chi tiết
└── README.md
```

## Scripts

```bash
pnpm dev               # Chạy cả frontend + backend
pnpm test              # Unit + integration tests
pnpm typecheck         # TypeScript check toàn workspace
pnpm lint              # ESLint
pnpm build             # Production build

# E2E
cd apps/web
pnpm exec playwright install chromium
pnpm e2e
```

## Deploy

Stack: **Vercel** (frontend) + **Render** (backend Socket.IO).

Repo có sẵn `render.yaml` blueprint + `vercel.json` config monorepo.

1. Backend trên Render: New → Blueprint → connect repo. Lấy URL như `https://co-ganh-server.onrender.com`.
2. Frontend trên Vercel: import repo → set env `VITE_SERVER_URL` thành URL Render → deploy.
3. Siết CORS: Render → service → env `CORS_ORIGIN` = URL Vercel.

Local override:

```
# apps/web/.env.local
VITE_SERVER_URL=http://localhost:3001
```

**Bot-only mode** (không cần backend): set `VITE_BOT_ONLY=true` khi build — nút "Chơi Online" sẽ ẩn.

## Tài liệu thiết kế

Chi tiết kiến trúc + luật + giao thức trong [`docs/`](docs):

- [docs/PLAN.md](docs/PLAN.md) — Scope, roadmap 6 phase
- [docs/RULES.md](docs/RULES.md) — Luật cờ gánh chi tiết kèm ví dụ
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Kiến trúc kỹ thuật
- [docs/BOT.md](docs/BOT.md) — Thiết kế AI minimax + heuristic
- [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) — Giao thức Socket.IO
- [docs/FLOW.md](docs/FLOW.md) — User flow + game flow
- [docs/TESTING.md](docs/TESTING.md) — Test plan
- [docs/BUGFIX.md](docs/BUGFIX.md) — Sổ ghi bug + quyết định kỹ thuật

## License

MIT
