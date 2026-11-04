import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Ticket 01 — Happy Path E2E (headed, slowMo 300, Blazor circuit sync).
// Chạy qua scripts/run-e2e-server.ps1 (ephemeral postgres + web + teardown).

async function waitForCircuit(page: Page) {
  // Blazor Interactive Server: circuit mở qua WebSocket (không phải HTTP response).
  // Đợi socket _blazor được mở; nếu đã mở sẵn thì bỏ qua (timeout ngắn).
  try {
    await page.waitForEvent('websocket', (ws) => ws.url().includes('_blazor'), { timeout: 15_000 });
  } catch {
    // circuit có thể đã sẵn sàng trước khi listener gắn — không phải lỗi.
  }
}

test.describe('Lớp học (Ticket 01) happy path', () => {
  test('tạo, lọc, xem, sửa và đóng lớp', async ({ page }) => {
    await page.goto('/');
    await waitForCircuit(page);

    // 1. Vào trang lớp học qua nav (Blazor Server mở circuit mới mỗi navigation)
    await page.getByTestId('nav-classes').click();
    await waitForCircuit(page);
    await expect(page).toHaveURL(/\/classes$/);
    await expect(page.getByTestId('page-header')).toContainText('Lớp học');

    // 2. Tạo lớp mới
    await page.getByTestId('class-create-button').click();
    await page.getByTestId('class-name-input').fill('Lớp Lá A');
    await page.getByTestId('class-agegroup-select').click();
    await page.getByRole('option', { name: 'Lá' }).click();
    await page.getByTestId('class-year-input').fill('2025-2026');
    await page.getByTestId('class-room-input').fill('Phòng 101');
    await page.getByTestId('class-submit-button').click();

    // 3. Hàng lớp hiển thị với sĩ số 0/30
    await expect(page.getByText('Lớp Lá A')).toBeVisible();
    await expect(page.getByText('0/30')).toBeVisible();
    await expect(page.getByText('Hoạt động')).toBeVisible();

    // 4. Lọc khối Lá + năm 2025-2026 → còn hiển thị
    await page.getByTestId('class-agegroup-filter').click();
    await page.getByRole('option', { name: 'Lá' }).click();
    await page.getByTestId('class-year-filter').fill('2025-2026');
    await expect(page.getByText('Lớp Lá A')).toBeVisible();

    // 5. Vào chi tiết → chỗ trống 30, EmptyState GV/HS
    await page.getByRole('button', { name: 'Xem chi tiết' }).first().click();
    await expect(page.getByTestId('class-vacant-slots')).toContainText('Chỗ trống: 30');
    await expect(page.getByText('Chưa có giáo viên')).toBeVisible();
    await expect(page.getByText('Chưa có học sinh')).toBeVisible();

    // 6. Quay lại, sửa tên + phòng
    await page.getByTestId('class-back-button').click();
    await page.getByRole('button', { name: 'Sửa' }).first().click();
    await page.getByTestId('class-name-input').fill('Lớp Lá A1');
    await page.getByTestId('class-room-input').fill('Phòng 102');
    await page.getByTestId('class-submit-button').click();
    await expect(page.getByText('Lớp Lá A1')).toBeVisible();

    // 7. Đóng lớp → chip Đã đóng; lọc trạng thái Đã đóng → vẫn hiển thị (soft-close)
    await page.getByRole('button', { name: 'Đóng lớp' }).first().click();
    await page.getByTestId('confirm-dialog-ok').click();
    await expect(page.getByText('Đã đóng').first()).toBeVisible();

    await page.getByTestId('class-status-filter').click();
    await page.getByRole('option', { name: 'Đã đóng' }).click();
    await expect(page.getByText('Lớp Lá A1')).toBeVisible();
  });
});
