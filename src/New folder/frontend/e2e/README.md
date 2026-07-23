# 🎭 DN-Pulse — E2E Test Suite (Playwright)

## Cấu Trúc POM (Page Object Model)

```
e2e/
├── base/
│   └── BasePage.js         ← Tầng 1: Base utilities
├── driver/
│   └── DriverFactory.js    ← Browser factory
├── pages/                  ← Tầng 2: Page Objects
│   ├── LoginPage.js
│   ├── MapPage.js
│   └── SaveRouteModal.js
└── tests/                  ← Tầng 3: Test Specs
    ├── login.spec.js
    ├── routeSearch.spec.js
    └── saveRoute.spec.js
```

## Chạy Tests

```bash
# Tất cả tests, tất cả browser
npm run test:e2e

# Chỉ Chrome
npm run test:e2e:chrome

# Chỉ Firefox  
npm run test:e2e:firefox

# Headless (CI/CD)
npm run test:e2e:headless

# Xem report
npm run test:e2e:report
```

## Yêu Cầu
- Frontend đang chạy: `npm run dev` (port 5173)
- Backend đang chạy: port 5001 (cho các test cần auth thật)

## Design Decisions

### Tại sao dùng Playwright thay vì Selenium?
- **Auto-wait**: Playwright tự động chờ element sẵn sàng → ít flaky test hơn
- **Multi-browser**: Chrome, Firefox, WebKit từ 1 config
- **Headless sẵn**: Không cần driver riêng cho CI
- **Screenshot/Video**: Tự động chụp ảnh khi fail

### DriverFactory Pattern
Thay vì hardcode browser trong từng test, DriverFactory centralizes browser configuration — tương đương WebDriverManager trong Selenium Java.

### Page Object Model
Mỗi trang UI có 1 class riêng chứa selectors và actions. Test specs chỉ gọi methods của Page Objects, không biết về selectors chi tiết.
