import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Ticket 01 — Happy Path E2E (headed, slowMo 300, Blazor circuit sync).
// Chạy qua scripts/run-e2e-server.ps1 (ephemeral postgres + web + teardown).

async function waitForCircuit(page: Page) {
  // Blazor Interactive Server: chờ circuit sẵn sàng trước khi tương tác.
  // Dùng tín hiệu DOM determinist (header render) thay vì waitForEvent('websocket')
  // vì WebSocket mở trong lúc goto() nên listener gắn sau sẽ không bắt được.
  await expect(page.getByTestId('page-header')).toBeVisible({ timeout: 30_000 });
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
    // MudBlazor render popover select qua portal ở body, KHÔNG nằm trong dialog.
    await page.getByTestId('class-agegroup-select').click();
    await page.locator('.mud-list-item', { hasText: 'Lá' }).click();
    await page.getByTestId('class-year-input').fill('2025-2026');
    await page.getByTestId('class-room-input').fill('Phòng 101');
    await page.getByTestId('class-submit-button').click();

    // Dialog đóng thì mới khẳng định hàng mới hiển thị (Blazor round-trip + reload)
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // 3. Hàng lớp hiển thị với sĩ số 0/30
    await expect(page.getByText('Lớp Lá A')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('0/30')).toBeVisible();
    await expect(page.getByText('Hoạt động')).toBeVisible();

    // 4. Lọc khối Lá + năm 2025-2026 → còn hiển thị
    await page.getByTestId('class-agegroup-filter').click();
    await page.getByRole('listbox').getByRole('option', { name: 'Lá' }).click();
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
    await page.getByRole('listbox').getByRole('option', { name: 'Đã đóng' }).click();
    await expect(page.getByText('Lớp Lá A1')).toBeVisible();
  });
});
