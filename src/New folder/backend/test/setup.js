// Global test setup — chạy trước tất cả test files
// Thiết lập biến môi trường cho môi trường test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'dnpulse-test-secret-key-2024';
process.env.JWT_EXPIRES_IN = '1d';

// Tắt console.log và console.error để output gọn hơn
// Uncomment nếu muốn ẩn output:
// global.console.log = jest.fn();
// global.console.error = jest.fn();
// global.console.warn = jest.fn();
