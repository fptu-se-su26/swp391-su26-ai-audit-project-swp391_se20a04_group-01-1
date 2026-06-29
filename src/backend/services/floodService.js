/**
 * floodService.js
 */
const { poolPromise, sql } = require('../db');

async function getActiveFloodZones(location = null, limit = 8) {
    const pool = await poolPromise;
    const request = pool.request();

    let where = `is_active = 1`;
    if (location) {
        where += ` AND (zone_name LIKE @location OR district LIKE @location OR description LIKE @location)`;
        request.input('location', sql.NVarChar, `%${location}%`);
    }

    const result = await request.query(`
        SELECT TOP ${limit}
            zone_name,
            district,
            risk_level,
            description,
            depth_cm,
            typical_flood_months
        FROM FloodZones
        WHERE ${where}
        ORDER BY 
            CASE risk_level WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END
    `);
    return result.recordset;
}

module.exports = { getActiveFloodZones };