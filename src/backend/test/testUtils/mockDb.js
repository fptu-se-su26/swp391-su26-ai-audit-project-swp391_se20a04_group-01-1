/**
 * Helper dùng chung để giả lập mssql pool.request().input(...).query(...)
 *
 * Cách dùng trong 1 test file:
 *
 *   jest.mock('../db', () => require('./testUtils/mockDb').mockDbModule());
 *   const { __mockQuery } = require('../db');
 *
 *   __mockQuery.mockResolvedValueOnce({ recordset: [...], rowsAffected: [1] });
 *
 * Mỗi lần route gọi pool.request()...query(...), nó sẽ tiêu thụ 1 giá trị
 * trong hàng đợi mockResolvedValueOnce theo đúng thứ tự gọi trong code.
 */

function buildMockPool() {
    const mockQuery = jest.fn();

    const requestObj = {
        input: jest.fn().mockReturnThis(),
        query: mockQuery,
        bulk: jest.fn().mockResolvedValue({}),
    };

    const pool = {
        request: jest.fn(() => requestObj),
    };

    return { pool, mockQuery, requestObj };
}

// Giả lập module `mssql` (named export `sql`) - chỉ cần đủ để route code không crash
// khi gọi sql.NVarChar, sql.Int, sql.Bit, sql.Decimal(...), sql.DateTime, sql.Time, sql.MAX, sql.Table...
function buildMockSql() {
    const typeFn = (...args) => `TYPE(${args.join(",")})`;
    return {
        NVarChar: typeFn,
        Int: "Int",
        Bit: "Bit",
        DateTime: "DateTime",
        Time: "Time",
        Decimal: (...args) => `Decimal(${args.join(",")})`,
        MAX: "MAX",
        Table: jest.fn().mockImplementation(function (name) {
            this.name = name;
            this.create = true;
            this.columns = { add: jest.fn() };
            this.rows = { add: jest.fn() };
        }),
    };
}

/**
 * Trả về object để dùng làm factory cho jest.mock('../db', factory)
 * Đính kèm __mockQuery / __pool để test có thể truy cập trực tiếp.
 */
function mockDbModule() {
    const { pool, mockQuery, requestObj } = buildMockPool();
    return {
        sql: buildMockSql(),
        poolPromise: Promise.resolve(pool),
        __mockQuery: mockQuery,
        __pool: pool,
        __requestObj: requestObj,
    };
}

module.exports = { buildMockPool, buildMockSql, mockDbModule };