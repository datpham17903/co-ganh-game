# CỜ GÁNH ONLINE - PLAN INDEX

> Bộ tài liệu kế hoạch đầy đủ cho dự án website chơi **Cờ Gánh** (cờ truyền thống Việt Nam) với BOT 3 độ khó và chế độ chơi online giữa người với người.

---

## 1. ĐỌC TÀI LIỆU NÀO TRƯỚC?

### Người mới đọc lần đầu
1. **[PLAN.md](PLAN.md)** — Bức tranh toàn cảnh dự án (10 phút)
2. **[RULES.md](RULES.md)** — Luật cờ gánh chi tiết (10 phút)
3. **[FLOW.md](FLOW.md)** — User flow + game flow (10 phút)
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** — Kiến trúc kỹ thuật (15 phút)

### Subagent trước khi vào việc
| Vai trò | Bắt buộc đọc | Tham khảo |
|---------|--------------|-----------|
| Engine | RULES.md, ARCHITECTURE.md, TESTING.md (mục 2) | PLAN.md |
| Bot | RULES.md, BOT.md, ARCHITECTURE.md, TESTING.md (mục 3) | PLAN.md |
| UI Board | UI_UX.md, FLOW.md, ARCHITECTURE.md (mục 7) | RULES.md (luật để hiểu state) |
| UI Shell | UI_UX.md, FLOW.md | PLAN.md |
| MP Server | MULTIPLAYER.md, RULES.md, ARCHITECTURE.md | TESTING.md (mục 5) |
| MP Client | MULTIPLAYER.md, FLOW.md (mục 4), ARCHITECTURE.md | UI_UX.md |
| Polish | UI_UX.md, FLOW.md (mục 6) | mọi file đã có |
| QA | TESTING.md, BUGFIX.md | mọi file |

### Main agent điều phối
- **[TASKS.md](TASKS.md)** — Phân chia subagent + dependency graph
- **[BUGFIX.md](BUGFIX.md)** — Theo dõi bug

---

## 2. DANH SÁCH FILE

| File | Mô tả ngắn | Đối tượng |
|------|-----------|-----------|
| [PLAN.md](PLAN.md) | Scope, tech stack, roadmap 6 phase | Mọi người |
| [RULES.md](RULES.md) | Luật cờ gánh + test case bắt buộc | Engine, bot |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc thư mục, data flow, API | Mọi dev |
| [FLOW.md](FLOW.md) | User flow, game flow, edge case | UI, UX |
| [BOT.md](BOT.md) | AI 3 độ khó, eval, minimax, alpha-beta | Bot agent |
| [MULTIPLAYER.md](MULTIPLAYER.md) | Socket.IO protocol, room, reconnect | Server, client |
| [UI_UX.md](UI_UX.md) | Design tokens, layout, dùng Stitch MCP | UI agents |
| [TASKS.md](TASKS.md) | Task breakdown cho 9 subagents | Main agent |
| [TESTING.md](TESTING.md) | Test plan + dùng Browser MCP | QA, mọi agent |
| [BUGFIX.md](BUGFIX.md) | Quy trình + sổ ghi bug | Mọi agent |

---

## 3. TÓM TẮT 1 PHÚT

- **Sản phẩm:** Web app chơi Cờ Gánh (5×5, 8 quân mỗi bên), 3 chế độ: vs Bot / Online / Local 2 người.
- **Stack:** React + TypeScript + Vite + Tailwind, Node + Socket.IO, monorepo pnpm.
- **Lộ trình:** 6 phase (Setup → Engine → UI → Bot → Multiplayer → Polish → QA).
- **AI:** Easy (random + tránh tự sát), Medium (minimax depth 3), Hard (iterative deepening + alpha-beta + transposition).
- **Online:** Server-authoritative, room-based, reconnect 60s, hash sync.
- **MCP:** Stitch cho mockup UI ban đầu, Browser cho E2E test cuối.

---

## 4. CÀI ĐẶT MCP

### 4.1. Stitch MCP (sinh mockup UI)
Stitch là MCP server của Google sinh mockup từ prompt text.

**Cách thêm vào Claude Code:**
```bash
# Thêm vào ~/.claude/mcp.json hoặc qua slash command
claude mcp add stitch
```
Hoặc cài thủ công:
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "@google/stitch-mcp"]
    }
  }
}
```

> Lưu ý: package name có thể thay đổi, kiểm tra https://stitch.withgoogle.com để có hướng dẫn mới nhất.

**Cách dùng trong Phase 2:**
1. UI Shell agent gửi 4 prompt trong [UI_UX.md mục 5.3](UI_UX.md#5-dùng-stitch-mcp-sinh-mockup)
2. Lưu kết quả vào `docs/mockups/`
3. Subagent UI tham khảo khi code, KHÔNG copy y nguyên

### 4.2. Browser MCP (E2E test)
Browser MCP cho phép điều khiển Chrome thật từ session.

**Cách thêm:**
```bash
claude mcp add browser
```
Hoặc:
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@browsermcp/mcp"]
    }
  }
}
```

Sau khi cài, kiểm tra bằng cách hỏi Claude `list mcp tools` — phải thấy `browser_navigate`, `browser_click`, `browser_screenshot`, ...

**Cách dùng trong Phase 6:** xem [TESTING.md mục 6](TESTING.md#6-e2e-test-với-browser-mcp).

---

## 5. CÁCH KHỞI CHẠY DỰ ÁN (sau khi code xong)

```bash
# Cài đặt
pnpm install

# Dev (chạy cả frontend + backend)
pnpm dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Test
pnpm test          # unit + integration
pnpm e2e           # E2E với Playwright
pnpm bot:bench     # benchmark bot

# Build production
pnpm build

# Type check + lint
pnpm typecheck
pnpm lint
```

---

## 6. DEFINITION OF DONE (CHO TOÀN DỰ ÁN)

Dự án xem như HOÀN THÀNH khi:
- [ ] Toàn bộ test pass: unit + integration + E2E
- [ ] Bot benchmark đạt ngưỡng (BOT.md mục 7.2)
- [ ] Lighthouse: Performance ≥ 90, A11y ≥ 95
- [ ] Manual test 1 ván vs Hard, 1 ván PvP với người thật
- [ ] Chạy tốt trên Chrome, Firefox, Safari + iOS Safari + Android Chrome
- [ ] Deploy thành công trên production
- [ ] Không có bug Critical hoặc High mở
- [ ] README production có hướng dẫn đầy đủ

---

## 7. WORKFLOW LÀM VIỆC VỚI SUBAGENTS

### Main agent điều phối
```
1. Đọc TASKS.md để biết phase tiếp theo
2. Spawn subagent với prompt:
   - "Đọc README.md, PLAN.md, [các file của task] trước"
   - "Task của bạn: [chi tiết từ TASKS.md]"
   - "Definition of Done: [từ TASKS.md]"
3. Đợi subagent xong
4. Verify:
   - Đọc code subagent viết
   - Chạy test
   - Browser MCP verify nếu có UI
5. Cập nhật trạng thái trong TASKS.md
6. Trigger phase/task tiếp theo
```

### Subagent trả về
- Code đã commit (hoặc trên branch)
- Test pass output
- Screenshot nếu có UI
- Bug phát hiện ghi vào BUGFIX.md
- Tóm tắt 200 từ về việc đã làm

---

## 8. NHỮNG QUYẾT ĐỊNH ĐÃ CHỐT

(Các điểm dễ gây tranh cãi, đã quyết để tránh hỏi lại)

| # | Vấn đề | Quyết định | File ref |
|---|--------|-----------|----------|
| 1 | Số quân mỗi bên | 8 | RULES.md 1.3 |
| 2 | Layout đầu ván | Đen ở hàng 0+1 (5+2), trắng ở hàng 3+4 | RULES.md 1.3 |
| 3 | Đường chéo tại điểm nào | Điểm có `(r+c)` chẵn | RULES.md 1.2 |
| 4 | Đen hay trắng đi trước | Đen | RULES.md 2 |
| 5 | Gánh có phản ứng dây chuyền? | KHÔNG | RULES.md 3.2 |
| 6 | Có ép gánh (luật mở)? | KHÔNG | RULES.md 5 |
| 7 | Hòa khi nào | Lặp 3 lần / 50 nước không tiến / hết nước | RULES.md 6.2 |
| 8 | Bot có dùng Web Worker? | CÓ, bắt buộc | BOT.md 6 |
| 9 | PvP server-authoritative? | CÓ | MULTIPLAYER.md 3 |
| 10 | Reconnect TTL | 60 giây | MULTIPLAYER.md 4.3 |
| 11 | Render bàn cờ | SVG, không Canvas | ARCHITECTURE.md 7.1 |
| 12 | Tài khoản user MVP? | KHÔNG | PLAN.md 1 |

---

## 9. ROADMAP MỞ RỘNG (POST-MVP)

Đã ghi nhận để không quên, không làm trong MVP:
- Tài khoản người dùng + leaderboard
- Replay ván đấu (lưu IndexedDB rồi PostgreSQL)
- Spectator mode
- Chat trong phòng
- Đa ngôn ngữ (i18n VI/EN)
- Đa nền tảng (PWA → app native)
- Adaptive bot difficulty
- Opening book cho bot Hard
- Neural net evaluator (train trên self-play)
- Giải đấu / matchmaking ngẫu nhiên

---

## 10. LIÊN HỆ + TÀI LIỆU NGOÀI

- **Luật cờ gánh:** https://vi.wikipedia.org/wiki/C%E1%BB%9D_g%C3%A1nh
- **Stitch MCP:** https://stitch.withgoogle.com
- **Browser MCP:** https://browsermcp.io / https://github.com/browsermcp/mcp
- **shadcn/ui:** https://ui.shadcn.com
- **Framer Motion:** https://www.framer.com/motion
- **Socket.IO:** https://socket.io/docs/v4

---

> **Lưu ý cuối:** Bộ tài liệu này là **chuẩn chỉ cho subagent**. Nếu cần thay đổi, **cập nhật file tương ứng trước**, sau đó mới code. Tránh tình trạng code chạy nhưng không khớp tài liệu.
