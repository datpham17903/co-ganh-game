# Cờ Gánh Online

Web app chơi **Cờ Gánh** (cờ truyền thống Việt Nam) với BOT 3 mức độ và chơi PvP online.

![status](https://img.shields.io/badge/status-MVP-green) ![tests](https://img.shields.io/badge/tests-167-blue)

## Tính năng

- Bàn cờ 5×5, 8 quân/bên, đúng luật cờ gánh truyền thống (gánh, vây, mở)
- **Chơi với BOT** 3 mức độ: Dễ / Trung bình / Khó (Web Worker)
- **Chơi PvP online** qua mã phòng 6 ký tự, server-authoritative
- **Chơi 2 người cùng máy** (local)
- Lịch sử nước đi, animation Framer Motion, âm thanh tổng hợp
- Reconnect 60s khi mất kết nối
- Responsive desktop + mobile, hỗ trợ keyboard nav, prefers-reduced-motion

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Zustand + Framer Motion + Socket.IO client
- **Backend:** Node 20 + Express + Socket.IO + pino
- **Engine + Bot:** TypeScript pure, dùng chung qua monorepo pnpm
- **Test:** Vitest (167 unit/integration tests) + Playwright (E2E)

## Cấu trúc

```
co-ganh/
├── apps/
│   ├── web/      Frontend Vite + React
│   └── server/   Backend Express + Socket.IO
├── packages/
│   ├── engine/   Logic luật cờ gánh
│   └── bot/      AI 3 cấp độ
└── docs/         Tài liệu thiết kế (PLAN, RULES, ARCHITECTURE, ...)
```

## Cài đặt local

```bash
pnpm install
pnpm dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001
```

## Scripts

```bash
pnpm dev              # chạy cả frontend + backend
pnpm test             # unit + integration test (Vitest)
pnpm typecheck        # TS check toàn bộ workspace
pnpm lint             # ESLint
pnpm build            # production build
pnpm bot:bench        # self-play benchmark cho bot
```

E2E (Playwright):

```bash
cd apps/web
pnpm exec playwright install chromium
pnpm e2e
```

## Deploy

- **Frontend:** Vercel/Netlify (static build từ `apps/web/dist`)
- **Backend:** Railway/Render/Fly.io (cần WebSocket, Vercel free tier không hỗ trợ)
- **Env:**
  - Frontend: `VITE_SERVER_URL=https://your-backend.example.com`
  - Backend: `PORT=3001`, `CORS_ORIGIN=https://your-frontend.example.com`

## Tài liệu thiết kế

- [PLAN.md](PLAN.md) - Scope, roadmap 6 phase
- [RULES.md](RULES.md) - Luật cờ gánh chi tiết
- [ARCHITECTURE.md](ARCHITECTURE.md) - Kiến trúc kỹ thuật
- [BOT.md](BOT.md) - Thiết kế AI
- [MULTIPLAYER.md](MULTIPLAYER.md) - Giao thức Socket.IO
- [TESTING.md](TESTING.md) - Test plan
- [BUGFIX.md](BUGFIX.md) - Sổ ghi bug + decisions

## License

MIT
