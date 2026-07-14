/**
 * BasePage - Lớp cơ sở cho tất cả Page Objects
 * Cung cấp các phương thức Playwright dùng chung
 *
 * Tương đương BasePage trong POM Selenium:
 * - navigate() = driver.get()
 * - waitForElement() = WebDriverWait + ExpectedConditions
 * - takeScreenshot() = driver.takeScreenshot()
 */
import path from 'path';
import fs from 'fs';

class BasePage {
    /**
     * @param {import('@playwright/test').Page} page - Playwright page instance
     */
    constructor(page) {
        this.page = page;
        this.baseURL = process.env.BASE_URL || 'http://localhost:5173';
    }

    /**
     * Điều hướng tới URL
     * @param {string} path - Đường dẫn tương đối
     */
    async navigate(path = '/') {
        await this.page.goto(`${this.baseURL}${path}`);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Chờ element xuất hiện và visible
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout ms
     */
    async waitForElement(selector, timeout = 10000) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
        return this.page.locator(selector);
    }

    /**
     * Click an element after waiting for it
     */
    async safeClick(selector) {
        const el = await this.waitForElement(selector);
        await el.click();
    }

    /**
     * Fill input field
     */
    async fillInput(selector, value) {
        const el = await this.waitForElement(selector);
        await el.clear();
        await el.fill(value);
    }

    /**
     * Lấy text của element
     */
    async getText(selector) {
        const el = await this.waitForElement(selector);
        return el.textContent();
    }

    /**
     * Chụp ảnh màn hình khi test fail
     * @param {string} testName - Tên test case
     */
    async takeScreenshot(testName) {
        const screenshotDir = path.join(__dirname, '../../playwright-screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const filename = `${testName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const screenshotPath = path.join(screenshotDir, filename);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
    }

    /**
     * Kiểm tra URL hiện tại có chứa path không
     */
    async isOnPage(urlPattern) {
        return this.page.url().includes(urlPattern);
    }

    /**
     * Chờ navigation hoàn tất
     */
    async waitForNavigation() {
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Lấy title trang
     */
    async getTitle() {
        return this.page.title();
    }
}

export default BasePage;
