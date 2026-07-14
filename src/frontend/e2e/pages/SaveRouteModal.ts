/**
 * SaveRouteModal - Page Object cho modal Lưu Lộ Trình
 *
 * Tương đương 'Checkout' trong deliverable:
 * → Người dùng hoàn tất lưu tuyến đường
 *
 * Selectors dựa trên SaveRouteModal.tsx:
 * - Modal header: có text 'Lưu lộ trình'
 * - Route name input: input[placeholder='Tên lộ trình']
 * - Save button: button với text 'Lưu lại'
 * - Close button: button trong header modal
 */
import BasePage from '../base/BasePage';

class SaveRouteModal extends BasePage {
    constructor(page) {
        super(page);

        // Selectors từ SaveRouteModal.tsx
        this.modal = '[class*="fixed"][class*="inset"]';
        this.routeNameInput = 'input[placeholder="Tên lộ trình"]';
        this.saveButton = 'button:has-text("Lưu lại")';
        this.closeButton = 'button[class*="rounded-full"]';
        this.modalHeader = 'h3:has-text("Lưu lộ trình")';
    }

    /**
     * Kiểm tra modal đang mở
     */
    async isOpen() {
        try {
            await this.page.locator(this.routeNameInput).waitFor({ state: 'visible', timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Nhập tên lộ trình
     */
    async enterRouteName(name) {
        await this.fillInput(this.routeNameInput, name);
    }

    /**
     * Click nút Lưu lại
     */
    async clickSave() {
        await this.page.click(this.saveButton);
    }

    /**
     * Đóng modal
     */
    async close() {
        await this.page.click(this.closeButton);
    }

    /**
     * Kiểm tra nút Lưu có disabled không (khi tên rỗng)
     */
    async isSaveDisabled() {
        return this.page.locator(this.saveButton).isDisabled();
    }
}

export default SaveRouteModal;
