import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function setName(page: Page, name: string) {
  await page.goto('/#/play/pvp');
  await page.getByTestId('input-player-name').fill(name);
}

test('clock: cả 2 player thấy đồng hồ đếm ngược', async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
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

  await expect(pageA.getByTestId('board')).toBeVisible();
  await expect(pageB.getByTestId('board')).toBeVisible();

  // Clock B + clock W phải hiện trong cả 2 tab
  await expect(pageA.getByTestId('clock-B')).toBeVisible({ timeout: 5000 });
  await expect(pageA.getByTestId('clock-W')).toBeVisible();
  await expect(pageB.getByTestId('clock-B')).toBeVisible();
  await expect(pageB.getByTestId('clock-W')).toBeVisible();

  // Format M:SS — initial 10:00 (cộng/trừ vài giây)
  const clockB = await pageA.getByTestId('clock-B').textContent();
  expect(clockB).toMatch(/^\d+:\d{2}$/);
  // Khoảng 10:00 → từ 9:55 đến 10:00
  expect(clockB).toMatch(/^(10:00|9:5[0-9])$/);

  await ctxA.close();
  await ctxB.close();
});

test('clock: tick xuống sau 2s', async ({ browser }) => {
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
  await expect(pageA.getByTestId('clock-B')).toBeVisible({ timeout: 5000 });

  // B đang đi → clock-B đếm ngược, clock-W giữ nguyên
  const initialB = await pageA.getByTestId('clock-B').textContent();
  await pageA.waitForTimeout(2500);
  const laterB = await pageA.getByTestId('clock-B').textContent();
  // Nếu countdown thực sự chạy, laterB phải khác initialB (giảm)
  expect(laterB).not.toBe(initialB);

  await ctxA.close();
  await ctxB.close();
});
