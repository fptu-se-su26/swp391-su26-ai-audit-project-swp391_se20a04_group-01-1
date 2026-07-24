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
// ==========================================
// Lấy tọa độ từ Mapbox dựa trên địa chỉ sự kiện.
// Không dùng vị trí mặc định. Không xác định được thì trả về null.
// ==========================================

/**
 * Geocode địa điểm sự kiện bằng Mapbox.
 *
 * Quy tắc:
 * - Thiếu token => trả về null.
 * - Thiếu toàn bộ thông tin địa điểm => trả về null.
 * - Thử nhiều query từ chi tiết đến đơn giản.
 * - Chỉ chấp nhận kết quả nằm trong khu vực Đà Nẵng.
 * - Không dùng tọa độ mặc định.
 *
 * @param {Object} eventData
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   formattedAddress: string
 * } | null>}
 */
// Cache trong bộ nhớ để cùng một địa chỉ không gọi Mapbox nhiều lần.
// Cache tồn tại cho đến khi backend restart.
const geocodeCache = new Map();

function buildGeocodeCacheKey(eventData) {
  return [eventData?.location_name, eventData?.address, eventData?.district]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join("|");
}
/**
 * Geocode địa điểm sự kiện bằng Mapbox.
 *
 * Quy tắc:
 * - Không có token thì trả về null.
 * - Không có thông tin địa điểm thì trả về null.
 * - Dùng cache để tránh gọi Mapbox lặp lại.
 * - Thử query ngắn trước, query dài sau.
 * - Chỉ nhận tọa độ thuộc vùng Đà Nẵng/Hội An.
 * - Không dùng tọa độ mặc định.
 *
 * @param {Object} eventData
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   formattedAddress: string
 * } | null>}
 */
async function geocodeAddress(eventData) {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    console.error("[GEOCODE] Thiếu biến môi trường MAPBOX_ACCESS_TOKEN.");
    return null;
  }

  const title = String(eventData?.title || "").trim();
  const locationName = String(eventData?.location_name || "").trim();
  const address = String(eventData?.address || "").trim();
  const district = String(eventData?.district || "").trim();

  if (!locationName && !address && !district) {
    console.warn("[GEOCODE] Bỏ qua sự kiện vì thiếu địa chỉ:", {
      title,
      location_name: locationName,
      address,
      district,
    });

    return null;
  }

  const cacheKey = buildGeocodeCacheKey(eventData);

  if (cacheKey && geocodeCache.has(cacheKey)) {
    const cachedResult = geocodeCache.get(cacheKey);

    console.log("[GEOCODE] Sử dụng kết quả cache:", {
      title,
      cacheKey,
      found: Boolean(cachedResult),
    });

    return cachedResult;
  }

  /*
   * Thử query ngắn, rõ nghĩa trước.
   * Query đầy đủ và dài được đặt cuối cùng.
   */
  const rawQueries = [
    [locationName, district, "Đà Nẵng", "Việt Nam"],
    [locationName, "Đà Nẵng", "Việt Nam"],
    [address, district, "Đà Nẵng", "Việt Nam"],
    [address, "Đà Nẵng", "Việt Nam"],
    [district, "Đà Nẵng", "Việt Nam"],
    [locationName, address, district, "Đà Nẵng", "Việt Nam"],
  ];

  const queries = rawQueries
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter(
      (query, index, array) =>
        query &&
        query !== "Đà Nẵng, Việt Nam" &&
        array.indexOf(query) === index,
    )
    .map((query) => {
      const words = query.split(/\s+/);
      return words.length > 18 ? words.slice(0, 18).join(" ") : query;
    });

  /*
   * Giới hạn tương đối bao gồm Đà Nẵng và Hội An.
   * Mapbox trả tọa độ theo thứ tự [longitude, latitude].
   */
  const LOCATION_BOUNDS = {
    minLat: 15.7,
    maxLat: 16.3,
    minLng: 107.8,
    maxLng: 108.6,
  };

  function isInsideAllowedBounds(lat, lng) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= LOCATION_BOUNDS.minLat &&
      lat <= LOCATION_BOUNDS.maxLat &&
      lng >= LOCATION_BOUNDS.minLng &&
      lng <= LOCATION_BOUNDS.maxLng
    );
  }

  function getFeatureCoordinates(feature) {
    const coordinates =
      feature?.geometry?.coordinates ||
      feature?.properties?.coordinates?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  function getFeatureText(feature) {
    const contextText = Array.isArray(feature?.properties?.context)
      ? feature.properties.context
          .map(
            (item) =>
              item?.name ||
              item?.text ||
              item?.place_name ||
              item?.short_code ||
              "",
          )
          .filter(Boolean)
          .join(", ")
      : "";

    return [
      feature?.properties?.name,
      feature?.properties?.name_preferred,
      feature?.properties?.full_address,
      feature?.properties?.place_formatted,
      feature?.properties?.address,
      feature?.place_name,
      feature?.text,
      contextText,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function normalizeLocationText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasAllowedLocationContext(feature) {
    const featureText = normalizeLocationText(getFeatureText(feature));

    return (
      featureText.includes("da nang") ||
      featureText.includes("danang") ||
      featureText.includes("hoi an") ||
      featureText.includes("quang nam")
    );
  }

  for (const query of queries) {
    try {
      console.log("[GEOCODE] Đang thử query:", {
        title,
        query,
      });

      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: mapboxToken,
            country: "VN",
            language: "vi",
            limit: 5,
            // 2. Ép Mapbox TÌM KIẾM CHÍNH XÁC trong khung tọa độ Đà Nẵng/Hội An
            // Format: minLng,minLat,maxLng,maxLat
            bbox: "107.8,15.7,108.6,16.3",
            // Ưu tiên các kết quả xoay quanh trung tâm Đà Nẵng
            proximity: "108.2022,16.0544",
          },
          timeout: 10000,
        },
      );

      const features = Array.isArray(response.data?.features)
        ? response.data.features
        : [];

      if (features.length === 0) {
        console.warn("[GEOCODE] Query không có kết quả:", {
          title,
          query,
        });

        continue;
      }

      const validFeature = features.find((feature) => {
        const coordinates = getFeatureCoordinates(feature);

        if (!coordinates) {
          return false;
        }

        const insideBounds = isInsideAllowedBounds(
          coordinates.lat,
          coordinates.lng,
        );

        const hasLocationContext = hasAllowedLocationContext(feature);

        /*
         * Ưu tiên an toàn:
         * Phải nằm trong giới hạn tọa độ.
         * Context chỉ dùng làm tín hiệu bổ sung, không thay thế bounds.
         */
        return insideBounds;
      });

      if (!validFeature) {
        console.warn("[GEOCODE] Có kết quả nhưng không đủ điều kiện vị trí:", {
          title,
          query,
        });

        continue;
      }

      const coordinates = getFeatureCoordinates(validFeature);

      if (!coordinates) {
        continue;
      }

      const formattedAddress =
        validFeature?.properties?.full_address ||
        validFeature?.properties?.place_formatted ||
        validFeature?.place_name ||
        validFeature?.properties?.name ||
        query;

      const result = {
        lat: coordinates.lat,
        lng: coordinates.lng,
        formattedAddress,
      };

      if (cacheKey) {
        geocodeCache.set(cacheKey, result);
      }

      console.log("[GEOCODE] Xác định địa điểm thành công:", {
        title,
        query,
        lat: result.lat,
        lng: result.lng,
        formattedAddress: result.formattedAddress,
      });

      return result;
    } catch (error) {
      const status = error.response?.status;

      console.error("[GEOCODE] Lỗi Mapbox Geocoding:", {
        title,
        query,
        status,
        data: error.response?.data,
        message: error.message,
      });

      /*
       * Token sai hoặc không có quyền:
       * mọi query tiếp theo đều sẽ thất bại nên dừng luôn.
       */
      if (status === 401 || status === 403) {
        if (cacheKey) {
          geocodeCache.set(cacheKey, null);
        }

        return null;
      }

      /*
       * Rate limit:
       * tránh gửi tiếp nhiều request liên tục.
       */
      if (status === 429) {
        console.error(
          "[GEOCODE] Mapbox đã giới hạn số lượng request. Dừng geocode sự kiện hiện tại.",
        );

        return null;
      }

      /*
       * Timeout hoặc lỗi mạng:
       * chuyển sang query tiếp theo.
       */
    }
  }

  if (cacheKey) {
    geocodeCache.set(cacheKey, null);
  }

  console.warn("[GEOCODE] Không tìm thấy kết quả Mapbox:", {
    title,
    queries,
  });

  return null;
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
    .input("start_time", sql.DateTime, safeDate(eventData.start_time)).query(`
    SELECT
      event_id,
      title,
      description,
      short_description,
      location_name,
      address,
      district,
      latitude,
      longitude,
      start_time,
      end_time,
      banner_url,
      ticket_price,
      is_free,
      status
    FROM Events
    WHERE title = @title
  `);

  if (result.recordset.length > 0) return result.recordset[0];

  // So khớp gần đúng: lấy các event có start_time trong cùng ngày, rồi so tiêu đề đã chuẩn hoá
  const startDate = safeDate(eventData.start_time);
  if (!startDate) return null;

  const dayResult = await pool
    .request()
    .input("start_time", sql.DateTime, startDate).query(`
    SELECT
      event_id,
      title,
      description,
      short_description,
      location_name,
      address,
      district,
      latitude,
      longitude,
      start_time,
      end_time,
      banner_url,
      ticket_price,
      is_free,
      status
    FROM Events
    WHERE CAST(start_time AS DATE) = CAST(@start_time AS DATE)
  `);

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
  const oldLatitude = Number(existingRow.latitude);
  const oldLongitude = Number(existingRow.longitude);

  const isMissingCoordinates =
    !Number.isFinite(oldLatitude) || !Number.isFinite(oldLongitude);

  const isOldDefaultCoordinates =
    Math.abs(oldLatitude - 16.0544) < 0.00001 &&
    Math.abs(oldLongitude - 108.2022) < 0.00001;

  if (isMissingCoordinates || isOldDefaultCoordinates) {
    console.log(
      "[UPDATE CHECK] Sự kiện đang dùng tọa độ mặc định cũ, cần geocode lại:",
      {
        title: existingRow.title,
        latitude: existingRow.latitude,
        longitude: existingRow.longitude,
      },
    );

    return true;
  }

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
    return {
      action: "invalid",
      title: eventData?.title || null,
    };
  }

  const existingRow = await findExistingEvent(pool, eventData);

  /*
   * Nếu event đã tồn tại và dữ liệu mới không có thay đổi,
   * bỏ qua ngay, không cần gọi Mapbox.
   */
  if (existingRow && !hasMeaningfulUpdate(existingRow, eventData)) {
    console.log(
      `⏭️ [SYNC] Sự kiện đã tồn tại & không có gì mới, bỏ qua: "${eventData.title}"`,
    );

    return {
      action: "skipped",
      reason: "duplicate",
      eventId: existingRow.event_id,
      title: eventData.title,
    };
  }

  /*
   * Chỉ geocode khi:
   * - Event chưa tồn tại, cần INSERT.
   * - Event đã tồn tại nhưng có thay đổi, cần UPDATE.
   */
  const geocodedLocation = await geocodeAddress(eventData);

  if (!geocodedLocation) {
    console.warn(
      `⏭️ [SYNC] Bỏ qua sự kiện vì không xác định được địa điểm: "${eventData.title}"`,
    );

    return {
      action: "skipped",
      reason: "geocode_failed",
      eventId: existingRow?.event_id || null,
      title: eventData.title,
    };
  }

  const { lat, lng, formattedAddress } = geocodedLocation;

  const categoryId = await resolveCategoryId(pool, eventData.category_name);

  const shortDescription = eventData.description
    ? eventData.description.substring(0, 150)
    : "";

  const startTime = safeDate(eventData.start_time);
  const endTime = safeDate(eventData.end_time) || startTime;

  const isFree = normalizeBoolean(eventData.is_free);
  const ticketPrice = Number(eventData.ticket_price);

  const normalizedIsFree = isFree === null ? 0 : isFree ? 1 : 0;

  const normalizedTicketPrice = Number.isFinite(ticketPrice) ? ticketPrice : 0;

  if (!existingRow) {
    // ==========================================
    // INSERT MỚI
    // ==========================================
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
      .input(
        "address",
        sql.NVarChar,
        eventData.address || formattedAddress || "",
      )
      .input("district", sql.NVarChar, eventData.district || "")
      .input("start_time", sql.DateTime, startTime)
      .input("end_time", sql.DateTime, endTime)
      .input("banner_url", sql.NVarChar, eventData.banner_url || "")
      .input("is_free", sql.Bit, normalizedIsFree)
      .input("ticket_price", sql.Decimal(10, 2), normalizedTicketPrice).query(`
        INSERT INTO Events (
          category_id,
          created_by,
          title,
          short_description,
          description,
          location_name,
          latitude,
          longitude,
          address,
          district,
          start_time,
          end_time,
          banner_url,
          is_free,
          ticket_price,
          status,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.event_id
        VALUES (
          @category_id,
          @created_by,
          @title,
          @short_description,
          @description,
          @location_name,
          @latitude,
          @longitude,
          @address,
          @district,
          @start_time,
          @end_time,
          @banner_url,
          @is_free,
          @ticket_price,
          'pending',
          GETDATE(),
          GETDATE()
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

    return {
      action: "inserted",
      eventId: newEventId,
      title: eventData.title,
    };
  }

  // ==========================================
  // UPDATE EVENT ĐÃ TỒN TẠI
  // ==========================================
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
    .input(
      "location_name",
      sql.NVarChar,
      eventData.location_name || existingRow.location_name || "",
    )
    .input("latitude", sql.Decimal(9, 6), lat)
    .input("longitude", sql.Decimal(9, 6), lng)
    .input(
      "address",
      sql.NVarChar,
      eventData.address || formattedAddress || existingRow.address || "",
    )
    .input(
      "district",
      sql.NVarChar,
      eventData.district || existingRow.district || "",
    )
    .input("start_time", sql.DateTime, startTime)
    .input("end_time", sql.DateTime, endTime)
    .input(
      "banner_url",
      sql.NVarChar,
      eventData.banner_url || existingRow.banner_url || "",
    )
    .input("is_free", sql.Bit, normalizedIsFree)
    .input("ticket_price", sql.Decimal(10, 2), normalizedTicketPrice)
    .input("status", sql.NVarChar, "pending").query(`
      UPDATE Events
      SET
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
    `♻️ [SYNC] Sự kiện có nội dung mới -> đã cập nhật và đưa về 'pending': "${eventData.title}"`,
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
// ==========================================
// Hàm cập nhật kết quả thống kê đồng bộ
// ==========================================
function updateSyncSummary(summary, result) {
  summary.total += 1;

  if (result.action === "skipped" && result.reason === "geocode_failed") {
    summary.geocode_failed += 1;
    return;
  }

  if (result.action === "skipped" && result.reason === "duplicate") {
    summary.duplicate += 1;
    return;
  }

  if (Object.prototype.hasOwnProperty.call(summary, result.action)) {
    summary[result.action] += 1;
    return;
  }

  summary.invalid += 1;
}

// ==========================================
// JOB A: Tự động đồng bộ sự kiện từ trang danh sách
// ==========================================
async function syncDanangEventsAutomatically() {
  const summary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    geocode_failed: 0,
    duplicate: 0,
    invalid: 0,
    total: 0,
  };

  try {
    console.log(
      "🔄 [CRON] Bắt đầu tự động đồng bộ sự kiện từ DanangFantastiCity qua AI Scraper...",
    );
    const { runAiEventScraper } = require('./aiScraperService');
    await runAiEventScraper();

    // Gọi thêm hàm cào link bài lẻ
    const links = await fetchEventLinksFromListing();
    if (!links || links.length === 0) {
      console.log("[CRON] Không tìm thấy link bài viết sự kiện lẻ nào.");

      console.log("🔄 [CRON] Chuyển sang quét danh mục sự kiện năm...");

      return await syncYearlyEventCatalog();
    }

    const pool = await poolPromise;

    for (const url of links) {
      try {
        const eventData = await scrapeAndExtractEventDetail(url);

        if (!eventData || !eventData.title) {
          summary.invalid += 1;

          console.warn(
            `[CRON] Bỏ qua URL vì không trích xuất được sự kiện hợp lệ: ${url}`,
          );

          continue;
        }

        const result = await upsertScrapedEvent(
          pool,
          eventData,
          DEFAULT_SYSTEM_USER_ID,
        );

        updateSyncSummary(summary, result);
      } catch (itemError) {
        console.error(`[CRON] Lỗi xử lý URL ${url}:`, itemError.message);

        summary.invalid += 1;
      }
    }
  } catch (error) {
    console.error("[CRON] Lỗi trong quá trình tự động đồng bộ sự kiện:", error);
  }

  console.log("📊 [CRON] Kết quả đồng bộ bài lẻ:", summary);

  return summary;
}

// ==========================================
// JOB B: Đồng bộ toàn bộ danh mục sự kiện năm
// ==========================================
async function syncYearlyEventCatalog(
  catalogUrl = YEARLY_CATALOG_URL,
  createdBy = DEFAULT_SYSTEM_USER_ID,
) {
  const summary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    geocode_failed: 0,
    duplicate: 0,
    invalid: 0,
    total: 0,
  };

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
        if (!eventData || !eventData.title || !eventData.start_time) {
          console.warn(
            "[CATALOG SYNC] Bỏ qua dữ liệu sự kiện không hợp lệ:",
            eventData?.title || "Không có tiêu đề",
          );

          summary.invalid += 1;
          continue;
        }

        const result = await upsertScrapedEvent(pool, eventData, createdBy);

        updateSyncSummary(summary, result);
      } catch (itemError) {
        console.error(
          `[CATALOG SYNC] Lỗi xử lý sự kiện "${eventData?.title}":`,
          itemError.message,
        );

        summary.invalid += 1;
      }
    }
  } catch (error) {
    console.error(
      "[CATALOG SYNC] Lỗi trong quá trình đồng bộ danh mục sự kiện năm:",
      error,
    );
  }

  console.log("📊 [CATALOG SYNC] Kết quả đồng bộ:", summary);

  return summary;
}

module.exports = {
  syncDanangEventsAutomatically,
  syncYearlyEventCatalog,
  upsertScrapedEvent,
};
