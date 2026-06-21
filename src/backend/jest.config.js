module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    "server.js",
    "controllers/**/*.js",
    "routes/**/*.js",        // Nên thêm cả routes để coverage đầy đủ
    "middleware/**/*.js",
    "emailService.js",
    "db.js",
    "!**/node_modules/**",   // Loại trừ thư viện
    "!**/test/**",           // Loại trừ chính file test
    "!**/coverage/**"        // Loại trừ báo cáo coverage
  ],
  testEnvironment: "node"
};