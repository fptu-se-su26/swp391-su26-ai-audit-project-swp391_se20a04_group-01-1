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
              AND e.status IN ('upcoming', 'active')
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
