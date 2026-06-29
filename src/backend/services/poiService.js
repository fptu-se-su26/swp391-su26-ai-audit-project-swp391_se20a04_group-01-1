/**
 * poiService.js
 */
const { poolPromise, sql } = require('../db');

/**
 * Tính khoảng cách Haversine (km) ngay trong SQL Server
 * Trả về biểu thức SQL dưới dạng chuỗi
 */
function haversineSQL(latParam, lngParam) {
    return `(
        6371 * 2 * ATN2(
            SQRT(
                POWER(SIN(RADIANS((p.latitude  - ${latParam}) / 2)), 2) +
                COS(RADIANS(${latParam})) * COS(RADIANS(p.latitude)) *
                POWER(SIN(RADIANS((p.longitude - ${lngParam}) / 2)), 2)
            ),
            SQRT(1 - (
                POWER(SIN(RADIANS((p.latitude  - ${latParam}) / 2)), 2) +
                COS(RADIANS(${latParam})) * COS(RADIANS(p.latitude)) *
                POWER(SIN(RADIANS((p.longitude - ${lngParam}) / 2)), 2)
            ))
        )
    )`;
}

/**
 * Tìm kiếm POI theo keyword và/hoặc location
 * Hỗ trợ sắp xếp theo khoảng cách nếu có tọa độ user
 * @param {object} options
 * @param {string|null}  options.keyword
 * @param {string|null}  options.location
 * @param {string}       options.sortBy        'rating' | 'distance' | 'default'
 * @param {number}       options.limit
 * @param {number}       options.offset
 * @param {number|null}  options.userLat       vĩ độ người dùng (cho distance sort)
 * @param {number|null}  options.userLng       kinh độ người dùng (cho distance sort)
 */
async function searchPOIs({ keyword = null, location = null, sortBy = 'default', limit = 8, offset = 0, userLat = null, userLng = null }) {
    const pool = await poolPromise;
    const request = pool.request();

    let whereConditions = ['p.is_active = 1'];

    if (keyword) {
        // Tìm trong tên, mô tả VÀ tên category → bắt được "ATM", "Bảo tàng", v.v.
        whereConditions.push(`(
            p.name        LIKE @keyword
            OR p.description LIKE @keyword
            OR c.name     LIKE @keyword
        )`);
        request.input('keyword', sql.NVarChar, `%${keyword}%`);
    }

    if (location) {
        whereConditions.push(`(
            p.address     LIKE @location
            OR p.description LIKE @location
        )`);
        request.input('location', sql.NVarChar, `%${location}%`);
    }

    // --- Xây dựng ORDER BY ---
    let distanceExpr = null;
    let orderClause;

    const hasCoords = userLat != null && userLng != null;

    if (sortBy === 'distance' && hasCoords) {
        request.input('userLat', sql.Float, userLat);
        request.input('userLng', sql.Float, userLng);
        distanceExpr = haversineSQL('@userLat', '@userLng');
        orderClause = `distance_km ASC, p.rating DESC`;
    } else if (sortBy === 'rating') {
        orderClause = `p.rating DESC, p.is_featured DESC`;
    } else {
        // 'default' hoặc distance nhưng không có tọa độ
        orderClause = `p.is_featured DESC, p.rating DESC`;
    }

    const distanceSelect = distanceExpr
        ? `, ${distanceExpr} AS distance_km`
        : `, NULL AS distance_km`;

    const query = `
        SELECT
            p.poi_id,
            p.name,
            p.address,
            p.latitude,
            p.longitude,
            p.description,
            p.rating,
            p.phone_number,
            p.website_url,
            p.is_featured,
            p.opening_hours,
            p.ticket_price,
            c.name AS category
            ${distanceSelect}
        FROM POIs p
        LEFT JOIN POIsCategories c ON p.category_id = c.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${orderClause}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const result = await request.query(query);
    return result.recordset;
}

/**
 * Đếm tổng số POI theo filter
 */
async function countPOIs({ keyword = null, location = null }) {
    const pool = await poolPromise;
    const request = pool.request();

    let whereConditions = ['p.is_active = 1'];

    if (keyword) {
        whereConditions.push(`(p.name LIKE @keyword OR p.description LIKE @keyword OR c.name LIKE @keyword)`);
        request.input('keyword', sql.NVarChar, `%${keyword}%`);
    }

    if (location) {
        whereConditions.push(`(p.address LIKE @location OR p.description LIKE @location)`);
        request.input('location', sql.NVarChar, `%${location}%`);
    }

    const result = await request.query(`
        SELECT COUNT(*) AS total
        FROM POIs p
        LEFT JOIN POIsCategories c ON p.category_id = c.id
        WHERE ${whereConditions.join(' AND ')}
    `);

    return result.recordset[0]?.total || 0;
}

/**
 * Lấy tất cả POI active (khi user hỏi chung chung)
 */
async function getAllActivePOIs({ sortBy = 'rating', limit = 8, offset = 0, userLat = null, userLng = null } = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    let distanceExpr = null;
    let orderClause;

    const hasCoords = userLat != null && userLng != null;

    if (sortBy === 'distance' && hasCoords) {
        request.input('userLat', sql.Float, userLat);
        request.input('userLng', sql.Float, userLng);
        distanceExpr = haversineSQL('@userLat', '@userLng');
        orderClause = `distance_km ASC, p.rating DESC`;
    } else if (sortBy === 'rating') {
        orderClause = `p.rating DESC, p.is_featured DESC`;
    } else {
        orderClause = `p.is_featured DESC, p.rating DESC`;
    }

    const distanceSelect = distanceExpr
        ? `, ${distanceExpr} AS distance_km`
        : `, NULL AS distance_km`;

    const result = await request.query(`
        SELECT
            p.poi_id, p.name, p.address, p.latitude, p.longitude,
            p.rating, p.description, p.phone_number, p.is_featured,
            p.opening_hours, p.ticket_price,
            c.name AS category
            ${distanceSelect}
        FROM POIs p
        LEFT JOIN POIsCategories c ON p.category_id = c.id
        WHERE p.is_active = 1
        ORDER BY ${orderClause}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);
    return result.recordset;
}

async function countAllActivePOIs() {
    const pool = await poolPromise;
    const result = await pool.request().query(
        `SELECT COUNT(*) AS total FROM POIs WHERE is_active = 1`
    );
    return result.recordset[0]?.total || 0;
}

module.exports = { searchPOIs, countPOIs, getAllActivePOIs, countAllActivePOIs };