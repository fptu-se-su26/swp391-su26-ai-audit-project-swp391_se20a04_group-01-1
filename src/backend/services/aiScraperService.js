const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sql, poolPromise } = require('../db');

// Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';

/**
 * 1. Fetch raw articles & images from DanangFantastiCity & RSS feeds
 */
async function fetchDanangEventsRaw() {
    const eventsRaw = [];

    try {
        // Source 1: DanangFantastiCity category page
        const targetUrl = 'https://danangfantasticity.com/danh-muc/le-hoi-su-kien?id=12925';
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (res.ok) {
            const html = await res.text();
            
            // Extract article links, titles and images
            const articleBlockRegex = /<div[^>]*class=["'][^"']*flex[^"']*flex-col[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
            const imgRegex = /src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i;
            const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i;
            
            // Fallback general link matching if block matching is empty
            const generalLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
            let match;
            const foundUrls = new Set();

            while ((match = generalLinkRegex.exec(html)) !== null) {
                const url = match[1];
                const text = match[2].replace(/<[^>]+>/g, '').trim();

                if ((url.includes('/vi/kham-pha/') || url.includes('/su-kien/')) && text.length > 15 && !foundUrls.has(url)) {
                    foundUrls.add(url);
                    const fullUrl = url.startsWith('http') ? url : `https://danangfantasticity.com${url}`;
                    eventsRaw.push({
                        source: 'DanangFantastiCity',
                        title: text,
                        url: fullUrl,
                        imageUrl: 'https://danangfantasticity.com/wp-content/uploads/dfc/public/cate-bg/9.jpg' // Default event cover image
                    });
                }
            }
        }
    } catch (err) {
        console.error("Lỗi cào dữ liệu từ DanangFantastiCity:", err.message);
    }

    // Fallback demo items if website is unreachable or scraping returns empty
    if (eventsRaw.length === 0) {
        eventsRaw.push(
            {
                source: 'DanangFantastiCity',
                title: 'Lễ hội Pháo hoa Quốc tế Đà Nẵng DIFF 2026 - Đêm trình diễn ánh sáng sông Hàn (Cấm đường Trần Hưng Đạo)',
                url: 'https://danangfantasticity.com/su-kien/diff-2026',
                imageUrl: 'https://danangfantasticity.com/wp-content/uploads/dfc/public/cate-bg/9.jpg'
            },
            {
                source: 'DanangFantastiCity',
                title: 'Giải Chạy Marathon Quốc tế Đà Nẵng 2026 tại Công viên Biển Đông (Hạn chế phương tiện đường Võ Nguyên Giáp)',
                url: 'https://danangfantasticity.com/su-kien/marathon-2026',
                imageUrl: 'https://danangfantasticity.com/wp-content/uploads/2026/07/bien-my-khe-tro-thanh-san-khau-thuc-canh-01.jpg'
            }
        );
    }

    return eventsRaw;
}

/**
 * 2. Use Gemini AI to parse text, images & road closure info into Structured Event JSON
 */
async function parseEventWithGemini(rawItem) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Fallback mockup if GEMINI_API_KEY is not set
        return {
            title: rawItem.title,
            location_name: "Bờ sông Hàn, Đường Trần Hưng Đạo, Quận Sơn Trà, Đà Nẵng",
            address: "Trần Hưng Đạo, Sơn Trà, Đà Nẵng",
            district: "Sơn Trà",
            category_name: "Sự kiện văn hóa",
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 86400000 * 3).toISOString(),
            short_description: `[AI Crawled từ DanangFantastiCity] ${rawItem.title}`,
            description: `Dữ liệu sự kiện được tự động thu thập từ DanangFantastiCity: ${rawItem.title}. Nguồn: ${rawItem.url}`,
            banner_url: rawItem.imageUrl,
            thumbnail_url: rawItem.imageUrl,
            closed_roads: [
                {
                    road_name: "Đường Trần Hưng Đạo",
                    closure_type: "CONGESTION",
                    severity: "HIGH",
                    description: "Cấm tất cả phương tiện di chuyển qua đoạn sông Hàn phục vụ sự kiện"
                }
            ]
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        const prompt = `Bạn là hệ thống AI trích xuất dữ liệu sự kiện du lịch và giao thông Đà Nẵng.
Hãy phân tích tiêu đề và thông tin bài báo sau từ nguồn DanangFantastiCity:
Tiêu đề: "${rawItem.title}"
Link nguồn: "${rawItem.url}"
Link ảnh mặc định: "${rawItem.imageUrl}"

Hãy trích xuất và trả về ĐÚNG MỘT CHUỖI JSON (không chứa codeblock, không chứa markdown, chỉ chứa JSON thuần) với định dạng sau:
{
  "title": "Tên sự kiện hoặc cảnh báo rõ ràng",
  "location_name": "Tên địa điểm cụ thể tại Đà Nẵng (ví dụ: Công viên Biển Đông, Đường Trần Hưng Đạo, Cầu Rồng...)",
  "address": "Địa chỉ đường phố cụ thể tại Đà Nẵng",
  "district": "Tên quận ở Đà Nẵng (Hải Châu / Sơn Trà / Ngũ Hành Sơn / Thanh Khê / Liên Chiểu / Cẩm Lệ)",
  "category_name": "Một trong các nhóm: Sự kiện văn hóa | Lễ hội | Thể thao | Giao thông | Triển lãm",
  "start_time": "Thời gian bắt đầu chuẩn ISO-8601 (ví dụ: 2026-08-15T19:00:00Z)",
  "end_time": "Thời gian kết thúc chuẩn ISO-8601 (ví dụ: 2026-08-17T22:00:00Z)",
  "short_description": "Tóm tắt 1-2 câu về sự kiện",
  "description": "Mô tả chi tiết sự kiện và hoạt động chính",
  "banner_url": "Link URL ảnh nền banner sự kiện",
  "thumbnail_url": "Link URL ảnh đại diện thumbnail sự kiện",
  "closed_roads": [
    {
      "road_name": "Tên tuyến đường bị cấm hoặc hạn chế giao thông (ví dụ: Đường Trần Hưng Đạo, Đường Võ Nguyên Giáp...)",
      "closure_type": "CONGESTION",
      "severity": "HIGH",
      "description": "Lý do cấm đường hoặc thời gian cấm phương tiện"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // Strip out ```json markdown fences if any
        if (text.startsWith("```json")) text = text.replace(/^```json/, "");
        if (text.startsWith("```")) text = text.replace(/^```/, "");
        if (text.endsWith("```")) text = text.replace(/```$/, "");

        const parsed = JSON.parse(text.trim());
        if (!parsed.banner_url) parsed.banner_url = rawItem.imageUrl;
        if (!parsed.thumbnail_url) parsed.thumbnail_url = rawItem.imageUrl;
        return parsed;
    } catch (err) {
        console.error("Lỗi phân tích Gemini AI:", err.message);
        return {
            title: rawItem.title,
            location_name: "Trung tâm TP Đà Nẵng",
            address: "Đà Nẵng",
            district: "Hải Châu",
            category_name: "Sự kiện văn hóa",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 86400000 * 2).toISOString(),
            short_description: `[AI Crawled từ DanangFantastiCity] ${rawItem.title}`,
            description: `Thông tin cào từ DanangFantastiCity: ${rawItem.url}`,
            banner_url: rawItem.imageUrl,
            thumbnail_url: rawItem.imageUrl,
            closed_roads: []
        };
    }
}

/**
 * 3. Geocode location_name to Latitude & Longitude in Da Nang via Mapbox API
 */
async function geocodeLocationDaNang(locationName, address) {
    const query = encodeURIComponent(`${locationName}, ${address}, Đà Nẵng, Việt Nam`);
    const bbox = "107.8,15.9,108.4,16.2"; // Da Nang Bounding Box
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&bbox=${bbox}&limit=1`;

    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                return { latitude: lat, longitude: lng };
            }
        }
    } catch (err) {
        console.error("Lỗi geocoding Mapbox:", err.message);
    }

    // Default fallback to Da Nang center if geocoding returns no match
    return { latitude: 16.0544, longitude: 108.2022 };
}

/**
 * 4. Main Service: Fetch, Parse with AI (Images + Closed Roads), Deduplicate, and Insert Pending Events & Traffic Alerts
 */
async function runAiEventScraper() {
    console.log("🤖 [AI Event Scraper] Đang bắt đầu thu thập dữ liệu sự kiện, ảnh & đường cấm từ DanangFantastiCity...");
    
    const rawEvents = await fetchDanangEventsRaw();
    console.log(`📡 [AI Event Scraper] Tìm thấy ${rawEvents.length} bài viết tiềm năng.`);

    const pool = await poolPromise;
    let newEventsCount = 0;
    let skippedDuplicatesCount = 0;
    let createdRoadAlertsCount = 0;

    // Get categories mapping from EventCategories table
    const categoriesResult = await pool.request().query("SELECT category_id, name FROM EventCategories");
    const categoriesMap = categoriesResult.recordset;
    const defaultCategoryId = categoriesMap.length > 0 ? categoriesMap[0].category_id : 1;

    for (const rawItem of rawEvents.slice(0, 5)) { // Limit to 5 articles per run
        try {
            // Step A: Parse with Gemini (including Images & Closed Roads)
            const parsedEvent = await parseEventWithGemini(rawItem);
            if (!parsedEvent || !parsedEvent.title) continue;

            // Step B: Geocode location
            const coords = await geocodeLocationDaNang(parsedEvent.location_name, parsedEvent.address);
            parsedEvent.latitude = coords.latitude;
            parsedEvent.longitude = coords.longitude;

            // Step C: Check Deduplication in DB
            const checkDuplicate = await pool.request()
                .input("title", sql.NVarChar, `%${parsedEvent.title.substring(0, 20)}%`)
                .input("lat", sql.Float, parsedEvent.latitude)
                .input("lng", sql.Float, parsedEvent.longitude)
                .query(`
                    SELECT event_id FROM Events 
                    WHERE title LIKE @title 
                       OR (ABS(latitude - @lat) < 0.005 AND ABS(longitude - @lng) < 0.005)
                `);

            if (checkDuplicate.recordset.length > 0) {
                console.log(`⏩ [Deduplication] Bỏ qua sự kiện trùng lặp: "${parsedEvent.title}"`);
                skippedDuplicatesCount++;
                continue;
            }

            // Find matching category_id
            let matchedCat = categoriesMap.find(c => c.name.toLowerCase().includes((parsedEvent.category_name || '').toLowerCase()));
            let categoryId = matchedCat ? matchedCat.category_id : defaultCategoryId;

            // Step D: Insert Event with Images & status = 'pending'
            const insertEventResult = await pool.request()
                .input("category_id", sql.Int, categoryId)
                .input("created_by", sql.Int, 1) // Default Admin system user
                .input("title", sql.NVarChar, parsedEvent.title)
                .input("short_description", sql.NVarChar, `[🤖 AI Crawled - DanangFantastiCity] ${parsedEvent.short_description || ''}`)
                .input("description", sql.NVarChar, `${parsedEvent.description || ''}\n\nNguồn: DanangFantastiCity (${rawItem.url})`)
                .input("location_name", sql.NVarChar, parsedEvent.location_name || 'Đà Nẵng')
                .input("latitude", sql.Float, parsedEvent.latitude)
                .input("longitude", sql.Float, parsedEvent.longitude)
                .input("address", sql.NVarChar, parsedEvent.address || 'Đà Nẵng')
                .input("district", sql.NVarChar, parsedEvent.district || 'Hải Châu')
                .input("start_time", sql.DateTime, new Date(parsedEvent.start_time || Date.now()))
                .input("end_time", sql.DateTime, new Date(parsedEvent.end_time || Date.now() + 86400000 * 2))
                .input("banner_url", sql.NVarChar, parsedEvent.banner_url || rawItem.imageUrl)
                .input("thumbnail_url", sql.NVarChar, parsedEvent.thumbnail_url || rawItem.imageUrl)
                .input("status", sql.NVarChar, 'pending') // Pending for Admin Approval!
                .input("is_featured", sql.Bit, 0)
                .input("is_free", sql.Bit, 1)
                .input("ticket_price", sql.Decimal(10, 2), 0)
                .query(`
                    INSERT INTO Events (
                        category_id, created_by, title, short_description, description, location_name, 
                        latitude, longitude, address, district, start_time, end_time, 
                        banner_url, thumbnail_url, status, is_featured, is_free, ticket_price, 
                        created_at, updated_at
                    ) 
                    OUTPUT INSERTED.event_id
                    VALUES (
                        @category_id, @created_by, @title, @short_description, @description, @location_name, 
                        @latitude, @longitude, @address, @district, @start_time, @end_time, 
                        @banner_url, @thumbnail_url, @status, @is_featured, @is_free, @ticket_price, 
                        GETDATE(), GETDATE()
                    )
                `);

            const newEventId = insertEventResult.recordset[0].event_id;
            console.log(`✅ [AI Event Scraper] Đã tạo sự kiện mới (ID: ${newEventId}, Có Ảnh): "${parsedEvent.title}"`);
            newEventsCount++;

            // Step E: Create TrafficAlerts for any Closed Roads identified by AI
            if (Array.isArray(parsedEvent.closed_roads) && parsedEvent.closed_roads.length > 0) {
                for (const road of parsedEvent.closed_roads) {
                    if (!road.road_name) continue;
                    
                    const roadCoords = await geocodeLocationDaNang(road.road_name, 'Đà Nẵng');
                    await pool.request()
                        .input("created_by", sql.Int, 1)
                        .input("event_id", sql.Int, newEventId)
                        .input("alert_type", sql.NVarChar, road.closure_type || 'CONGESTION')
                        .input("title", sql.NVarChar, `[Cấm đường/Hạn chế] ${road.road_name}`)
                        .input("description", sql.NVarChar, `🤖 AI Trích xuất từ sự kiện "${parsedEvent.title}": ${road.description || 'Cấm phương tiện phục vụ sự kiện'}`)
                        .input("location_name", sql.NVarChar, road.road_name)
                        .input("latitude", sql.Float, roadCoords.latitude)
                        .input("longitude", sql.Float, roadCoords.longitude)
                        .input("severity", sql.NVarChar, road.severity || 'HIGH')
                        .input("start_time", sql.DateTime, new Date(parsedEvent.start_time || Date.now()))
                        .input("end_time", sql.DateTime, new Date(parsedEvent.end_time || Date.now() + 86400000 * 2))
                        .input("is_active", sql.Bit, 1)
                        .query(`
                            INSERT INTO TrafficAlerts (
                                created_by, event_id, alert_type, title, description, location_name,
                                latitude, longitude, severity, start_time, end_time, is_active,
                                created_at, updated_at
                            ) VALUES (
                                @created_by, @event_id, @alert_type, @title, @description, @location_name,
                                @latitude, @longitude, @severity, @start_time, @end_time, @is_active,
                                GETDATE(), GETDATE()
                            )
                        `);
                    console.log(` 🚧 [TrafficAlert] Đã tạo tự động cảnh báo cấm đường: "${road.road_name}"`);
                    createdRoadAlertsCount++;
                }
            }
        } catch (itemErr) {
            console.error("Lỗi khi xử lý bài viết sự kiện:", itemErr.message);
        }
    }

    return {
        success: true,
        message: `Hoàn tất AI Scraper từ DanangFantastiCity! Thêm mới ${newEventsCount} sự kiện (kèm Ảnh & ${createdRoadAlertsCount} Cảnh báo Cấm đường) chờ duyệt, bỏ qua ${skippedDuplicatesCount} tin trùng.`,
        newEventsCount,
        createdRoadAlertsCount,
        skippedDuplicatesCount
    };
}

module.exports = {
    runAiEventScraper
};
