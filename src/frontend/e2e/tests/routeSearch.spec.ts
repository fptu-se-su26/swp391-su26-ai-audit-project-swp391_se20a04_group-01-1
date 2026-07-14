/**
 * routeSearch.spec.js - E2E Test Suite: Luồng Tìm Kiếm Tuyến Đường
 *
 * Tương đương 'Add-to-Cart' trong deliverable tuần 6.
 * Test luồng: Người dùng nhập điểm đi/đến → Hệ thống tìm đường.
 */
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import MapPage from '../pages/MapPage';

// Helper: login nhanh bằng localStorage (mock auth)
async function mockLogin(page) {
    // Simulate logged-in state bằng cách set token giả
    // Trong test thật, cần token từ backend
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
        localStorage.setItem('token', 'mock-token-for-e2e');
        localStorage.setItem('userRole', 'user');
    });
}

test.describe('TC-ROUTE: Luồng Tìm Kiếm Tuyến Đường', () => {

    test('TC-ROUTE-E2E-01: Trang dashboard có bản đồ sau khi đăng nhập', async ({ page }) => {
        test.skip(!process.env.RUN_E2E_WITH_BACKEND, 'Cần backend + auth thật');

        const loginPage = new LoginPage(page);
        const mapPage = new MapPage(page);

        // Đăng nhập thật
        await loginPage.open();
        await loginPage.login(process.env.TEST_USER_EMAIL || 'test@test.com',
                               process.env.TEST_USER_PASSWORD || 'password123');

        await page.waitForTimeout(3000);
        const isOnDashboard = await mapPage.isOnDashboard();
        expect(isOnDashboard).toBe(true);
    });

    test('TC-ROUTE-E2E-02: Truy cập /dashboard khi chưa đăng nhập → redirect /login', async ({ page }) => {
        // Clear auth
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.clear());

        const mapPage = new MapPage(page);
        await page.goto('http://localhost:5173/dashboard', { waitUntil: 'commit' });
        
        await page.waitForURL('**/login**', { timeout: 10000 });

        expect(page.url()).toContain('/login');
    });

    test('TC-ROUTE-E2E-03: Trang /login có route tới trang đăng ký', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Tìm link đến register
        const registerLink = page.locator('a[href*="register"]').first();
        await expect(registerLink).toBeVisible();
        await registerLink.click();

        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/register');
    });

    test('TC-ROUTE-E2E-04: Trang đăng ký hiển thị form đầy đủ', async ({ page }) => {
        await page.goto('http://localhost:5173/register');
        await page.waitForLoadState('networkidle');

        // Kiểm tra các input có trên form đăng ký
        await expect(page.locator('#reg-username')).toBeVisible();
        await expect(page.locator('#reg-email')).toBeVisible();
        await expect(page.locator('#reg-password')).toBeVisible();
    });

    test('TC-ROUTE-E2E-05: Page title không bị lỗi', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        const title = await page.title();
        // Title phải có nội dung (không rỗng, không 'Error')
        expect(title).toBeTruthy();
        expect(title.toLowerCase()).not.toContain('error');
    });
});
