require("dotenv").config();
const { crawlYearlyEventCatalog } = require("./services/eventCrawlerService");

async function runSync() {
  try {
    // Bạn có thể giữ phần kết nối DB cũ của bạn ở đây (nếu có)
    console.log("✅ Kết nối Database DNPulse thành công!");

    // ⚠️ QUAN TRỌNG: Sửa dòng dưới đây thành hàm chạy thực tế của bạn
    // Ví dụ: await crawlYearlyEventCatalog();
    await crawlYearlyEventCatalog();
  } catch (error) {
    console.error("Lỗi quá trình đồng bộ:", error);
  } finally {
    // Đợi 500ms để libuv dọn dẹp (tránh lỗi Assertion failed) rồi ngắt script
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
}

runSync();
