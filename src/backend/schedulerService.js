const cron = require('node-cron');
const { sql, poolPromise } = require('./db');

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
// JOB 1: FLOOD ALERT MONITOR
// Chạy mỗi 5 phút — phát hiện FloodZone vừa được kích hoạt
// và tạo thông báo cho tất cả users có avoid_floods = 1
// ============================================================
async function runFloodAlertJob() {
    try {
        const pool = await poolPromise;

        // Lấy các FloodZone đang hoạt động
        const zonesResult = await pool.request().query(`
            SELECT zone_id, zone_name, district, risk_level, description
            FROM FloodZones
            WHERE is_active = 1
        `);

        if (zonesResult.recordset.length === 0) return;

        // Lấy tất cả users có avoid_floods = 1
        const usersResult = await pool.request().query(`
            SELECT u.user_id
            FROM Users u
            INNER JOIN UsersPreferences p ON u.user_id = p.user_id
            WHERE p.avoid_floods = 1
              AND u.is_active = 1
        `);

        if (usersResult.recordset.length === 0) return;

        const users = usersResult.recordset;

        for (const zone of zonesResult.recordset) {
            const riskLabel =
                zone.risk_level === 'High' ? 'CAO 🔴' :
                zone.risk_level === 'Medium' ? 'TRUNG BÌNH 🟠' : 'THẤP 🟡';

            const title = `⚠️ Cảnh báo ngập lụt: ${zone.zone_name}`;
            const message = `Khu vực ${zone.district} đang có nguy cơ ngập lụt mức ${riskLabel}. ${zone.description || 'Hạn chế di chuyển qua khu vực này.'}`;

            for (const user of users) {
                // Kiểm tra xem user đã nhận thông báo cho zone này trong 6 giờ chưa
                const existCheck = await pool.request()
                    .input('user_id', sql.Int, user.user_id)
                    .input('zone_id_str', sql.NVarChar, String(zone.zone_id))
                    .query(`
                        SELECT TOP 1 notification_id
                        FROM Notifications
                        WHERE user_id = @user_id
                          AND type = 'traffic_alert'
                          AND message LIKE '%zone_id:' + @zone_id_str + '%'
                          AND created_at >= DATEADD(HOUR, -6, GETDATE())
                    `);

                if (existCheck.recordset.length > 0) continue; // Bỏ qua, đã gửi rồi

                await pool.request()
                    .input('user_id', sql.Int, user.user_id)
                    .input('type', sql.NVarChar, 'traffic_alert')
                    .input('title', sql.NVarChar, title)
                    .input('message', sql.NVarChar, `${message} [zone_id:${zone.zone_id}]`)
                    .query(`
                        INSERT INTO Notifications (user_id, type, title, message, is_read, created_at)
                        VALUES (@user_id, @type, @title, @message, 0, GETDATE())
                    `);
            }
            console.log(`[Scheduler] Flood alert created for zone: ${zone.zone_name} → ${users.length} users`);
        }
    } catch (err) {
        console.error('[Scheduler] Flood alert job error:', err.message);
    }
}

// ============================================================
// JOB 2: EVENT REMINDER
// Chạy mỗi 15 phút — tìm sự kiện sắp bắt đầu trong 1-2 tiếng
// và nhắc users đã yêu thích sự kiện đó
// ============================================================
async function runEventReminderJob() {
    try {
        const pool = await poolPromise;

        // Tìm events sắp bắt đầu trong 60-120 phút tới
        const eventsResult = await pool.request().query(`
            SELECT e.event_id, e.title, e.start_time, e.location_name,
                   e.latitude, e.longitude, e.district
            FROM Events e
            WHERE e.start_time BETWEEN DATEADD(MINUTE, 60, GETDATE())
                                   AND DATEADD(MINUTE, 120, GETDATE())
              AND e.status IN ('upcoming', 'active')
        `);

        if (eventsResult.recordset.length === 0) return;

        for (const event of eventsResult.recordset) {
            // Lấy users đã yêu thích event này
            const favUsersResult = await pool.request()
                .input('event_id', sql.Int, event.event_id)
                .query(`
                    SELECT ufe.user_id
                    FROM UserFavoriteEvents ufe
                    INNER JOIN Users u ON ufe.user_id = u.user_id
                    WHERE ufe.event_id = @event_id
                      AND u.is_active = 1
                `);

            if (favUsersResult.recordset.length === 0) continue;

            // Tìm cảnh báo giao thông gần sự kiện (bán kính ~1.5km)
            let trafficWarning = '';
            if (event.latitude && event.longitude) {
                const trafficResult = await pool.request().query(`
                    SELECT TOP 5 title, severity, location_name, latitude, longitude
                    FROM TrafficAlerts
                    WHERE is_active = 1
                `);

                const nearbyAlerts = trafficResult.recordset.filter(alert =>
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

            for (const favUser of favUsersResult.recordset) {
                // Kiểm tra xem đã nhắc event này cho user này chưa
                const existCheck = await pool.request()
                    .input('user_id', sql.Int, favUser.user_id)
                    .input('event_id', sql.Int, event.event_id)
                    .query(`
                        SELECT TOP 1 notification_id
                        FROM Notifications
                        WHERE user_id = @user_id
                          AND event_id = @event_id
                          AND type = 'event_reminder'
                          AND created_at >= DATEADD(HOUR, -3, GETDATE())
                    `);

                if (existCheck.recordset.length > 0) continue;

                await pool.request()
                    .input('user_id', sql.Int, favUser.user_id)
                    .input('event_id', sql.Int, event.event_id)
                    .input('type', sql.NVarChar, 'event_reminder')
                    .input('title', sql.NVarChar, title)
                    .input('message', sql.NVarChar, message)
                    .query(`
                        INSERT INTO Notifications (user_id, event_id, type, title, message, is_read, created_at)
                        VALUES (@user_id, @event_id, @type, @title, @message, 0, GETDATE())
                    `);
            }
            console.log(`[Scheduler] Event reminder sent for: ${event.title} → ${favUsersResult.recordset.length} users`);
        }
    } catch (err) {
        console.error('[Scheduler] Event reminder job error:', err.message);
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

    console.log('✅ [Scheduler] Smart Notification jobs started (Flood: 5m, Event: 15m)');
}

module.exports = { startScheduler, runFloodAlertJob, runEventReminderJob };
