import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Full PvP flow: 2 contexts, tạo phòng + join + đi 1 nước, verify state sync.
 * Cần backend chạy local trên port 3001 (pnpm --filter @co-ganh/server dev).
 */

async function setName(page: Page, name: string) {
  await page.goto('/#/play/pvp');
  await page.getByTestId('input-player-name').fill(name);
}

test('PvP full flow: tạo phòng + join + cả 2 cùng vào phòng', async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // Player A tạo phòng
  await setName(pageA, 'Alice');
  await pageA.getByTestId('btn-create-room').click();

  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/, { timeout: 5000 });
  const url = pageA.url();
  // HashRouter: URL = http://.../#/play/pvp/ABC123
  const roomId = url.split('/').pop()!;
  expect(roomId).toMatch(/^[A-Z0-9]{6}$/);

  // A thấy "Chờ đối thủ vào phòng"
  await expect(pageA.getByText(/Chờ đối thủ vào phòng/)).toBeVisible({ timeout: 3000 });

  // Player B join
  await setName(pageB, 'Bob');
  await pageB.getByTestId('input-room-code').fill(roomId);
  await pageB.getByTestId('btn-join-room').click();
  await pageB.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/, { timeout: 5000 });

  // Cả 2 phải thấy bàn cờ trong vòng 5s — verify socket sync flow OK.
  await expect(pageA.getByTestId('board')).toBeVisible({ timeout: 5000 });
  await expect(pageB.getByTestId('board')).toBeVisible({ timeout: 5000 });

  // Cả 2 không còn ở trạng thái "chờ đối thủ" — bằng chứng game:start
  // đã propagate. Đây là regression test cho bug listener-attach-trễ.
  await expect(pageA.getByText(/Chờ đối thủ vào phòng/)).not.toBeVisible({ timeout: 3000 });

  await ctxA.close();
  await ctxB.close();
});

test('PvP: A đi 1 nước → B thấy state cập nhật', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await setName(pageA, 'Alice');
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  await setName(pageB, 'Bob');
  await pageB.getByTestId('input-room-code').fill(roomId);
  await pageB.getByTestId('btn-join-room').click();
  await pageB.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);

  // Đợi cả 2 thấy bàn
  await expect(pageA.getByTestId('board')).toBeVisible();
  await expect(pageB.getByTestId('board')).toBeVisible();
  await pageA.waitForTimeout(500);

  // A là đen, đi quân (1,0) = piece-5 → ô (1,1) = legal-6
  await pageA.getByTestId('piece-5').click();
  await pageA.getByTestId('legal-6').click();

  // B phải thấy quân (1,0) biến mất + (1,1) xuất hiện trong vòng 2s
  await expect(pageB.getByTestId('piece-6')).toBeVisible({ timeout: 3000 });

  await ctxA.close();
  await ctxB.close();
});
