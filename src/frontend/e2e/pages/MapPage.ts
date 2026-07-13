/**
 * MapPage - Page Object cho trang Dashboard/Bản Đồ
 * URL: /dashboard
 *
 * Chức năng tương đương 'Add-to-Cart' trong deliverable:
 * → Người dùng tìm kiếm tuyến đường (Route Search)
 */
import BasePage from '../base/BasePage';

class MapPage extends BasePage {
    constructor(page) {
        super(page);

        // Selectors (dựa trên RoutePanel.tsx)
        this.mapCanvas = '.mapboxgl-canvas';
        this.originInput = 'input[placeholder*="xuất phát"], input[placeholder*="Điểm đi"]';
        this.destinationInput = 'input[placeholder*="đến"], input[placeholder*="Điểm đến"]';
        this.searchButton = 'button[title*="tìm"], button[aria-label*="search"]';
        this.saveRouteButton = 'button[aria-label*="lưu"], button[title*="Lưu"]';
        this.routeResultPanel = '[class*="route"], [class*="RoutePanel"]';
        this.userMenuButton = 'button[aria-label*="user"], button[aria-label*="User"]';
    }

    /**
     * Mở trang dashboard
     */
    async open() {
        await this.navigate('/dashboard');
    }

    /**
     * Kiểm tra bản đồ đã load
     */
    async isMapLoaded() {
        try {
            await this.page.waitForSelector(this.mapCanvas, { timeout: 15000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Nhập điểm xuất phát
     */
    async enterOrigin(location) {
        const inputs = this.page.locator('input[class*="form"], input[placeholder]');
        const count = await inputs.count();
        if (count > 0) {
            await inputs.first().fill(location);
        }
    }

    /**
     * Nhập điểm đến
     */
    async enterDestination(destination) {
        const inputs = this.page.locator('input[class*="form"], input[placeholder]');
        const count = await inputs.count();
        if (count > 1) {
            await inputs.nth(1).fill(destination);
        }
    }

    /**
     * Kiểm tra có redirect về login không (khi chưa auth)
     */
    async isRedirectedToLogin() {
        await this.page.waitForTimeout(2000);
        return this.page.url().includes('/login');
    }

    /**
     * Kiểm tra đang ở trang dashboard
     */
    async isOnDashboard() {
        return this.page.url().includes('/dashboard');
    }
}

export default MapPage;
