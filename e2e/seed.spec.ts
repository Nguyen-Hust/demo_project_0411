import { test, expect } from '@playwright/test';

// Seed smoke test cho Blazor Server SmartKMS.Web
// Chạy: cd e2e && npm i && npx playwright test
// (app khởi động tự qua webServer trong playwright.config.ts)

test('home page renders header and dashboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('page-header')).toContainText('Tổng quan');
  await expect(page.getByTestId('sidebar')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('navigation drawer exposes module links', async ({ page }) => {
  await page.goto('/');

  for (const id of ['nav-children', 'nav-attendance', 'nav-nutrition', 'nav-staff']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});
