# Stitch Mockups — Cờ Gánh

Mockup được sinh bằng Google Stitch MCP, dựa trên design tokens trong [UI_UX.md](../UI_UX.md) mục 2.

## Project

- **Stitch project:** `projects/14200025905078212027`
- **Design system:** `assets/16418155517035766958` (Co Ganh Traditional)
- **URL xem:** https://stitch.withgoogle.com/projects/14200025905078212027

## Screens

| Title              | Device  | Screen ID                          |
| ------------------ | ------- | ---------------------------------- |
| Homepage (mobile)  | MOBILE  | `8ac5857dc2a94aa58854884cb790c347` |
| Homepage (desktop) | DESKTOP | `76f69614e9ff46ab9022755a7a30c8e0` |
| PvP Lobby          | DESKTOP | `0f413e5c2bb04d5ca9c6c55c53b16fc5` |
| Settings Modal     | DESKTOP | `837b96a45b9e41b494f492f6f2c997b5` |
| Gameplay (v1)      | DESKTOP | `634dd625f2994b2a9936cffa71bf99d9` |
| Gameplay (v2)      | DESKTOP | `21ac4339174447409a05e6960823a561` |
| Gameplay (v3)      | DESKTOP | `baa932a92c814a8c97913a642e59e4f5` |

## Design tokens (đã apply vào code)

- Primary red: `#C0392B`
- Wood golden: `#D9B074`
- Paper cream background: `#F5E6C8`
- Surface: `#FFF8E7`
- Text dark: `#2C1810`
- Border lines: `#6B3F1D`
- Roundness: 12px (rounded-xl)
- Headline font: Be Vietnam Pro
- Body font: Inter
- Mono font: JetBrains Mono

## Cách dùng

Mockup là **tham khảo** (UI_UX.md mục 5.4). Code sẽ:

- Match design tokens chính xác (đã làm — tailwind.config.js + styles.css)
- Tham khảo bố cục, hierarchy, spacing
- KHÔNG copy y nguyên markup từ Stitch

## Re-fetch screenshots

Nếu cần xem mockup lại, vào Stitch UI hoặc gọi MCP tool:

```
mcp__stitch__list_screens projectId=14200025905078212027
mcp__stitch__get_screen name=projects/14200025905078212027/screens/<id>
```

Stitch trả URL `lh3.googleusercontent.com/aida/...` — URL này yêu cầu auth Stitch session
nên không lưu được static PNG vào repo. Workaround: chụp screenshot tay từ Stitch UI
nếu muốn embed vào docs.
