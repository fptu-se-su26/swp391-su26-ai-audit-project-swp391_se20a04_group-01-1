/**
 * LoginPage - Page Object cho trang Đăng Nhập
 * URL: /login
 *
 * Selectors dựa trên Login.tsx:
 * - Email: input[type='email']
 * - Password: input[type='password']
 * - Submit: button[type='submit']
 * - Error: div với color #ef4444
 */
import BasePage from '../base/BasePage';

class LoginPage extends BasePage {
    constructor(page) {
        super(page);

        // Selectors
        this.emailInput = 'input[type="email"]';
        this.passwordInput = 'input[type="password"]';
        this.submitButton = 'button[type="submit"]';
        this.errorMessage = '[style*="ef4444"]';
        this.forgotPasswordLink = 'a[href*="forgot-password"]';
        this.registerLink = 'a[href*="register"]';
        this.heading = 'h1';
    }

    /**
     * Mở trang đăng nhập
     */
    async open() {
        await this.navigate('/login');
    }

    /**
     * Nhập email
     */
    async enterEmail(email) {
        await this.fillInput(this.emailInput, email);
    }

    /**
     * Nhập mật khẩu
     */
    async enterPassword(password) {
        await this.fillInput(this.passwordInput, password);
    }

    /**
     * Click nút đăng nhập
     */
    async clickLogin() {
        await this.page.click(this.submitButton);
    }

    /**
     * Thực hiện đăng nhập hoàn chỉnh
     */
    async login(email, password) {
        await this.enterEmail(email);
        await this.enterPassword(password);
        await this.clickLogin();
    }

    /**
     * Lấy thông báo lỗi
     */
    async getErrorMessage() {
        try {
            const el = this.page.locator(this.errorMessage).first();
            await el.waitFor({ state: 'visible', timeout: 5000 });
            return el.textContent();
        } catch {
            return null;
        }
    }

    /**
     * Kiểm tra đang ở trang login
     */
    async isOnLoginPage() {
        return this.page.url().includes('/login');
    }

    /**
     * Kiểm tra nút submit có bị disabled không
     */
    async isSubmitDisabled() {
        return this.page.locator(this.submitButton).isDisabled();
    }
}

export default LoginPage;
