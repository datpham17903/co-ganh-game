import { test, expect } from '@playwright/test';

test('home page hiển thị 3 nút chính + nút hướng dẫn', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1', { hasText: 'CỜ GÁNH' })).toBeVisible();
  await expect(page.getByText(/CHƠI VỚI BOT/)).toBeVisible();
  await expect(page.getByText(/CHƠI ONLINE/)).toBeVisible();
  await expect(page.getByText(/CHƠI 2 NGƯỜI/)).toBeVisible();
  await expect(page.getByText(/Hướng dẫn luật/)).toBeVisible();
});

test('rules page hiển thị 5 sections', async ({ page }) => {
  await page.goto('/rules');
  await expect(page.getByText('1. Bàn cờ')).toBeVisible();
  await expect(page.getByText('2. Di chuyển')).toBeVisible();
  await expect(page.getByText('3. Gánh')).toBeVisible();
  await expect(page.getByText(/4\. Vây/)).toBeVisible();
  await expect(page.getByText('5. Kết thúc ván')).toBeVisible();
});

test('vào bot picker hiển thị 3 độ khó + 2 màu', async ({ page }) => {
  await page.goto('/play/bot');
  await expect(page.getByTestId('diff-easy')).toBeVisible();
  await expect(page.getByTestId('diff-medium')).toBeVisible();
  await expect(page.getByTestId('diff-hard')).toBeVisible();
  await expect(page.getByTestId('color-B')).toBeVisible();
  await expect(page.getByTestId('color-W')).toBeVisible();
  await expect(page.getByTestId('start-game')).toBeVisible();
});

test('play vs bot easy: bắt đầu ván + bàn cờ render', async ({ page }) => {
  await page.goto('/play/bot');
  await page.getByTestId('diff-easy').click();
  await page.getByTestId('color-B').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('board')).toBeVisible();
  // Initial board phải có đúng 16 piece
  const pieces = page.getByTestId(/^piece-/);
  await expect(pieces).toHaveCount(16);
});

test('local game: 1 nước đi đổi turn', async ({ page }) => {
  await page.goto('/play/local');
  await expect(page.getByTestId('turn-indicator')).toContainText('Đen');
  // Click quân (1,0) = index 5
  await page.getByTestId('piece-5').click();
  // Click ô đích (1,1) = index 6 (legal)
  await page.getByTestId('legal-6').click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Trắng');
});
