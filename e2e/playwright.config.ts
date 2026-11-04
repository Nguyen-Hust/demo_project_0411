import { defineConfig } from '@playwright/test';

// E2E dùng server ephemeral do scripts/run-e2e-server.ps1 quản lý vòng đời.
// Không cấu hình webServer tự khởi động ở đây — supervisor đã chạy app trên :5160.
export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5160',
    headless: false,
    launchOptions: {
      slowMo: 300,
    },
    trace: 'retain-on-failure',
  },
});
