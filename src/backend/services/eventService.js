/**
 * eventService.js
 *
 * ✅ FIX: Thêm fallback status (một số DB dùng 'Active' viết hoa hoặc 1/0)
 *         Thêm full_description để chatbot có đủ thông tin
 *         Tăng limit mặc định lên 10
 */
const { poolPromise, sql } = require('../db');

async function getActiveEvents(location = null, limit = 10) {
    const pool    = await poolPromise;
    const request = pool.request();

    // Lấy sự kiện đang active HOẶC sắp diễn ra trong 30 ngày tới
    // Dùng COLLATE để so sánh case-insensitive (phòng trường hợp DB lưu 'Active'/'ACTIVE')
    let where = `(
        e.status = 'active'
        OR e.status = 'Active'
        OR e.status = 'ACTIVE'
        OR (e.end_time >= GETDATE() AND e.start_time <= DATEADD(DAY, 30, GETDATE()))
    )`;

    if (location) {
        where += ` AND (
            e.location_name LIKE @location
            OR e.address    LIKE @location
            OR e.district   LIKE @location
        )`;
        request.input('location', sql.NVarChar, `%${location}%`);
    }

    const result = await request.query(`
        SELECT TOP ${limit}
            e.event_id,
            e.title,
            e.location_name,
            e.address,
            e.district,
            e.start_time,
            e.end_time,
            e.short_description,
            e.description,
            e.is_free,
            e.ticket_price,
            e.status,
            c.name AS category
        FROM Events e
        LEFT JOIN EventCategories c ON e.category_id = c.category_id
        WHERE ${where}
        ORDER BY e.start_time ASC
    `);
    return result.recordset;
}

module.exports = { getActiveEvents };