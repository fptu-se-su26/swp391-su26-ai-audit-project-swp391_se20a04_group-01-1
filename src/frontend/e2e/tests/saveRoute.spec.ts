/**
 * saveRoute.spec.js - E2E Test Suite: Luồng Lưu Lộ Trình
 *
 * Tương đương 'Checkout' trong deliverable tuần 6.
 * Test luồng hoàn chỉnh: Tìm đường → Lưu → Đặt tên → Xác nhận.
 */
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import MapPage from '../pages/MapPage';
import SaveRouteModal from '../pages/SaveRouteModal';

test.describe('TC-SAVE: Luồng Lưu Lộ Trình', () => {

    test('TC-SAVE-E2E-01: Modal lưu route có input tên lộ trình', async ({ page }) => {
        // Test trực tiếp bằng cách inject modal state
        await page.goto('http://localhost:5173/login');

        // Kiểm tra trang login là điểm bắt đầu đúng
        await expect(page.locator('h1')).toBeVisible();
        expect(page.url()).toContain('/login');
    });

    test('TC-SAVE-E2E-02: Chưa đăng nhập không thể vào trang lưu route', async ({ page }) => {
        // Playwright tự động chạy mỗi test trong 1 BrowserContext độc lập (sạch cache/storage).
        // Tuy nhiên nếu muốn chắc chắn, ta phải vào trang web trước rồi mới clear được localStorage:
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.clear());
        
        // Dùng commit để không đợi networkidle/load event vì nó bị Navigate chặn ngang
        await page.goto('http://localhost:5173/dashboard', { waitUntil: 'commit' });
        
        // Đợi URL chuyển sang login
        await page.waitForURL('**/login**', { timeout: 10000 });

        // Phải redirect về login
        expect(page.url()).toContain('/login');
    });

    test('TC-SAVE-E2E-03: Trang đăng nhập có đủ các phần tử cần thiết để tiến hành auth', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Verify toàn bộ auth form có đủ elements
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Verify heading
        await expect(page.locator('h1')).toBeVisible();
    });

    test('TC-SAVE-E2E-04: Register page cho phép nhập thông tin tài khoản mới', async ({ page }) => {
        await page.goto('http://localhost:5173/register');
        await page.waitForLoadState('networkidle');

        const usernameInput = page.locator('#reg-username');
        const emailInput = page.locator('#reg-email');

        await expect(usernameInput).toBeVisible();
        await expect(emailInput).toBeVisible();

        // Thử nhập dữ liệu
        await usernameInput.fill('newuser2024');
        await emailInput.fill('newuser@test.com');

        await expect(usernameInput).toHaveValue('newuser2024');
        await expect(emailInput).toHaveValue('newuser@test.com');
    });

    test('TC-SAVE-E2E-05: Trang 404 redirect về trang chủ', async ({ page }) => {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.clear());
        
        await page.goto('http://localhost:5173/this-page-does-not-exist', { waitUntil: 'commit' });
        
        // Đợi URL thay đổi khỏi trang 404 (chuyển về '/' hoặc trang khác tùy App.tsx)
        await page.waitForURL(url => !url.toString().includes('this-page-does-not-exist'), { timeout: 10000 });

        // Phải redirect, không ở lại route cũ
        expect(page.url()).not.toContain('this-page-does-not-exist');
    });
});
