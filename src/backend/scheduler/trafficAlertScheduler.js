const { poolPromise } = require("../db");

const INTERVAL = 60 * 1000;
let schedulerInterval = null;

async function expireTrafficAlerts() {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      UPDATE TrafficAlerts
      SET
        is_active = 0,
        updated_at = GETDATE()
      WHERE
        is_active = 1
        AND expire_at IS NOT NULL
        AND expire_at <= GETDATE()
    `);

    const affectedRows = result.rowsAffected?.[0] || 0;

    if (affectedRows > 0) {
      console.log(`[Traffic Scheduler] Đã hết hạn ${affectedRows} cảnh báo.`);
    }
  } catch (error) {
    console.error("[Traffic Scheduler] Error:", error.message);
  }
}

function startTrafficAlertScheduler() {
  if (schedulerInterval) {
    console.log("[Traffic Scheduler] Scheduler đã chạy trước đó.");
    return;
  }

  console.log("[Traffic Scheduler] Started");

  expireTrafficAlerts();

  schedulerInterval = setInterval(expireTrafficAlerts, INTERVAL);
}

module.exports = {
  startTrafficAlertScheduler,
};
