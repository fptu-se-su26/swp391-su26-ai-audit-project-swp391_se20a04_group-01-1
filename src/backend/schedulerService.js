const cron = require('node-cron');
const { sql, poolPromise } = require('./db');
const weatherClient = require('./utils/weatherClient');

// ============================================================
// HELPER: Tính khoảng cách giữa 2 điểm (Haversine formula) - km
// ============================================================
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// JOB 1: FLOOD ALERT MONITOR (Optimized to fix N+1 queries)
// Chạy mỗi 5 phút — phát hiện FloodZone vừa được kích hoạt
// và tạo thông báo cho tất cả users có avoid_floods = 1
// ============================================================
async function runFloodAlertJob() {
    try {
        const pool = await poolPromise;

        // 1. Lấy các FloodZone đang hoạt động
        const zonesResult = await pool.request().query(`
            SELECT zone_id, zone_name, district, risk_level, description
            FROM FloodZones
            WHERE is_active = 1
        `);

        if (zonesResult.recordset.length === 0) return;

        // 2. Lấy tất cả users có avoid_floods = 1
        const usersResult = await pool.request().query(`
            SELECT u.user_id
            FROM Users u
            INNER JOIN UsersPreferences p ON u.user_id = p.user_id
            WHERE p.avoid_floods = 1
              AND u.is_active = 1
        `);

        if (usersResult.recordset.length === 0) return;

        // 3. Lấy tất cả các thông báo cảnh báo ngập lụt đã gửi trong 6 giờ qua (Chỉ 1 query thay vì N query)
        const sentCheck = await pool.request().query(`
            SELECT user_id, message 
            FROM Notifications
            WHERE type = 'traffic_alert'
              AND message LIKE '%zone_id:%'
              AND created_at >= DATEADD(HOUR, -6, GETDATE())
        `);
        
        const sentSet = new Set();
        for (const row of sentCheck.recordset) {
            const match = row.message.match(/\[zone_id:(\d+)\]/);
            if (match) {
                sentSet.add(`${row.user_id}_${match[1]}`);
            }
        }

        const users = usersResult.recordset;
        const toInsert = [];

        for (const zone of zonesResult.recordset) {
            const riskLabel =
                zone.risk_level === 'High' ? 'CAO 🔴' :
                zone.risk_level === 'Medium' ? 'TRUNG BÌNH 🟠' : 'THẤP 🟡';

            const title = `⚠️ Cảnh báo ngập lụt: ${zone.zone_name}`;
            const message = `Khu vực ${zone.district} đang có nguy cơ ngập lụt mức ${riskLabel}. ${zone.description || 'Hạn chế di chuyển qua khu vực này.'}`;

            for (const user of users) {
                // Kiểm tra bằng Set trong bộ nhớ (O(1) và không query DB trong vòng lặp)
                if (sentSet.has(`${user.user_id}_${zone.zone_id}`)) {
                    continue; // Bỏ qua, đã gửi rồi
                }

                toInsert.push({
                    user_id: user.user_id,
                    event_id: null,
                    alert_id: null,
                    zone_id: zone.zone_id,
                    type: 'traffic_alert',
                    title: title,
                    message: `${message} [zone_id:${zone.zone_id}]`
                });
            }
        }

        // 4. Thực hiện bulk insert thông báo nếu có thông báo mới cần gửi
        if (toInsert.length > 0) {
            const table = new sql.Table('Notifications');
            table.create = false;
            table.columns.add('user_id', sql.Int, { nullable: false });
            table.columns.add('event_id', sql.Int, { nullable: true });
            table.columns.add('alert_id', sql.Int, { nullable: true });
            table.columns.add('zone_id', sql.Int, { nullable: true });
            table.columns.add('title', sql.NVarChar(200), { nullable: true });
            table.columns.add('message', sql.NVarChar(sql.MAX), { nullable: false });
            table.columns.add('is_read', sql.Bit, { nullable: false });
            table.columns.add('created_at', sql.DateTime, { nullable: false });
            table.columns.add('type', sql.NVarChar(30), { nullable: false });

            toInsert.forEach(item => {
                table.rows.add(
                    item.user_id,
                    item.event_id,
                    item.alert_id,
                    item.zone_id,
                    item.title,
                    item.message,
                    false,
                    new Date(),
                    item.type
                );
            });

            await pool.request().bulk(table);
            console.log(`[Scheduler] Flood alert job: Sent ${toInsert.length} notifications to users.`);
        }
    } catch (err) {
        console.error('[Scheduler] Flood alert job error:', err.message);
    }
}

// ============================================================
// JOB 2: EVENT REMINDER (Optimized to fix N+1 queries)
// Chạy mỗi 15 phút — tìm sự kiện sắp bắt đầu trong 1-2 tiếng
// và nhắc users đã yêu thích sự kiện đó
// ============================================================
async function runEventReminderJob() {
    try {
        const pool = await poolPromise;

        // 1. Tìm events sắp bắt đầu trong 60-120 phút tới
        const eventsResult = await pool.request().query(`
            SELECT e.event_id, e.title, e.start_time, e.location_name,
                   e.latitude, e.longitude, e.district
            FROM Events e
            WHERE e.start_time BETWEEN DATEADD(MINUTE, 60, GETDATE())
                                   AND DATEADD(MINUTE, 120, GETDATE())
              AND e.status = 'approved'
        `);

        if (eventsResult.recordset.length === 0) return;

        const eventIds = eventsResult.recordset.map(e => e.event_id);

        // 2. Lấy tất cả users đã yêu thích các sự kiện sắp diễn ra này (Chỉ 1 query duy nhất)
        const favUsersResult = await pool.request().query(`
            SELECT ufe.user_id, ufe.event_id
            FROM UserFavoriteEvents ufe
            INNER JOIN Users u ON ufe.user_id = u.user_id
            WHERE ufe.event_id IN (${eventIds.join(',')})
              AND u.is_active = 1
        `);

        if (favUsersResult.recordset.length === 0) return;

        // Nhóm users theo event_id
        const favUsersMap = new Map();
        for (const row of favUsersResult.recordset) {
            if (!favUsersMap.has(row.event_id)) {
                favUsersMap.set(row.event_id, []);
            }
            favUsersMap.get(row.event_id).push(row.user_id);
        }

        // 3. Lấy tất cả cảnh báo giao thông đang hoạt động một lần duy nhất
        const trafficResult = await pool.request().query(`
            SELECT title, severity, location_name, latitude, longitude
            FROM TrafficAlerts
            WHERE is_active = 1
        `);
        const activeAlerts = trafficResult.recordset;

        // 4. Lấy tất cả các thông báo nhắc nhở đã được gửi cho các sự kiện này trong 3 giờ qua
        const sentCheckResult = await pool.request().query(`
            SELECT user_id, event_id
            FROM Notifications
            WHERE type = 'event_reminder'
              AND event_id IN (${eventIds.join(',')})
              AND created_at >= DATEADD(HOUR, -3, GETDATE())
        `);
        
        const sentReminderSet = new Set();
        for (const row of sentCheckResult.recordset) {
            sentReminderSet.add(`${row.user_id}_${row.event_id}`);
        }

        const toInsert = [];

        for (const event of eventsResult.recordset) {
            const eventUserIds = favUsersMap.get(event.event_id) || [];
            if (eventUserIds.length === 0) continue;

            // Tìm cảnh báo giao thông gần sự kiện (bán kính ~1.5km) trong bộ nhớ
            let trafficWarning = '';
            if (event.latitude && event.longitude) {
                const nearbyAlerts = activeAlerts.filter(alert =>
                    haversineKm(event.latitude, event.longitude, alert.latitude, alert.longitude) <= 1.5
                );

                if (nearbyAlerts.length > 0) {
                    const alertNames = nearbyAlerts.map(a => a.title).join(', ');
                    trafficWarning = ` ⚠️ Lưu ý: Có ${nearbyAlerts.length} điểm ùn tắc gần địa điểm (${alertNames}).`;
                }
            }

            // Format thời gian
            const startTime = new Date(event.start_time);
            const timeStr = startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const title = `📅 Sắp diễn ra: ${event.title}`;
            const message = `Sự kiện tại ${event.location_name || event.district} bắt đầu lúc ${timeStr}.${trafficWarning}`;

            for (const userId of eventUserIds) {
                // Kiểm tra trùng lặp trong bộ nhớ
                if (sentReminderSet.has(`${userId}_${event.event_id}`)) {
                    continue;
                }

                toInsert.push({
                    user_id: userId,
                    event_id: event.event_id,
                    alert_id: null,
                    zone_id: null,
                    type: 'event_reminder',
                    title: title,
                    message: message
                });
            }
        }

        // 5. Thực hiện bulk insert các thông báo nhắc nhở sự kiện
        if (toInsert.length > 0) {
            const table = new sql.Table('Notifications');
            table.create = false;
            table.columns.add('user_id', sql.Int, { nullable: false });
            table.columns.add('event_id', sql.Int, { nullable: true });
            table.columns.add('alert_id', sql.Int, { nullable: true });
            table.columns.add('zone_id', sql.Int, { nullable: true });
            table.columns.add('title', sql.NVarChar(200), { nullable: true });
            table.columns.add('message', sql.NVarChar(sql.MAX), { nullable: false });
            table.columns.add('is_read', sql.Bit, { nullable: false });
            table.columns.add('created_at', sql.DateTime, { nullable: false });
            table.columns.add('type', sql.NVarChar(30), { nullable: false });

            toInsert.forEach(item => {
                table.rows.add(
                    item.user_id,
                    item.event_id,
                    item.alert_id,
                    item.zone_id,
                    item.title,
                    item.message,
                    false,
                    new Date(),
                    item.type
                );
            });

            await pool.request().bulk(table);
            console.log(`[Scheduler] Event reminder job: Sent ${toInsert.length} reminders.`);
        }
    } catch (err) {
        console.error('[Scheduler] Event reminder job error:', err.message);
    }
}

// ============================================================
// JOB 3: WEATHER PREDICTIVE WARNING JOB
// Chạy mỗi 5 phút — Gọi weather client và kiểm tra lượng mưa
// ============================================================
async function runWeatherAlertJob() {
    try {
        const pool = await poolPromise;
        const districts = weatherClient.getSupportedDistricts();
        
        // Lấy admin user ID làm người tạo cảnh báo giao thông mặc định
        const adminResult = await pool.request().query(`
            SELECT TOP 1 user_id FROM Users WHERE role = 'admin' ORDER BY user_id ASC
        `);
        const adminId = adminResult.recordset.length > 0 ? adminResult.recordset[0].user_id : 1;

        for (const district of districts) {
            const weather = await weatherClient.getWeatherForDistrict(district);
            const districtCoords = weatherClient.DISTRICTS[district];
            const hasHeavyRain = weather.rain1h > 50;

            // Kiểm tra xem đã có cảnh báo ngập lụt sớm đang hoạt động cho quận này chưa
            const checkAlertResult = await pool.request()
                .input('location_name', sql.NVarChar, `Quận ${district}`)
                .input('title', sql.NVarChar, '⚠️ Cảnh báo ngập lụt sớm')
                .query(`
                    SELECT alert_id 
                    FROM TrafficAlerts 
                    WHERE title = @title AND location_name = @location_name AND is_active = 1
                `);

            const existingAlert = checkAlertResult.recordset[0];

            if (hasHeavyRain) {
                const alertTitle = '⚠️ Cảnh báo ngập lụt sớm';
                const alertDesc = `Khu vực Quận ${district} đang có mưa rất lớn (${weather.rain1h} mm/h), các tuyến đường xung quanh có nguy cơ ngập cao trong 30 phút tới. Hãy chuẩn bị lộ trình thay thế.`;
                
                let alertId;
                
                if (!existingAlert) {
                    // Tạo TrafficAlert mới
                    const insertAlertResult = await pool.request()
                        .input('created_by', sql.Int, adminId)
                        .input('alert_type', sql.NVarChar, 'FLOOD')
                        .input('title', sql.NVarChar, alertTitle)
                        .input('description', sql.NVarChar, alertDesc)
                        .input('location_name', sql.NVarChar, `Quận ${district}`)
                        .input('latitude', sql.Decimal(9, 6), districtCoords.lat)
                        .input('longitude', sql.Decimal(9, 6), districtCoords.lon)
                        .input('severity', sql.NVarChar, 'High')
                        .query(`
                            INSERT INTO TrafficAlerts (
                                created_by, alert_type, title, description,
                                location_name, latitude, longitude, severity, is_active, created_at, updated_at
                            )
                            OUTPUT INSERTED.alert_id
                            VALUES (
                                @created_by, @alert_type, @title, @description,
                                @location_name, @latitude, @longitude, @severity, 1, GETDATE(), GETDATE()
                            )
                        `);
                    
                    alertId = insertAlertResult.recordset[0].alert_id;
                    console.log(`[Scheduler] Created weather warning for ${district} (alert_id: ${alertId})`);
                    
                    // Gửi thông báo cho tất cả người dùng có avoid_floods = 1
                    const usersResult = await pool.request().query(`
                        SELECT u.user_id
                        FROM Users u
                        INNER JOIN UsersPreferences p ON u.user_id = p.user_id
                        WHERE p.avoid_floods = 1 AND u.is_active = 1
                    `);
                    
                    if (usersResult.recordset.length > 0) {
                        const table = new sql.Table('Notifications');
                        table.create = false;
                        table.columns.add('user_id', sql.Int, { nullable: false });
                        table.columns.add('event_id', sql.Int, { nullable: true });
                        table.columns.add('alert_id', sql.Int, { nullable: true });
                        table.columns.add('zone_id', sql.Int, { nullable: true });
                        table.columns.add('title', sql.NVarChar(200), { nullable: true });
                        table.columns.add('message', sql.NVarChar(sql.MAX), { nullable: false });
                        table.columns.add('is_read', sql.Bit, { nullable: false });
                        table.columns.add('created_at', sql.DateTime, { nullable: false });
                        table.columns.add('type', sql.NVarChar(30), { nullable: false });

                        usersResult.recordset.forEach(user => {
                            table.rows.add(
                                user.user_id,
                                null,
                                alertId,
                                null,
                                alertTitle,
                                alertDesc,
                                false,
                                new Date(),
                                'traffic_alert'
                            );
                        });

                        await pool.request().bulk(table);
                        console.log(`[Scheduler] Sent predictive flood notifications to ${usersResult.recordset.length} users.`);
                    }
                } else {
                    // Nếu cảnh báo đã tồn tại nhưng mưa vẫn lớn, cập nhật thời gian updated_at
                    alertId = existingAlert.alert_id;
                    await pool.request()
                        .input('alert_id', sql.Int, alertId)
                        .input('description', sql.NVarChar, alertDesc)
                        .query(`
                            UPDATE TrafficAlerts 
                            SET updated_at = GETDATE(), description = @description
                            WHERE alert_id = @alert_id
                        `);
                }
            } else {
                // Nếu mưa dưới 50 mm/h hoặc không mưa, và đang có cảnh báo hoạt động -> tắt cảnh báo
                if (existingAlert) {
                    await pool.request()
                        .input('alert_id', sql.Int, existingAlert.alert_id)
                        .query(`
                            UPDATE TrafficAlerts 
                            SET is_active = 0, end_time = GETDATE(), updated_at = GETDATE()
                            WHERE alert_id = @alert_id
                        `);
                    console.log(`[Scheduler] Cleared weather warning for ${district} because rain stopped.`);
                }
            }
        }
    } catch (err) {
        console.error('[Scheduler] Weather alert job error:', err.message);
    }
}

// ============================================================
// KHỞI ĐỘNG CÁC CRON JOBS
// ============================================================
function startScheduler() {
    // Job 1: Flood Monitor — mỗi 5 phút
    cron.schedule('*/5 * * * *', () => {
        console.log('[Scheduler] Running flood alert check...');
        runFloodAlertJob();
    });

    // Job 2: Event Reminder — mỗi 15 phút
    cron.schedule('*/15 * * * *', () => {
        console.log('[Scheduler] Running event reminder check...');
        runEventReminderJob();
    });

    // Job 3: Weather Forecast & Predictive Warning — mỗi 5 phút
    cron.schedule('*/5 * * * *', () => {
        console.log('[Scheduler] Running weather alert check...');
        runWeatherAlertJob();
    });

    console.log('✅ [Scheduler] Smart Notification jobs started (Flood: 5m, Event: 15m, Weather: 5m)');
}

module.exports = { 
    startScheduler, 
    runFloodAlertJob, 
    runEventReminderJob,
    runWeatherAlertJob
};
