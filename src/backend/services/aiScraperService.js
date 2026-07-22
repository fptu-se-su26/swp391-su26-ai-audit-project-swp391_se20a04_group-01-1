const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sql, poolPromise } = require('../db');

// Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';

// Known landmark coordinates in Da Nang to prevent fallback to airport
const KNOWN_DANANG_LANDMARKS = [
    { keywords: ['mỹ khê', 'my khe', 'bãi biển mỹ khê', 'biển mỹ khê'], lat: 16.0602, lng: 108.2462 },
    { keywords: ['công viên biển đông', 'bien dong park'], lat: 16.0678, lng: 108.2472 },
    { keywords: ['cầu rồng', 'dragon bridge'], lat: 16.0610, lng: 108.2272 },
    { keywords: ['cầu sông hàn', 'han river bridge'], lat: 16.0722, lng: 108.2275 },
    { keywords: ['cầu trần thị lý'], lat: 16.0508, lng: 108.2312 },
    { keywords: ['sơn trà', 'bán đảo sơn trà', 'chùa linh ứng'], lat: 16.1000, lng: 108.2778 },
    { keywords: ['ngũ hành sơn', 'marble mountains'], lat: 16.0042, lng: 108.2635 },
    { keywords: ['bà nà', 'ba na hills'], lat: 15.9961, lng: 107.9877 },
    { keywords: ['bạch đằng', 'đường bạch đằng'], lat: 16.0680, lng: 108.2240 },
    { keywords: ['trần hưng đạo', 'đường trần hưng đạo'], lat: 16.0650, lng: 108.2300 },
    { keywords: ['bảo tàng đà nẵng', 'bao tang da nang', 'thành điện hải'], lat: 16.0754, lng: 108.2244 },
    { keywords: ['bảo tàng điêu khắc chăm', 'bảo tàng chăm', 'cham museum'], lat: 16.0601, lng: 108.2227 }
];

/**
 * Helper: Extract OpenGraph image or first article image from detail page
 */
async function fetchArticleDetailInfo(articleUrl) {
    try {
        const res = await fetch(articleUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (res.ok) {
            const html = await res.text();

            const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i);
            
            let imageUrl = ogMatch ? ogMatch[1] : null;

            const cleanText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                                  .replace(/<[^>]+>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .substring(0, 3000);

            return { imageUrl, cleanText };
        }
    } catch (err) {
        console.error("Lỗi đọc trang chi tiết bài báo:", err.message);
    }
    return { imageUrl: null, cleanText: '' };
}

/**
 * 1. Fetch raw articles & images from DanangFantastiCity
 */
async function fetchDanangEventsRaw() {
    const eventsRaw = [];

    try {
        const targetUrl = 'https://danangfantasticity.com/danh-muc/le-hoi-su-kien?id=12925';
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (res.ok) {
            const html = await res.text();
            
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
                        url: fullUrl
                    });
                }
            }
        }
    } catch (err) {
        console.error("Lỗi cào dữ liệu từ DanangFantastiCity:", err.message);
    }

    if (eventsRaw.length === 0) {
        eventsRaw.push(
            {
                source: 'DanangFantastiCity',
                title: 'Lần đầu tiên, biển Mỹ Khê trở thành sân khấu thực cảnh kể chuyện xứ Quảng bằng ánh sáng và âm nhạc',
                url: 'https://danangfantasticity.com/vi/kham-pha/bien-my-khe-tro-thanh-san-khau-thuc-canh'
            },
            {
                source: 'DanangFantastiCity',
                title: 'Hành trình về nguồn tháng Bảy tại Đà Nẵng tại Bảo tàng Đà Nẵng',
                url: 'https://danangfantasticity.com/vi/kham-pha/hanh-trinh-ve-nguon-thang-bay'
            }
        );
    }

    return eventsRaw;
}

/**
 * 2. Use Gemini AI to parse detail text, real image & road closure info into Structured Event JSON
 */
async function parseEventWithGemini(rawItem) {
    const detailInfo = await fetchArticleDetailInfo(rawItem.url);
    const realImageUrl = detailInfo.imageUrl || 'https://danangfantasticity.com/wp-content/uploads/dfc/public/cate-bg/9.jpg';
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            title: rawItem.title,
            location_name: "Bãi biển Mỹ Khê, Đường Võ Nguyên Giáp",
            address: "Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
            district: "Sơn Trà",
            category_name: "Sự kiện văn hóa",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 86400000 * 2).toISOString(),
            short_description: rawItem.title,
            description: `Dữ liệu sự kiện trích xuất từ DanangFantastiCity: ${rawItem.title}`,
            banner_url: realImageUrl,
            thumbnail_url: realImageUrl,
            closed_roads: []
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        const prompt = `Bạn là hệ thống AI trích xuất dữ liệu sự kiện du lịch và giao thông Đà Nẵng.
Hãy phân tích tiêu đề và nội dung bài báo sau từ nguồn DanangFantastiCity:
Tiêu đề: "${rawItem.title}"
Link nguồn: "${rawItem.url}"
Link ảnh đại diện chính: "${realImageUrl}"
Nội dung chi tiết: "${detailInfo.cleanText.substring(0, 1500)}"

Hãy trích xuất và trả về ĐÚNG MỘT CHUỖI JSON (không chứa codeblock, không chứa markdown, chỉ chứa JSON thuần) với định dạng sau:
{
  "title": "Tên sự kiện rõ ràng",
  "location_name": "Tên địa điểm tổ chức cụ thể (ví dụ: Bảo tàng Đà Nẵng, Bãi biển Mỹ Khê, Công viên Biển Đông...)",
  "address": "Địa chỉ đường phố đầy đủ (ví dụ: 24 Trần Phú, Hải Châu, Đà Nẵng)",
  "district": "Tên quận ở Đà Nẵng (Sơn Trà / Hải Châu / Ngũ Hành Sơn / Thanh Khê / Liên Chiểu / Cẩm Lệ)",
  "category_name": "Một trong các nhóm: Sự kiện văn hóa | Lễ hội | Thể thao | Giao thông | Triển lãm",
  "start_time": "Thời gian bắt đầu chuẩn ISO-8601 (ví dụ: 2026-08-15T19:00:00Z)",
  "end_time": "Thời gian kết thúc chuẩn ISO-8601 (ví dụ: 2026-08-17T22:00:00Z)",
  "short_description": "Tóm tắt 1-2 câu về sự kiện (KHÔNG chứa tiền tố hay ký tự lạ)",
  "description": "Mô tả chi tiết sự kiện và hoạt động chính",
  "banner_url": "Trả về đúng chuỗi link ảnh: ${realImageUrl}",
  "thumbnail_url": "Trả về đúng chuỗi link ảnh: ${realImageUrl}",
  "closed_roads": []
}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        if (text.startsWith("```json")) text = text.replace(/^```json/, "");
        if (text.startsWith("```")) text = text.replace(/^```/, "");
        if (text.endsWith("```")) text = text.replace(/```$/, "");

        const parsed = JSON.parse(text.trim());
        parsed.banner_url = realImageUrl;
        parsed.thumbnail_url = realImageUrl;
        return parsed;
    } catch (err) {
        console.error("Lỗi phân tích Gemini AI:", err.message);
        return {
            title: rawItem.title,
            location_name: "Bãi biển Mỹ Khê, Đường Võ Nguyên Giáp",
            address: "Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
            district: "Sơn Trà",
            category_name: "Sự kiện văn hóa",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 86400000 * 2).toISOString(),
            short_description: rawItem.title,
            description: `Thông tin cào từ DanangFantastiCity: ${rawItem.url}`,
            banner_url: realImageUrl,
            thumbnail_url: realImageUrl,
            closed_roads: []
        };
    }
}

/**
 * 3. Geocode location_name to Latitude & Longitude in Da Nang via Google Maps / OSM & Mapbox API
 */
async function geocodeLocationDaNang(locationName, address) {
    const fullQuery = `${locationName || ''} ${address || ''} Đà Nẵng`.trim();
    console.log(`🔍 [AI Geocoding] Đang tra cứu bản đồ tự động cho địa điểm: "${fullQuery}"`);

    // Step A: Check Known Landmarks Dictionary first (100% accurate)
    const combinedStr = fullQuery.toLowerCase();
    for (const landmark of KNOWN_DANANG_LANDMARKS) {
        if (landmark.keywords.some(kw => combinedStr.includes(kw))) {
            console.log(`📍 [Geocoding] Khớp địa danh Đà Nẵng nổi tiếng: "${landmark.keywords[0]}" -> [${landmark.lat}, ${landmark.lng}]`);
            return { latitude: landmark.lat, longitude: landmark.lng };
        }
    }

    // Step B: Query OpenStreetMap / Google Maps Geocoding API
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&countrycodes=vn`;
        const resOSM = await fetch(osmUrl, {
            headers: { 'User-Agent': 'DNPulse-AI-Event-Bot/1.0' }
        });
        if (resOSM.ok) {
            const dataOSM = await resOSM.json();
            if (dataOSM && dataOSM.length > 0) {
                const lat = parseFloat(dataOSM[0].lat);
                const lng = parseFloat(dataOSM[0].lon);
                if (lat >= 15.8 && lat <= 16.3 && lng >= 107.8 && lng <= 108.5) {
                    console.log(`📍 [Geocoding Online] Tra cứu bản đồ thành công: "${dataOSM[0].display_name}" -> [${lat}, ${lng}]`);
                    return { latitude: lat, longitude: lng };
                }
            }
        }
    } catch (err) {
        console.warn("Lỗi tra cứu OpenStreetMap:", err.message);
    }

    // Step C: Fallback to Mapbox Places Geocoding API
    try {
        const query = encodeURIComponent(`${locationName || address || 'Đà Nẵng'}, Đà Nẵng, Việt Nam`);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&proximity=108.22,16.06&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                if (lat >= 15.9 && lat <= 16.2 && lng >= 107.8 && lng <= 108.4) {
                    console.log(`📍 [Mapbox Geocoding] Tra cứu bản đồ thành công: "${data.features[0].place_name}" -> [${lat}, ${lng}]`);
                    return { latitude: lat, longitude: lng };
                }
            }
        }
    } catch (err) {
        console.error("Lỗi geocoding Mapbox:", err.message);
    }

    if (combinedStr.includes('biển') || combinedStr.includes('bãi')) {
        return { latitude: 16.0602, longitude: 108.2462 };
    }

    return { latitude: 16.0544, longitude: 108.2022 };
}

/**
 * 4. Main Service: Fetch, Parse with AI, Geocode accurately & Insert Events
 */
async function runAiEventScraper() {
    console.log("🤖 [AI Event Scraper] Đang cào trang chi tiết tin tức, ảnh thật & tra cứu bản đồ tự động cho địa điểm...");
    
    const rawEvents = await fetchDanangEventsRaw();
    console.log(`📡 [AI Event Scraper] Tìm thấy ${rawEvents.length} bài viết tiềm năng.`);

    const pool = await poolPromise;
    let newEventsCount = 0;
    let skippedDuplicatesCount = 0;

    const categoriesResult = await pool.request().query("SELECT category_id, name FROM EventCategories");
    const categoriesMap = categoriesResult.recordset;
    const defaultCategoryId = categoriesMap.length > 0 ? categoriesMap[0].category_id : 1;

    for (const rawItem of rawEvents.slice(0, 5)) {
        try {
            const parsedEvent = await parseEventWithGemini(rawItem);
            if (!parsedEvent || !parsedEvent.title) continue;

            const coords = await geocodeLocationDaNang(parsedEvent.location_name, parsedEvent.address);
            parsedEvent.latitude = coords.latitude;
            parsedEvent.longitude = coords.longitude;

            const checkDuplicate = await pool.request()
                .input("title", sql.NVarChar, `%${parsedEvent.title.substring(0, 20)}%`)
                .query(`
                    SELECT event_id FROM Events 
                    WHERE title LIKE @title
                `);

            if (checkDuplicate.recordset.length > 0) {
                const existingId = checkDuplicate.recordset[0].event_id;
                await pool.request()
                    .input("event_id", sql.Int, existingId)
                    .input("banner_url", sql.NVarChar, parsedEvent.banner_url)
                    .input("thumbnail_url", sql.NVarChar, parsedEvent.thumbnail_url)
                    .input("latitude", sql.Float, parsedEvent.latitude)
                    .input("longitude", sql.Float, parsedEvent.longitude)
                    .input("location_name", sql.NVarChar, parsedEvent.location_name)
                    .input("address", sql.NVarChar, parsedEvent.address)
                    .input("short_description", sql.NVarChar, parsedEvent.short_description || '')
                    .query(`
                        UPDATE Events 
                        SET banner_url = @banner_url,
                            thumbnail_url = @thumbnail_url,
                            latitude = @latitude,
                            longitude = @longitude,
                            location_name = @location_name,
                            address = @address,
                            short_description = @short_description,
                            updated_at = GETDATE()
                        WHERE event_id = @event_id
                    `);
                console.log(`🔄 [AI Scraper] Đã cập nhật Ảnh thật, Mô tả sạch & Tọa độ bản đồ chuẩn cho sự kiện ID: ${existingId}`);
                skippedDuplicatesCount++;
                continue;
            }

            let matchedCat = categoriesMap.find(c => c.name.toLowerCase().includes((parsedEvent.category_name || '').toLowerCase()));
            let categoryId = matchedCat ? matchedCat.category_id : defaultCategoryId;

            const insertEventResult = await pool.request()
                .input("category_id", sql.Int, categoryId)
                .input("created_by", sql.Int, 1)
                .input("title", sql.NVarChar, parsedEvent.title)
                .input("short_description", sql.NVarChar, parsedEvent.short_description || '')
                .input("description", sql.NVarChar, `${parsedEvent.description || ''}\n\nNguồn: DanangFantastiCity (${rawItem.url})`)
                .input("location_name", sql.NVarChar, parsedEvent.location_name || 'Đà Nẵng')
                .input("latitude", sql.Float, parsedEvent.latitude)
                .input("longitude", sql.Float, parsedEvent.longitude)
                .input("address", sql.NVarChar, parsedEvent.address || 'Đà Nẵng')
                .input("district", sql.NVarChar, parsedEvent.district || 'Hải Châu')
                .input("start_time", sql.DateTime, new Date(parsedEvent.start_time || Date.now()))
                .input("end_time", sql.DateTime, new Date(parsedEvent.end_time || Date.now() + 86400000 * 2))
                .input("banner_url", sql.NVarChar, parsedEvent.banner_url)
                .input("thumbnail_url", sql.NVarChar, parsedEvent.thumbnail_url)
                .input("status", sql.NVarChar, 'pending')
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
            console.log(`✅ [AI Event Scraper] Đã tạo sự kiện mới (ID: ${newEventId}, Tọa độ bản đồ [${parsedEvent.latitude}, ${parsedEvent.longitude}]): "${parsedEvent.title}"`);
            newEventsCount++;

        } catch (itemErr) {
            console.error("Lỗi khi xử lý bài viết sự kiện:", itemErr.message);
        }
    }

    return {
        success: true,
        message: `Hoàn tất AI Scraper từ DanangFantastiCity! Thêm mới ${newEventsCount} sự kiện, cập nhật tọa độ & ảnh thật cho ${skippedDuplicatesCount} tin cũ.`,
        newEventsCount,
        skippedDuplicatesCount
    };
}

module.exports = {
    runAiEventScraper
};
