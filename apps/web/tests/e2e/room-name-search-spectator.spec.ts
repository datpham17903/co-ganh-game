import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function setName(page: Page, name: string) {
  await page.goto('/#/play/pvp');
  await page.getByTestId('input-player-name').fill(name);
}

test('room name + search trong lobby', async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // A tạo phòng public với tên "Friday match"
  await setName(pageA, 'Alice');
  await pageA.getByTestId('check-public').check();
  await pageA.getByTestId('input-room-name').fill('Friday match');
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  // B mở lobby + search "Friday"
  await setName(pageB, 'Bob');
  await expect(pageB.getByTestId(`public-room-${roomId}`)).toBeVisible({ timeout: 5000 });
  // Phòng phải hiển thị tên
  await expect(pageB.getByText('Friday match')).toBeVisible();

  // Search "fri" → vẫn thấy
  await pageB.getByTestId('input-search').fill('fri');
  await expect(pageB.getByTestId(`public-room-${roomId}`)).toBeVisible({ timeout: 3000 });

  // Search "xyz123" → không thấy
  await pageB.getByTestId('input-search').fill('xyz123');
  await pageB.waitForTimeout(500);
  await expect(pageB.getByTestId(`public-room-${roomId}`)).not.toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

test('spectator: phòng đang chơi → C có thể vào xem', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const ctxC = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const pageC = await ctxC.newPage();

  // A tạo phòng public
  await setName(pageA, 'Alice');
  await pageA.getByTestId('check-public').check();
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  // B join → ván playing
  await setName(pageB, 'Bob');
  await pageB.getByTestId('input-room-code').fill(roomId);
  await pageB.getByTestId('btn-join-room').click();
  await pageB.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  await expect(pageB.getByTestId('board')).toBeVisible();

  // C vào lobby — phòng phải hiển thị status "Playing" + nút Watch
  await setName(pageC, 'Charlie');
  await expect(pageC.getByTestId(`public-room-${roomId}`)).toBeVisible({ timeout: 5000 });
  // Click vào phòng → spectate
  await pageC.getByTestId(`public-room-${roomId}`).click();
  await pageC.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}\?spectate=1/);

  // C phải thấy banner "Bạn đang xem"
  await expect(pageC.getByTestId('spectator-banner')).toBeVisible({ timeout: 3000 });
  // C thấy bàn cờ
  await expect(pageC.getByTestId('board')).toBeVisible();

  // A và B phải thấy spectator list update có Charlie
  await expect(pageA.getByTestId('spectators-list')).toContainText('1');
  await expect(pageB.getByTestId('spectators-list')).toContainText('1');

  await ctxA.close();
  await ctxB.close();
  await ctxC.close();
});

test('search persistence khi phòng update', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await setName(pageB, 'Bob');
  await pageB.getByTestId('input-search').fill('alice');

  // A tạo phòng public với hostname Alice
  await setName(pageA, 'Alice');
  await pageA.getByTestId('check-public').check();
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);

  // B với search="alice" phải thấy phòng của Alice
  await pageB.waitForTimeout(500);
  const roomId = pageA.url().split('/').pop()!;
  await expect(pageB.getByTestId(`public-room-${roomId}`)).toBeVisible({ timeout: 5000 });

  await ctxA.close();
  await ctxB.close();
});
