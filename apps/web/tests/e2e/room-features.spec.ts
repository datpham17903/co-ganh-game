import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function setName(page: Page, name: string) {
  await page.goto('/#/play/pvp');
  await page.getByTestId('input-player-name').fill(name);
}

test('public room: tạo phòng public → hiển thị trong list của người khác', async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // B mở lobby trước (xem list)
  await setName(pageB, 'Bob');
  await expect(pageB.getByTestId('public-rooms')).toBeVisible();

  // A tạo phòng public
  await setName(pageA, 'Alice');
  await pageA.getByTestId('check-public').check();
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  // B phải thấy phòng của A trong list trong < 3s (broadcast)
  await expect(pageB.getByTestId(`public-room-${roomId}`)).toBeVisible({ timeout: 5000 });
  // Scope selector vào trong room item để tránh match input "Alice" mặc định
  await expect(pageB.getByTestId(`public-room-${roomId}`)).toContainText('Alice');

  await ctxA.close();
  await ctxB.close();
});

test('private room: phòng không public → KHÔNG hiển thị', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await setName(pageB, 'Bob');

  await setName(pageA, 'Alice');
  // KHÔNG check public
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  // B đợi ~1s — phòng KHÔNG xuất hiện
  await pageB.waitForTimeout(1000);
  await expect(pageB.getByTestId(`public-room-${roomId}`)).not.toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

test('password: join sai password → từ chối', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await setName(pageA, 'Alice');
  await pageA.getByTestId('input-password').fill('correctpw');
  await pageA.getByTestId('btn-create-room').click();
  await pageA.waitForURL(/\/play\/pvp\/[A-Z0-9]{6}/);
  const roomId = pageA.url().split('/').pop()!;

  await setName(pageB, 'Bob');
  await pageB.getByTestId('input-room-code').fill(roomId);

  // Join code bằng tay — phòng có pw, prompt sẽ hiện
  pageB.once('dialog', (d) => void d.accept('wrongpw'));
  await pageB.getByTestId('btn-join-room').click();

  // B vẫn ở lobby (URL không đổi sang /play/pvp/<id>)
  await pageB.waitForTimeout(500);
  expect(pageB.url()).toContain('/play/pvp');
  expect(pageB.url()).not.toContain(roomId);

  await ctxA.close();
  await ctxB.close();
});

test('chat: A gửi tin nhắn, B nhận được', async ({ browser }) => {
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

  // Đợi cả 2 thấy bàn cờ
  await expect(pageA.getByTestId('board')).toBeVisible();
  await expect(pageB.getByTestId('board')).toBeVisible();
  await pageA.waitForTimeout(300);

  // A gửi chat
  await pageA.getByTestId('chat-input').fill('hello bob');
  await pageA.getByTestId('chat-send').click();

  // B phải thấy msg trong < 2s
  await expect(pageB.getByTestId('chat-messages')).toContainText('hello bob', {
    timeout: 3000,
  });
  // A cũng thấy lại msg của mình
  await expect(pageA.getByTestId('chat-messages')).toContainText('hello bob');

  await ctxA.close();
  await ctxB.close();
});
