# 🧪 DN-Pulse — Backend Test Suite

## Tổng Quan

Bộ test tự động cho backend DN-Pulse, viết bằng **Jest** và **Supertest**.

---

## Cấu Trúc Test

```
test/
├── setup.js                     # Global setup (env vars)
├── weather.test.js              # Unit test - Weather Client (có sẵn)
├── helpers.test.js              # Unit test - Utility functions
├── auth.middleware.test.js      # Unit test - JWT middleware
├── auth.integration.test.js     # Integration test - Auth API
└── user.integration.test.js     # Integration test - User API
```

---

## Phân Lớp Test (Testing Pyramid)

| Layer | Files | Mô tả |
|---|---|---|
| **Unit** | `helpers.test.js`, `auth.middleware.test.js`, `weather.test.js` | Test từng hàm riêng lẻ, không cần DB |
| **Integration** | `auth.integration.test.js`, `user.integration.test.js` | Test API routes với mock DB |

---

## Cách Chạy Test

### Yêu cầu
- Node.js >= 18
- npm dependencies đã cài: `npm install`

### Lệnh

```bash
# Chạy tất cả tests
npm test

# Chạy với watch mode (dev)
npm run test:watch

# Chạy với báo cáo coverage
npm run test:coverage

# Chạy CI mode (không interactive, exit sau khi xong)
npm run test:ci
```

### Chạy test cụ thể

```bash
# Chỉ chạy unit tests
npx jest test/helpers.test.js
npx jest test/auth.middleware.test.js

# Chỉ chạy integration tests
npx jest test/auth.integration.test.js
npx jest test/user.integration.test.js

# Chạy theo pattern
npx jest --testPathPattern="auth"
```

---

## Design Decisions

### 1. Tại sao dùng Jest + Supertest thay vì framework khác?

- **Jest** là test framework phổ biến nhất cho Node.js, tích hợp sẵn mock, spy, assertion
- **Supertest** cho phép test HTTP requests mà không cần start server thật → test nhanh, không cần port
- Cả hai đã được nhiều dự án production lớn chứng minh độ tin cậy

### 2. Tại sao mock Database?

Dự án dùng **MS SQL Server (MSSQL)** — không thể connect DB thật trong CI/CD vì:
- Tốn thời gian (network latency)
- Cần credentials bảo mật
- Test không deterministc (dữ liệu DB thay đổi)

→ **Giải pháp**: Mock module `../db` trong mỗi test file, control chính xác data trả về.

### 3. Naming Convention cho test cases

Mỗi test case có prefix `TC-[MODULE]-[NUMBER]` để dễ trace khi report:
- `TC-AUTH-01` → Test case Authentication số 1
- `TC-REG-05` → Test case Register số 5
- `TC-PROFILE-03` → Test case Profile số 3

### 4. Coverage Target

| Metric | Target |
|---|---|
| Lines | ≥ 70% |
| Functions | ≥ 70% |
| Branches | ≥ 60% |
| Statements | ≥ 70% |

---

## Xem Báo Cáo Coverage

Sau khi chạy `npm run test:coverage`, mở:

```
coverage/index.html   ← HTML report đẹp
coverage/lcov-report/ ← Detailed per-file report
```

---

## Bug Reports

Các bug phát hiện trong quá trình test được ghi tại:

```
docs/bug-reports/
├── BUG-001.md   # Login không hiển thị lỗi cụ thể khi tài khoản bị khóa
├── BUG-002.md   # Đăng ký không xử lý username trailing whitespace đúng cách
└── BUG-003.md   # Rate limit có thể không hoạt động với Express 5.x
```
