/**
 * trafficService.js
 */
const { poolPromise, sql } = require('../db');

async function getActiveTrafficAlerts(location = null, limit = 8) {
    const pool = await poolPromise;
    const request = pool.request();

    let where = `ta.is_active = 1`;
    if (location) {
        where += ` AND (ta.location_name LIKE @location OR ta.description LIKE @location)`;
        request.input('location', sql.NVarChar, `%${location}%`);
    }

    const result = await request.query(`
        SELECT TOP ${limit}
            ta.title,
            ta.description,
            ta.location_name,
            ta.alert_type,
            ta.severity,
            ta.created_at
        FROM TrafficAlerts ta
        WHERE ${where}
        ORDER BY 
            CASE ta.severity WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
            ta.created_at DESC
    `);
    return result.recordset;
}

module.exports = { getActiveTrafficAlerts };