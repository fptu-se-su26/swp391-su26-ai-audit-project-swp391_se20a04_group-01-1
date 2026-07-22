const { sql, poolPromise } = require("../db");
const {
  fetchEventLinksFromListing,
  scrapeAndExtractEventDetail,
  crawlYearlyEventCatalog,
} = require("./eventCrawlerService");
const axios = require("axios");

const YEARLY_CATALOG_URL =
  "https://danangfantasticity.com/en/le-hoi-su-kien/danh-muc-su-kien-va-le-hoi-da-nang-nam-2026";

const DEFAULT_SYSTEM_USER_ID = 1; // ID hệ thống / admin mặc định dùng làm created_by

// ==========================================
// Chuẩn hoá tiêu đề để so sánh trùng lặp (bỏ dấu, khoảng trắng thừa, chữ hoa/thường)
// ==========================================
function normalizeTitle(title) {
  return (title || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
function datesDiffer(oldValue, newValue) {
  const oldDate = safeDate(oldValue);
  const newDate = safeDate(newValue);

  if (!oldDate && !newDate) return false;
  if (!oldDate || !newDate) return true;

  return oldDate.getTime() !== newDate.getTime();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}
// ==========================================
// Lấy toạ độ từ Mapbox Geocoding dựa trên địa chỉ / tên địa điểm
// ==========================================
async function geocodeAddress(eventData) {
  const mapboxToken = process.env.VITE_MAPBOX_ACCESS_TOKEN || "";
  const fullAddress = `${eventData.address || eventData.location_name || ""}, ${
    eventData.district || ""
  }, Đà Nẵng, Việt Nam`;

  let lat = 16.0544,
    lng = 108.2022; // Mặc định trung tâm Đà Nẵng nếu không tìm thấy

  if (mapboxToken) {
    try {
      const geoRes = await axios.get(
        `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
          fullAddress,
        )}&access_token=${mapboxToken}&limit=1`,
      );
      if (geoRes.data?.features?.length > 0) {
        [lng, lat] = geoRes.data.features[0].geometry.coordinates;
      }
    } catch (e) {
      console.error("Lỗi Mapbox Geocoding:", e.message);
    }
  }

  return { lat, lng };
}

// ==========================================
// Tìm event_id tương ứng trong bảng EventCategories theo tên category do AI trả về
// ==========================================
async function resolveCategoryId(pool, categoryName) {
  const catQuery = await pool
    .request()
    .input("catName", sql.NVarChar, categoryName || "Lễ hội")
    .query(`SELECT category_id FROM EventCategories WHERE name = @catName`);

  return catQuery.recordset.length > 0 ? catQuery.recordset[0].category_id : 1;
}

// ==========================================
// Tìm 1 sự kiện đã tồn tại trong DB "trùng" với dữ liệu vừa cào được.
// Ưu tiên so khớp theo tiêu đề đã chuẩn hoá; nếu không khớp tuyệt đối,
// thử so khớp gần đúng (chứa nhau) kết hợp thời gian bắt đầu cùng ngày.
// ==========================================
async function findExistingEvent(pool, eventData) {
  const result = await pool
    .request()
    .input("title", sql.NVarChar, eventData.title)
    .input("start_time", sql.DateTime, safeDate(eventData.start_time))
    .query(
      `SELECT event_id, title, description, short_description,
          location_name, address, district,
          start_time, end_time,
          banner_url, ticket_price, is_free, status
   FROM Events
   WHERE title = @title`,
    );

  if (result.recordset.length > 0) return result.recordset[0];

  // So khớp gần đúng: lấy các event có start_time trong cùng ngày, rồi so tiêu đề đã chuẩn hoá
  const startDate = safeDate(eventData.start_time);
  if (!startDate) return null;

  const dayResult = await pool
    .request()
    .input("start_time", sql.DateTime, startDate)
    .query(
      `SELECT event_id, title, description, short_description,
          location_name, address, district,
          start_time, end_time,
          banner_url, ticket_price, is_free, status
   FROM Events
   WHERE CAST(start_time AS DATE) = CAST(@start_time AS DATE)`,
    );

  const normNew = normalizeTitle(eventData.title);
  for (const row of dayResult.recordset) {
    const normExisting = normalizeTitle(row.title);
    if (
      normExisting &&
      normNew &&
      (normExisting.includes(normNew) || normNew.includes(normExisting))
    ) {
      return row;
    }
  }

  return null;
}

// ==========================================
// So sánh dữ liệu mới cào được với dữ liệu hiện có để xác định có cần UPDATE không
// (vd: mô tả dài/chi tiết hơn, thời gian kết thúc thay đổi, có thêm ảnh, đổi giá vé...)
// ==========================================
function hasMeaningfulUpdate(existingRow, newData) {
  // Không so sánh description vì AI có thể sinh câu chữ khác nhau.

  if (datesDiffer(existingRow.start_time, newData.start_time)) {
    console.log("[UPDATE CHECK] Phát hiện thay đổi start_time");
    return true;
  }

  if (datesDiffer(existingRow.end_time, newData.end_time)) {
    console.log("[UPDATE CHECK] Phát hiện thay đổi end_time");
    return true;
  }

  const textFields = ["location_name", "address", "district"];

  for (const field of textFields) {
    const oldValue = normalizeText(existingRow[field]);
    const newValue = normalizeText(newData[field]);

    if (newValue && newValue !== oldValue) {
      console.log(
        `[UPDATE CHECK] Phát hiện thay đổi ${field}:`,
        `"${oldValue}" -> "${newValue}"`,
      );
      return true;
    }
  }

  const oldIsFree = normalizeBoolean(existingRow.is_free);
  const newIsFree = normalizeBoolean(newData.is_free);

  if (newIsFree !== null && newIsFree !== oldIsFree) {
    console.log(
      "[UPDATE CHECK] Phát hiện thay đổi is_free:",
      oldIsFree,
      "->",
      newIsFree,
    );
    return true;
  }

  if (
    newData.ticket_price !== null &&
    newData.ticket_price !== undefined &&
    newData.ticket_price !== ""
  ) {
    const oldPrice =
      existingRow.ticket_price === null ||
      existingRow.ticket_price === undefined
        ? null
        : Number(existingRow.ticket_price);

    const newPrice = Number(newData.ticket_price);

    if (!Number.isNaN(newPrice) && newPrice !== oldPrice) {
      console.log(
        "[UPDATE CHECK] Phát hiện thay đổi ticket_price:",
        oldPrice,
        "->",
        newPrice,
      );
      return true;
    }
  }

  const oldBanner = normalizeText(existingRow.banner_url);
  const newBanner = normalizeText(newData.banner_url);

  // Chỉ bổ sung banner khi DB chưa có.
  if (newBanner && !oldBanner) {
    console.log("[UPDATE CHECK] Bổ sung banner_url còn thiếu");
    return true;
  }

  return false;
}

// ==========================================
// Lưu (thêm mới) ảnh cào được vào bảng EventImages, tránh trùng image_url
// ==========================================
async function saveEventImages(pool, eventId, imageUrls = []) {
  if (!imageUrls || imageUrls.length === 0) return;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    if (!url) continue;

    const existing = await pool
      .request()
      .input("event_id", sql.Int, eventId)
      .input("image_url", sql.NVarChar, url)
      .query(
        `SELECT image_id FROM EventImages WHERE event_id = @event_id AND image_url = @image_url`,
      );

    if (existing.recordset.length > 0) continue;

    await pool
      .request()
      .input("event_id", sql.Int, eventId)
      .input("image_url", sql.NVarChar, url)
      .input("caption", sql.NVarChar, "")
      .input("display_order", sql.Int, i)
      .query(
        `INSERT INTO EventImages (event_id, image_url, caption, display_order, uploaded_at)
         VALUES (@event_id, @image_url, @caption, @display_order, GETDATE())`,
      );
  }
}

// ==========================================
// HÀM DÙNG CHUNG: nhận 1 object sự kiện đã cào + bóc tách bởi AI, rồi:
//  - Geocode toạ độ
//  - Xác định category_id
//  - Kiểm tra trùng lặp với DB hiện có
//     + Nếu KHÔNG trùng           -> INSERT mới, status = 'pending' (chờ Admin duyệt)
//     + Nếu trùng nhưng có cập nhật mới hơn -> UPDATE lại nội dung, đưa status về 'pending'
//       để Admin duyệt lại nội dung đã thay đổi
//     + Nếu trùng và không có gì mới        -> bỏ qua (skip)
//  - Lưu ảnh (banner + thư viện ảnh) vào bảng EventImages
// ==========================================
async function upsertScrapedEvent(
  pool,
  eventData,
  createdBy = DEFAULT_SYSTEM_USER_ID,
) {
  if (!eventData || !eventData.title || !eventData.start_time) {
    return { action: "invalid", title: eventData?.title || null };
  }

  const existingRow = await findExistingEvent(pool, eventData);
  const { lat, lng } = await geocodeAddress(eventData);
  const categoryId = await resolveCategoryId(pool, eventData.category_name);

  const shortDescription = eventData.description
    ? eventData.description.substring(0, 150)
    : "";

  if (!existingRow) {
    // ---- INSERT MỚI ----
    const insertResult = await pool
      .request()
      .input("category_id", sql.Int, categoryId)
      .input("created_by", sql.Int, createdBy)
      .input("title", sql.NVarChar, eventData.title)
      .input("short_description", sql.NVarChar, shortDescription)
      .input("description", sql.NVarChar, eventData.description || "")
      .input("location_name", sql.NVarChar, eventData.location_name || "")
      .input("latitude", sql.Decimal(9, 6), lat)
      .input("longitude", sql.Decimal(9, 6), lng)
      .input("address", sql.NVarChar, eventData.address || "")
      .input("district", sql.NVarChar, eventData.district || "")
      .input("start_time", sql.DateTime, safeDate(eventData.start_time))
      .input(
        "end_time",
        sql.DateTime,
        safeDate(eventData.end_time) || safeDate(eventData.start_time),
      )
      .input("banner_url", sql.NVarChar, eventData.banner_url || "")
      .input("is_free", sql.Bit, eventData.is_free ? 1 : 0)
      .input("ticket_price", sql.Decimal(10, 2), eventData.ticket_price || 0)
      .query(`
        INSERT INTO Events (
          category_id, created_by, title, short_description, description,
          location_name, latitude, longitude, address, district,
          start_time, end_time, banner_url, is_free, ticket_price, status, created_at, updated_at
        )
        OUTPUT INSERTED.event_id
        VALUES (
          @category_id, @created_by, @title, @short_description, @description,
          @location_name, @latitude, @longitude, @address, @district,
          @start_time, @end_time, @banner_url, @is_free, @ticket_price, 'pending', GETDATE(), GETDATE()
        )
      `);

    const newEventId = insertResult.recordset[0].event_id;
    const gallery = [
      eventData.banner_url,
      ...(eventData.gallery_urls || []),
    ].filter(Boolean);
    await saveEventImages(pool, newEventId, gallery);

    console.log(
      `✨ [SYNC] Đã thêm sự kiện mới vào hàng đợi chờ duyệt: "${eventData.title}"`,
    );
    return { action: "inserted", eventId: newEventId, title: eventData.title };
  }

  // ---- ĐÃ TỒN TẠI: kiểm tra xem có nội dung mới hơn để UPDATE không ----
  if (!hasMeaningfulUpdate(existingRow, eventData)) {
    console.log(
      `⏭️  [SYNC] Sự kiện đã tồn tại & không có gì mới, bỏ qua: "${eventData.title}"`,
    );
    return {
      action: "skipped",
      eventId: existingRow.event_id,
      title: eventData.title,
    };
  }

  // Nếu sự kiện đã được duyệt trước đó, khi có nội dung mới, đưa lại về 'pending' để Admin
  // duyệt lại thay đổi (không hiển thị nội dung mới chưa qua kiểm duyệt cho người dùng cuối)
  const newStatus = "pending";

  await pool
    .request()
    .input("event_id", sql.Int, existingRow.event_id)
    .input("category_id", sql.Int, categoryId)
    .input("short_description", sql.NVarChar, shortDescription)
    .input(
      "description",
      sql.NVarChar,
      eventData.description || existingRow.description || "",
    )
    .input("location_name", sql.NVarChar, eventData.location_name || "")
    .input("latitude", sql.Decimal(9, 6), lat)
    .input("longitude", sql.Decimal(9, 6), lng)
    .input(
      "address",
      sql.NVarChar,
      eventData.address || existingRow.address || "",
    )
    .input("district", sql.NVarChar, eventData.district || "")
    .input("start_time", sql.DateTime, safeDate(eventData.start_time))
    .input(
      "end_time",
      sql.DateTime,
      safeDate(eventData.end_time) || safeDate(eventData.start_time),
    )
    .input(
      "banner_url",
      sql.NVarChar,
      eventData.banner_url || existingRow.banner_url || "",
    )
    .input("is_free", sql.Bit, eventData.is_free ? 1 : 0)
    .input("ticket_price", sql.Decimal(10, 2), eventData.ticket_price || 0)
    .input("status", sql.NVarChar, newStatus).query(`
      UPDATE Events SET
        category_id = @category_id,
        short_description = @short_description,
        description = @description,
        location_name = @location_name,
        latitude = @latitude,
        longitude = @longitude,
        address = @address,
        district = @district,
        start_time = @start_time,
        end_time = @end_time,
        banner_url = @banner_url,
        is_free = @is_free,
        ticket_price = @ticket_price,
        status = @status,
        updated_at = GETDATE()
      WHERE event_id = @event_id
    `);

  const gallery = [
    eventData.banner_url,
    ...(eventData.gallery_urls || []),
  ].filter(Boolean);
  await saveEventImages(pool, existingRow.event_id, gallery);

  console.log(
    `♻️  [SYNC] Sự kiện đã tồn tại có nội dung mới hơn -> đã cập nhật & đưa lại về 'pending': "${eventData.title}"`,
  );
  return {
    action: "updated",
    eventId: existingRow.event_id,
    title: eventData.title,
  };
}

// ==========================================
// JOB A: Tự động đồng bộ sự kiện từ trang danh sách "/su-kien" (từng bài viết chi tiết)
// ==========================================
async function syncDanangEventsAutomatically() {
  const summary = { inserted: 0, updated: 0, skipped: 0, invalid: 0, total: 0 };
  try {
    console.log(
      "🔄 [CRON] Bắt đầu tự động đồng bộ sự kiện từ các bài viết lẻ...",
    );

    // Gọi đúng hàm cào link bài lẻ
    let links = await fetchEventLinksFromListing();
    if (!links || links.length === 0) {
      console.log("[CRON] Không tìm thấy link bài viết sự kiện lẻ nào.");

      // FALLBACK: Chuyển sang cào Poster tổng hợp nếu không có bài lẻ
      console.log(
        "🔄 [CRON] Chuyển sang quét danh mục sự kiện năm từ Poster...",
      );
      return await syncYearlyEventCatalog();
    }

    const pool = await poolPromise;

    for (const url of links) {
      try {
        const eventData = await scrapeAndExtractEventDetail(url);
        if (!eventData || !eventData.title) continue;

        const result = await upsertScrapedEvent(pool, eventData);
        summary.total += 1;
        summary[result.action] = (summary[result.action] || 0) + 1;
      } catch (itemErr) {
        console.error(`Lỗi xử lý URL ${url}:`, itemErr.message);
      }
    }
  } catch (error) {
    console.error("Lỗi trong quá trình tự động đồng bộ sự kiện:", error);
  }

  console.log("📊 [CRON] Kết quả đồng bộ bài lẻ:", summary);
  return summary;
}
// ==========================================
// JOB B: Đồng bộ TOÀN BỘ danh mục sự kiện & lễ hội năm 2026 từ 1 trang tổng hợp duy nhất.
// Đây là quy trình chính theo yêu cầu: quét trang danh mục -> AI bóc tách toàn bộ sự kiện
// kèm ảnh -> so sánh trùng lặp với DB (update nếu có thông tin mới hơn, thêm mới nếu chưa có)
// -> lưu với status = 'pending' chờ Admin duyệt -> khi duyệt xong tự động hiển thị lên
// thanh sự kiện & bản đồ (do GET /api/events mặc định chỉ trả về status = 'approved').
// ==========================================
async function syncYearlyEventCatalog(
  catalogUrl = YEARLY_CATALOG_URL,
  createdBy = DEFAULT_SYSTEM_USER_ID,
) {
  const summary = { inserted: 0, updated: 0, skipped: 0, invalid: 0, total: 0 };
  try {
    console.log(
      `🔄 [CATALOG SYNC] Bắt đầu đồng bộ danh mục sự kiện năm từ: ${catalogUrl}`,
    );

    const events = await crawlYearlyEventCatalog(catalogUrl);
    if (!events || events.length === 0) {
      console.warn(
        "[CATALOG SYNC] Không bóc tách được sự kiện nào từ trang danh mục.",
      );
      return summary;
    }

    const pool = await poolPromise;

    for (const eventData of events) {
      try {
        const result = await upsertScrapedEvent(pool, eventData, createdBy);
        summary.total += 1;
        summary[result.action] = (summary[result.action] || 0) + 1;
      } catch (itemErr) {
        console.error(
          `Lỗi xử lý sự kiện "${eventData?.title}":`,
          itemErr.message,
        );
        summary.invalid += 1;
      }
    }
  } catch (error) {
    console.error("Lỗi trong quá trình đồng bộ danh mục sự kiện năm:", error);
  }

  console.log("📊 [CATALOG SYNC] Kết quả đồng bộ:", summary);
  return summary;
}

module.exports = {
  syncDanangEventsAutomatically,
  syncYearlyEventCatalog,
  upsertScrapedEvent, // export để route Admin có thể dùng chung logic dedup/update
};
