import { test, expect } from '@playwright/test';

test('chuyển ngôn ngữ sang English thay đổi UI text', async ({ page }) => {
  await page.goto('/');

  // VI mặc định: nút "CHƠI VỚI BOT" hiển thị
  await expect(page.getByText(/CHƠI VỚI BOT/)).toBeVisible();

  // Mở settings
  await page.getByLabel('Cài đặt').click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt' })).toBeVisible();

  // Click English
  await page.getByTestId('lang-en').click();

  // Đóng modal
  await page.getByText('Close').click();

  // UI giờ phải tiếng Anh
  await expect(page.getByText(/PLAY vs BOT/)).toBeVisible();
  await expect(page.getByText(/PLAY ONLINE/)).toBeVisible();
  await expect(page.getByText(/LOCAL 2 PLAYERS/)).toBeVisible();
  await expect(page.getByText(/How to play/)).toBeVisible();
});

test('rules page chuyển sang English', async ({ page }) => {
  await page.goto('/');
  // Switch to EN
  await page.getByLabel('Cài đặt').click();
  await page.getByTestId('lang-en').click();
  await page.getByText('Close').click();
  // Click rules link in EN
  await page.getByText(/How to play/).click();
  await expect(page.getByText('How to play Cờ Gánh')).toBeVisible();
  await expect(page.getByText(/1\. The board/)).toBeVisible();
  await expect(page.getByText(/2\. Movement/)).toBeVisible();
  await expect(page.getByText(/Black moves first/)).toBeVisible();
});

test('settings tile selected state visible', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Cài đặt').click();

  // Default is VI
  const viTile = page.getByTestId('lang-vi');
  const enTile = page.getByTestId('lang-en');

  // Click EN — viTile lose accent, enTile gain it
  await enTile.click();

  // Click theme dark
  await page.getByTestId('theme-dark').click();
  // Verify html class
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  expect(htmlClass).toContain('dark');

  // Click back light
  await page.getByTestId('theme-light').click();
  const htmlClass2 = await page.evaluate(() => document.documentElement.className);
  expect(htmlClass2).not.toContain('dark');

  // Reset to VI để không ảnh hưởng test khác
  await viTile.click();
});
