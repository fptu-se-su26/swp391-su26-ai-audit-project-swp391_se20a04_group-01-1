// backend/test/db.test.js
const mockConnect = jest.fn();

// Mock mssql ngay từ đầu với cấu trúc giữ nguyên hàm connect
jest.mock('mssql', () => {
    return {
        ConnectionPool: jest.fn().mockImplementation(() => ({
            connect: () => mockConnect()
        }))
    };
});

describe('Database Connection (db.js)', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        mockConnect.mockReset();
    });

    test('Kết nối Database thành công (Chạy vào .then)', async () => {
        // Giả lập kết nối thành công trả về 'mocked_pool'
        mockConnect.mockResolvedValueOnce('mocked_pool');

        let poolPromise;
        // Dùng isolateModules để nạp lại file db.js một cách an toàn mà không phá hỏng cấu trúc mock
        jest.isolateModules(() => {
            const db = require('../db');
            poolPromise = db.poolPromise;
        });

        const pool = await poolPromise;
        expect(pool).toBe('mocked_pool');
        expect(console.log).toHaveBeenCalledWith('✅ Kết nối Database DNPulse thành công!');
    });

    test('Kết nối Database thất bại (Chạy vào .catch - Dòng 22, 23)', async () => {
        // Giả lập sập database (Connection Timeout)
        const dbError = new Error("Connection Timeout");
        mockConnect.mockRejectedValueOnce(dbError);

        let poolPromise;
        jest.isolateModules(() => {
            const db = require('../db');
            poolPromise = db.poolPromise;
        });

        // Kiểm tra xem nó có văng ra đúng lỗi đó không và có in ra console.error không
        await expect(poolPromise).rejects.toThrow("Connection Timeout");
        expect(console.error).toHaveBeenCalledWith('❌ Lỗi kết nối Database:', 'Connection Timeout');
    });
});