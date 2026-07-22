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
                title: 'Biển Mỹ Khê trở thành sân khấu thực cảnh kể chuyện xứ Quảng bằng ánh sáng và âm nhạc',
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
    
    // Quick filter check for general travel articles (Time Out gợi ý, Lonely Planet, Kinh nghiệm...)
    const lowerTitle = rawItem.title.toLowerCase();
    if (lowerTitle.includes('gợi ý') || lowerTitle.includes('lonely planet') || lowerTitle.includes('cẩm nang') || lowerTitle.includes('kinh nghiệm') || lowerTitle.includes('top ')) {
        return {
            is_specific_event: false,
            title: rawItem.title,
            location_name: "Đà Nẵng"
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            is_specific_event: true,
            title: rawItem.title,
            location_name: "Bãi biển Mỹ Khê",
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

        const prompt = `Bạn là hệ thống AI phân loại và trích xuất dữ liệu sự kiện du lịch Đà Nẵng.
Hãy phân tích tiêu đề và nội dung bài báo từ DanangFantastiCity:
Tiêu đề: "${rawItem.title}"
Link nguồn: "${rawItem.url}"
Nội dung chi tiết: "${detailInfo.cleanText.substring(0, 1500)}"

QUY TẮC PHÂN LOẠI QUAN TRỌNG:
1. Nếu đây chỉ là bài báo gợi ý du lịch chung chung (ví dụ: "Time Out gợi ý...", "Cẩm nang du lịch...", "Top món ăn...", "Danh sách chợ...") KHÔNG CÓ ĐỊA ĐIỂM VÀ THỜI GIAN TỔ CHỨC CỤ THỂ HOẶC CHỈ LÀ BÀI VIẾT NÓI CHUNG VỀ ĐÀ NẴNG -> Đặt "is_specific_event": false.
2. Nếu đây là SỰ KIỆN/LỄ HỘI CỤ THỂ có địa điểm tổ chức thực tế -> Đặt "is_specific_event": true.

Trả về ĐÚNG MỘT CHUỖI JSON thuần (không codeblock, không markdown):
{
  "is_specific_event": true/false,
  "title": "Tên sự kiện rõ ràng",
  "location_name": "Tên địa điểm cụ thể (VD: Bãi biển Mỹ Khê, Bảo tàng Đà Nẵng, Cung Thể thao Tuyên Sơn...). Nếu không có địa điểm cụ thể ghi 'Đà Nẵng'",
  "address": "Địa chỉ đường phố đầy đủ",
  "district": "Tên quận ở Đà Nẵng (Sơn Trà / Hải Châu / Ngũ Hành Sơn / Thanh Khê / Liên Chiểu / Cẩm Lệ)",
  "category_name": "Sự kiện văn hóa | Lễ hội | Thể thao | Giao thông | Triển lãm",
  "start_time": "ISO-8601 string",
  "end_time": "ISO-8601 string",
  "short_description": "Tóm tắt 1-2 câu về sự kiện (KHÔNG chứa tiền tố hay ký tự lạ)",
  "description": "Mô tả chi tiết sự kiện",
  "banner_url": "${realImageUrl}",
  "thumbnail_url": "${realImageUrl}",
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
            is_specific_event: true,
            title: rawItem.title,
            location_name: "Bãi biển Mỹ Khê",
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
    console.log("🤖 [AI Event Scraper] Đang cào trang chi tiết tin tức, lọc địa điểm cụ thể & tra cứu bản đồ tự động...");
    
    const rawEvents = await fetchDanangEventsRaw();
    console.log(`📡 [AI Event Scraper] Tìm thấy ${rawEvents.length} bài viết tiềm năng.`);

    const pool = await poolPromise;
    let newEventsCount = 0;
    let skippedDuplicatesCount = 0;
    let skippedNonEventsCount = 0;

    const categoriesResult = await pool.request().query("SELECT category_id, name FROM EventCategories");
    const categoriesMap = categoriesResult.recordset;
    const defaultCategoryId = categoriesMap.length > 0 ? categoriesMap[0].category_id : 1;

    for (const rawItem of rawEvents.slice(0, 5)) {
        try {
            const parsedEvent = await parseEventWithGemini(rawItem);
            if (!parsedEvent || !parsedEvent.title) continue;

            // RULE 1: Skip general travel/recommendation articles without specific locations
            const genericLocations = ['đà nẵng', 'thành phố đà nẵng', 'việt nam', ''];
            const isGenericLoc = genericLocations.includes((parsedEvent.location_name || '').trim().toLowerCase());
            
            if (parsedEvent.is_specific_event === false || isGenericLoc) {
                console.log(`⏩ [Skip Non-Specific Event] Bỏ qua bài báo gợi ý/không có địa điểm tổ chức cụ thể: "${parsedEvent.title}" (Địa điểm: ${parsedEvent.location_name})`);
                skippedNonEventsCount++;
                continue;
            }

            // RULE 2: Enhanced Smart Deduplication (Title similarity or Location + Key phrase match)
            const cleanTitle = parsedEvent.title.toLowerCase();
            const isStagePlay = cleanTitle.includes('sân khấu thực cảnh') || cleanTitle.includes('xứ quảng');
            
            let dupQuery = `SELECT event_id, title FROM Events WHERE title LIKE @exactTitle`;
            const reqDup = pool.request().input("exactTitle", sql.NVarChar, `%${parsedEvent.title.substring(0, 15)}%`);

            if (isStagePlay) {
                dupQuery = `SELECT event_id, title FROM Events WHERE title LIKE '%thực cảnh%' OR title LIKE '%xứ Quảng%'`;
            }

            const checkDuplicate = await reqDup.query(dupQuery);

            if (checkDuplicate.recordset.length > 0) {
                const existingId = checkDuplicate.recordset[0].event_id;
                console.log(`⏩ [Deduplication Match] Phát hiện trùng lặp với sự kiện ID ${existingId}: "${checkDuplicate.recordset[0].title}"`);
                skippedDuplicatesCount++;
                continue;
            }

            // Step B: Geocode location accurately
            const coords = await geocodeLocationDaNang(parsedEvent.location_name, parsedEvent.address);
            parsedEvent.latitude = coords.latitude;
            parsedEvent.longitude = coords.longitude;

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
            console.log(`✅ [AI Event Scraper] Đã tạo sự kiện mới hợp lệ (ID: ${newEventId}, Địa điểm: "${parsedEvent.location_name}"): "${parsedEvent.title}"`);
            newEventsCount++;

        } catch (itemErr) {
            console.error("Lỗi khi xử lý bài viết sự kiện:", itemErr.message);
        }
    }

    return {
        success: true,
        message: `Hoàn tất AI Scraper từ DanangFantastiCity! Thêm mới ${newEventsCount} sự kiện hợp lệ, bỏ qua ${skippedDuplicatesCount} tin trùng và ${skippedNonEventsCount} tin không có địa điểm cụ thể.`,
        newEventsCount,
        skippedDuplicatesCount,
        skippedNonEventsCount
    };
}

module.exports = {
    runAiEventScraper
};
