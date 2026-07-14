/**
 * login.spec.js - E2E Test Suite: Luồng Đăng Nhập
 *
 * Tương đương 'Login Flow' trong deliverable tuần 6.
 * Test toàn bộ user journey từ mở trang → nhập thông tin → đăng nhập.
 *
 * Lưu ý: Các test cần backend đang chạy tại http://localhost:5001
 *         và frontend tại http://localhost:5173
 */
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import MapPage from '../pages/MapPage';

test.describe('TC-LOGIN: Luồng Đăng Nhập', () => {

    test.beforeEach(async ({ page }) => {
        // Xóa localStorage trước mỗi test để đảm bảo clean state
        await page.goto('http://localhost:5173');
        await page.evaluate(() => localStorage.clear());
    });

    // ─── Kiểm tra UI ────────────────────────────────────────────

    test('TC-LOGIN-E2E-01: Trang login hiển thị đúng các thành phần', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Kiểm tra heading
        await expect(page.locator('h1')).toContainText('Chào mừng');

        // Kiểm tra form fields
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Kiểm tra link quên mật khẩu
        await expect(page.locator('text=Quên mật khẩu?')).toBeVisible();
    });

    test('TC-LOGIN-E2E-02: Có thể nhập email và password', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        await loginPage.enterEmail('test@example.com');
        await loginPage.enterPassword('password123');

        await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
        // Password bị ẩn nhưng value vẫn có
        await expect(page.locator('input[type="password"]')).not.toBeEmpty();
    });

    test('TC-LOGIN-E2E-03: Đăng nhập với sai mật khẩu → hiển thị lỗi', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // SKIP nếu backend không chạy
        test.skip(!process.env.RUN_E2E_WITH_BACKEND, 'Cần backend đang chạy');

        await loginPage.login('wronguser@test.com', 'wrongpassword');

        // Chờ error message xuất hiện
        await page.waitForTimeout(2000);
        const errorMsg = await loginPage.getErrorMessage();
        expect(errorMsg).toBeTruthy();
    });

    test('TC-LOGIN-E2E-04: Nút Đăng nhập visible và clickable', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        const submitBtn = page.locator('button[type="submit"]');
        await expect(submitBtn).toBeVisible();
        await expect(submitBtn).toBeEnabled();
        await expect(submitBtn).toContainText('Đăng nhập');
    });

    test('TC-LOGIN-E2E-05: Link "Quên mật khẩu" dẫn đúng trang', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        await page.click('text=Quên mật khẩu?');
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('forgot-password');
    });

    test('TC-LOGIN-E2E-06: Chưa đăng nhập truy cập /dashboard → redirect về /login', async ({ page }) => {
        const mapPage = new MapPage(page);
        await mapPage.open();

        const isRedirected = await mapPage.isRedirectedToLogin();
        expect(isRedirected).toBe(true);
    });

    test('TC-LOGIN-E2E-07: Toggle hiện/ẩn mật khẩu hoạt động đúng', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        await loginPage.enterPassword('mypassword');

        // Ban đầu là type=password
        await expect(page.locator('input[type="password"]')).toBeVisible();

        // Click nút toggle (button không phải submit trong vùng password)
        await page.locator('input[type="password"] ~ button, input[type="password"] + button').click();

        // Sau khi toggle, input chuyển thành type=text
        await expect(page.locator('input[type="text"][autocomplete="current-password"]')).toBeVisible();
    });
});
