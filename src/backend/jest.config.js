module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/unit/**/*.test.js',
        '**/test/integration/**/*.test.js'
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/uploads/'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    // Đảm bảo jest không cố connect DB thật khi test
    setupFiles: ['./test/setup.js']
};
