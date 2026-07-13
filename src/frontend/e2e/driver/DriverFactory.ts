/**
 * DriverFactory - Quản lý browser instances cho Playwright tests
 * Tương đương DriverFactory trong Selenium/WebDriver pattern
 *
 * Hỗ trợ:
 * - Chrome (chromium)
 * - Firefox
 * - Headless Chrome (cho CI/CD)
 */
import { chromium, firefox, webkit } from '@playwright/test';

class DriverFactory {
    /**
     * Khởi tạo browser theo loại được chỉ định
     * @param {string} browserName - 'chromium' | 'firefox' | 'webkit' | 'headless'
     * @returns {Promise<Browser>} Playwright Browser instance
     */
    static async getBrowser(browserName = 'chromium') {
        const headless = browserName === 'headless' || process.env.CI === 'true';
        const actualBrowser = browserName === 'headless' ? 'chromium' : browserName;

        const launchOptions = {
            headless,
            slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
        };

        switch (actualBrowser) {
            case 'firefox':
                return await firefox.launch(launchOptions);
            case 'webkit':
                return await webkit.launch(launchOptions);
            case 'chromium':
            default:
                return await chromium.launch(launchOptions);
        }
    }

    /**
     * Lấy browser name từ environment variable BROWSER
     * Dùng cho CI pipeline
     */
    static getBrowserFromEnv() {
        return process.env.BROWSER || 'chromium';
    }
}

export default DriverFactory;
