# QUY TRÌNH THEO DÕI & FIX BUG

> File này là sổ ghi chép bug sống. Mọi subagent phát hiện hoặc gặp bug đều ghi vào đây. Main agent review và phân loại.

---

## 1. QUY TRÌNH

```
┌─────────────────┐
│ Phát hiện bug   │ (test fail, manual test, user report)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Ghi vào "INBOX" │ (mục 4 dưới đây)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Phân loại       │ (severity + assign agent)
│ → "TRIAGED"     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Đang fix        │
│ → "IN PROGRESS" │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Test fix        │
│ → "FIXED"       │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Verify (browser)│
│ → "VERIFIED"    │
└─────────────────┘
```

---

## 2. SEVERITY (Mức độ nghiêm trọng)

| Mức | Định nghĩa | Ví dụ | Hạn fix |
|-----|------------|-------|---------|
| **Critical** | Block không chơi được, mất dữ liệu, security | App trắng màn hình, server crash, lộ token | Ngay |
| **High** | Tính năng chính sai, ảnh hưởng đa số user | Bot đi nước không hợp lệ, gánh không đổi màu, PvP không sync | Trong phase |
| **Medium** | Tính năng phụ sai hoặc UX khó chịu | Animation giật, sound không phát, modal lệch | Phase tiếp |
| **Low** | Cosmetic, edge case hiếm | Spacing sai 2px, typo, contrast hơi thấp | Backlog |

---

## 3. TEMPLATE BUG

Khi log bug, dùng format:
```markdown
### [SEVERITY] BUG-XXX: Tóm tắt ngắn

**Phase:** Px
**Module:** engine / bot / ui-board / ui-shell / mp-server / mp-client / polish / qa
**Phát hiện bởi:** <agent name> qua <test name | manual | user>
**Ngày:** YYYY-MM-DD

**Mô tả:**
Mô tả ngắn bug là gì.

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected:** ...
**Actual:** ...

**Logs / Screenshots:**
```
<paste log hoặc link screenshot>
```

**Root cause (sau điều tra):** ...
**Fix:** PR #X, commit abc123
**Status:** INBOX | TRIAGED | IN PROGRESS | FIXED | VERIFIED | WONTFIX
**Assigned:** <agent>
```

---

## 4. CÁC BUG THƯỜNG GẶP - CHECKLIST PHÒNG NGỪA

Trước khi merge mỗi phase, kiểm tra checklist này để tránh bug đã biết:

### 4.1. Engine
- [ ] Đường chéo có đúng tại các điểm có chéo không? (RULES.md 1.2)
- [ ] Gánh có check đường nối hình học giữa A-M-B?
- [ ] Vây áp dụng SAU gánh, không phản ứng dây chuyền?
- [ ] `applyMove` thật sự immutable? (test deep equal)
- [ ] `hashState` deterministic? (cùng state → cùng hash)
- [ ] `noProgressCount` reset khi có gánh/vây?

### 4.2. Bot
- [ ] Bot không bao giờ trả nước không hợp lệ?
- [ ] PRNG dùng seed, không dùng `Math.random()` trực tiếp?
- [ ] Bot không mutate state?
- [ ] Web Worker không leak memory (terminate đúng cách)?
- [ ] Hard không vượt quá `maxThinkMs`?

### 4.3. UI
- [ ] Click rapid 2 quân khác nhau có gây race condition?
- [ ] Animation đang chạy có disable input không?
- [ ] Modal có thể đóng bằng Escape?
- [ ] Mobile: touch event hoạt động (không chỉ click)?
- [ ] Reduced motion có tắt animation không?

### 4.4. Multiplayer
- [ ] Server reject mọi nước không hợp lệ?
- [ ] Hash state khớp giữa server và 2 client sau mỗi nước?
- [ ] Reconnect đúng player (không nhầm với người khác)?
- [ ] Cleanup phòng expired thực sự xóa không leak Map?
- [ ] Rate limit bị khi spam không crash server?

---

## 5. KHU VỰC RỦI RO CAO (đã biết)

### 5.1. Đường chéo bàn cờ
- **Rủi ro:** dễ implement sai, khiến gánh chéo không đúng.
- **Cách phòng:** test `adjacency.test.ts` ≥ 8 case bao trùm các loại điểm.

### 5.2. Phản ứng dây chuyền gánh
- **Rủi ro:** dễ vô tình code thành dây chuyền (gánh xong xét lại).
- **Cách phòng:** test `không-phản-ứng-dây-chuyền` rõ ràng. Code: chỉ duyệt 1 lần qua các đường nối từ M.

### 5.3. State sync lệch trong PvP
- **Rủi ro:** client A và B có state khác nhau sau 1 nước.
- **Cách phòng:** so sánh `hashState` sau mỗi `moveApplied`. Nếu lệch → request `syncState`.

### 5.4. Bot freeze UI
- **Rủi ro:** bot hard chạy main thread → UI lag.
- **Cách phòng:** **bắt buộc** Web Worker. Kiểm tra: chạy bot, kéo bàn cờ — không lag.

### 5.5. Bộ nhớ tăng dần
- **Rủi ro:** Move history không giới hạn, transposition table không evict, Web Worker không terminate.
- **Cách phòng:** `moveHistory` cap ở 200 entry; TT clear sau mỗi ván; worker terminate khi rời trang.

### 5.6. Mã phòng trùng
- **Rủi ro:** sinh trùng → 2 phòng cùng ID → join sai.
- **Cách phòng:** check Map `has(id)` trước khi assign, retry 3 lần.

### 5.7. Browser policy âm thanh
- **Rủi ro:** `Audio.play()` bị block trước khi user interact.
- **Cách phòng:** chỉ play sau click đầu tiên. Lazy preload.

### 5.8. Click khi animation đang chạy
- **Rủi ro:** trigger move thứ 2 trước khi nước trước hoàn tất → state lỗi.
- **Cách phòng:** state machine có `ANIMATING`, mọi click bị disable trong state này.

---

## 6. INBOX (BUG ĐANG MỞ)

> Subagent ghi vào đây khi phát hiện bug mới. Main agent triage sau.

<!-- Placeholder, sẽ điền khi có bug thật -->
*(Chưa có bug nào)*

---

## 7. TRIAGED (Đã phân loại, chờ fix)

*(Chưa có)*

---

## 8. IN PROGRESS (Đang fix)

*(Chưa có)*

---

## 9. FIXED (Đã fix, chờ verify)

*(Chưa có)*

---

## 10. VERIFIED (Đã verify đóng)

Format mục này: tóm tắt 1 dòng để dễ tra cứu sau.

| ID | Tóm tắt | Module | Severity | Phase | PR |
|----|---------|--------|----------|-------|-----|
| - | - | - | - | - | - |

---

## 11. WONTFIX / DEFERRED

Bug được quyết định không fix hoặc dời sang sau, kèm lý do.

| ID | Tóm tắt | Lý do |
|----|---------|-------|
| - | - | - |

---

## 12. DISCUSSION

Các vấn đề chưa rõ luật/UX, cần user quyết định:

### D-001: Quy ước "lượt đi đầu tiên"
- RULES.md mục 2 chốt: ĐEN đi trước.
- Câu hỏi: Khi user vs bot, mặc định user màu gì?
- **Quyết định:** UI cho user chọn màu, default Đen (đi trước).

### D-002: Luật "mở" (force capture)
- RULES.md mục 5 chốt: KHÔNG ép buộc.
- Có cần hiển thị cảnh báo "bạn đang để bị gánh" không?
- **Quyết định:** Có ở mức Dễ và Trung bình (tooltip), không ở Khó. Toggle được trong settings.

### D-003: Số lượng quân ban đầu
- Wikipedia ghi "8 quân mỗi bên" nhưng có biến thể 9 quân (thêm quân giữa).
- Layout đã chốt 8/8 trong RULES.md mục 1.3.
- Nếu user muốn 9/9, để ở phase mở rộng (post-MVP).

---

## 13. WORKFLOW CHO MAIN AGENT

Khi nhận báo bug từ subagent:
1. Đọc bug report đầy đủ
2. Xác minh bằng cách tự reproduce nếu có thể
3. Phân loại severity + module
4. Move từ INBOX → TRIAGED, gắn assign
5. Báo subagent tương ứng (hoặc spawn agent mới chuyên fix)
6. Sau khi agent báo fixed:
   - Move FIXED → VERIFIED bằng cách:
     - Chạy lại test fail trước đó → pass
     - Browser MCP verify thủ công nếu là UI bug
7. Move sang VERIFIED + commit message tham chiếu

---

## 14. RETROSPECTIVE (sau mỗi phase)

Sau mỗi phase, ghi lại:
- Số bug phát hiện trong phase
- Số bug fix được trong phase, số trôi sang phase sau
- Bug nặng nhất + bài học
- Cải tiến quy trình cho phase tiếp

### Phase X retro
- Found: ?
- Fixed in phase: ?
- Carried over: ?
- Top issue: ?
- Lesson: ?
