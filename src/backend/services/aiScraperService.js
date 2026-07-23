const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sql, poolPromise } = require('../db');

// Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';

// Known landmark coordinates in Da Nang & Quang Nam to prevent fallback to airport
const KNOWN_DANANG_LANDMARKS = [
    { keywords: ['sông hàn', 'han river', 'hai bên bờ sông hàn', 'bờ sông hàn'], lat: 16.0667, lng: 108.2250 },
    { keywords: ['mỹ khê', 'my khe', 'bãi biển mỹ khê', 'biển mỹ khê'], lat: 16.0602, lng: 108.2462 },
    { keywords: ['hội an', 'hoi an', 'phố cổ hội an'], lat: 15.8801, lng: 108.3380 },
    { keywords: ['công viên biển đông', 'bien dong park'], lat: 16.0678, lng: 108.2472 },
    { keywords: ['cầu rồng', 'dragon bridge'], lat: 16.0610, lng: 108.2272 },
    { keywords: ['cầu sông hàn', 'han river bridge'], lat: 16.0722, lng: 108.2275 },
    { keywords: ['cầu trần thị lý'], lat: 16.0508, lng: 108.2312 },
    { keywords: ['cung thể thao tuyên sơn', 'tuyên sơn'], lat: 16.0360, lng: 108.2240 },
    { keywords: ['sơn trà', 'bán đảo sơn trà', 'chùa linh ứng'], lat: 16.1000, lng: 108.2778 },
    { keywords: ['ngũ hành sơn', 'marble mountains'], lat: 16.0042, lng: 108.2635 },
    { keywords: ['bà nà', 'ba na hills'], lat: 15.9961, lng: 107.9877 },
    { keywords: ['bạch đằng', 'đường bạch đằng'], lat: 16.0680, lng: 108.2240 },
    { keywords: ['trần hưng đạo', 'đường trần hưng đạo'], lat: 16.0650, lng: 108.2300 },
    { keywords: ['bảo tàng đà nẵng', 'bao tang da nang', 'thành điện hải'], lat: 16.0754, lng: 108.2244 },
    { keywords: ['bảo tàng điêu khắc chăm', 'bảo tàng chăm', 'cham museum'], lat: 16.0601, lng: 108.2227 },
    { keywords: ['nhà hát trưng vương'], lat: 16.0689, lng: 108.2208 },
    { keywords: ['chợ đêm sơn trà', 'chợ đêm helio', 'helio'], lat: 16.0381, lng: 108.2253 }
];

/**
 * Word-Overlap Similarity Checker to catch duplicates with slightly different titles
 */
function findDuplicateInList(newTitle, existingEvents) {
    const normalizeWords = (str) => (str || '')
        .toLowerCase()
        .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['bài', 'tin', 'báo', 'tại', 'đà', 'nẵng', 'cho', 'với', 'trong', 'của', 'bằng', 'và', 'trở', 'thành'].includes(w));

    const newWords = normalizeWords(newTitle);

    for (const item of existingEvents) {
        const existingWords = normalizeWords(item.title);
        const intersection = newWords.filter(w => existingWords.includes(w));
        
        // If 3 or more key words overlap (e.g. "sân", "khấu", "thực", "cảnh", "mỹ", "khê") -> DUPLICATE!
        if (intersection.length >= 3) {
            return item;
        }

        // Special check for key phrases like "thực cảnh"
        if (newTitle.toLowerCase().includes('thực cảnh') && item.title.toLowerCase().includes('thực cảnh')) {
            return item;
        }
    }
    return null;
}

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
    
    // Quick title filter for general recommendation articles
    const lowerTitle = rawItem.title.toLowerCase();
    if (lowerTitle.includes('gợi ý') || lowerTitle.includes('lonely planet') || lowerTitle.includes('time out') || lowerTitle.includes('cẩm nang') || lowerTitle.includes('kinh nghiệm') || lowerTitle.includes('top ')) {
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

        const prompt = `Bạn là hệ thống AI phân loại và trích xuất dữ liệu sự kiện du lịch Đà Nẵng & Quảng Nam.
Hãy phân tích tiêu đề và nội dung bài báo từ DanangFantastiCity:
Tiêu đề: "${rawItem.title}"
Link nguồn: "${rawItem.url}"
Nội dung chi tiết: "${detailInfo.cleanText.substring(0, 1500)}"

QUY TẮC PHÂN LOẠI QUAN TRỌNG:
1. Nếu đây chỉ là bài báo gợi ý du lịch chung chung (ví dụ: "Time Out gợi ý...", "Cẩm nang du lịch...", "Top món ăn...", "Danh sách chợ...", "Hành trình về nguồn...") KHÔNG CÓ ĐỊA ĐIỂM VÀ THỜI GIAN TỔ CHỨC CỤ THỂ HOẶC CHỈ LÀ BÀI VIẾT NÓI CHUNG VỀ ĐÀ NẴNG -> Đặt "is_specific_event": false.
2. Nếu đây là SỰ KIỆN/LỄ HỘI CỤ THỂ có địa điểm tổ chức thực tế (VD: Bãi biển Mỹ Khê, Bảo tàng Đà Nẵng, Cung Thể thao Tuyên Sơn, Sông Hàn, Hội An...) -> Đặt "is_specific_event": true.
3. CHỈ trích xuất các sự kiện đang diễn ra trong hiện tại hoặc diễn ra trong tương lai. Nếu sự kiện đã kết thúc hoàn toàn trong quá khứ -> Đặt "is_specific_event": false.

Trả về ĐÚNG MỘT CHUỖI JSON thuần (không codeblock, không markdown):
{
  "is_specific_event": true/false,
  "title": "Tên sự kiện rõ ràng",
  "location_name": "Tên địa điểm cụ thể",
  "clean_searchable_location": "Tên vị trí sạch cho Google Maps (VD: 'Sông Hàn Đà Nẵng', 'Bãi biển Mỹ Khê', 'Phố cổ Hội An', 'Bảo tàng Đà Nẵng')",
  "address": "Địa chỉ đường phố đầy đủ",
  "district": "Tên quận/huyện (Sơn Trà / Hải Châu / Ngũ Hành Sơn / Thanh Khê / Liên Chiểu / Cẩm Lệ / Hội An)",
  "estimated_latitude": 16.0667,
  "estimated_longitude": 108.2250,
  "category_name": "Sự kiện văn hóa | Lễ hội | Thể thao | Giao thông | Triển lãm",
  "start_time": "ISO-8601 string",
  "end_time": "ISO-8601 string",
  "short_description": "Tóm tắt 1-2 câu về sự kiện",
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
            is_specific_event: false,
            title: rawItem.title,
            location_name: "Đà Nẵng"
        };
    }
}

/**
 * 3. Geocode location_name to Latitude & Longitude in Da Nang / Quang Nam via Gemini AI, OSM & Mapbox API
 */
async function geocodeLocationDaNang(locationName, address, cleanSearchable, estLat, estLng) {
    // Step A: If Gemini provided valid estimated coordinates in Da Nang / Quang Nam region, use them!
    if (typeof estLat === 'number' && typeof estLng === 'number') {
        if (estLat >= 15.7 && estLat <= 16.3 && estLng >= 107.8 && estLng <= 108.6) {
            console.log(`📍 [Gemini AI Geocoding] Sử dụng tọa độ từ AI kiến thức địa lý: [${estLat}, ${estLng}]`);
            return { latitude: estLat, longitude: estLng };
        }
    }

    const rawQuery = `${cleanSearchable || ''} ${locationName || ''} ${address || ''}`.trim();
    
    // Clean up noisy words for geocoding queries
    const cleanedQuery = rawQuery
        .replace(/& hai bên bờ/gi, '')
        .replace(/hai bên bờ/gi, '')
        .replace(/các phường/gi, '')
        .replace(/phường/gi, '')
        .replace(/thành phố/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const fullQuery = `${cleanedQuery} Đà Nẵng Việt Nam`.trim();
    const combinedStr = fullQuery.toLowerCase();

    // Step B: Check Known Landmarks Dictionary (100% accurate)
    for (const landmark of KNOWN_DANANG_LANDMARKS) {
        if (landmark.keywords.some(kw => combinedStr.includes(kw))) {
            console.log(`📍 [Geocoding Landmarks] Khớp địa danh nổi tiếng: "${landmark.keywords[0]}" -> [${landmark.lat}, ${landmark.lng}]`);
            return { latitude: landmark.lat, longitude: landmark.lng };
        }
    }

    // Step C: Query OpenStreetMap Geocoding API
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
                if (lat >= 15.7 && lat <= 16.3 && lng >= 107.8 && lng <= 108.6) {
                    console.log(`📍 [Geocoding Online OSM] Tra cứu bản đồ thành công: "${dataOSM[0].display_name}" -> [${lat}, ${lng}]`);
                    return { latitude: lat, longitude: lng };
                }
            }
        }
    } catch (err) {
        console.warn("Lỗi tra cứu OpenStreetMap:", err.message);
    }

    // Step D: Fallback to Mapbox Places Geocoding API
    try {
        const query = encodeURIComponent(`${cleanedQuery || 'Đà Nẵng'}, Việt Nam`);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&proximity=108.22,16.06&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                if (lat >= 15.7 && lat <= 16.3 && lng >= 107.8 && lng <= 108.6) {
                    console.log(`📍 [Mapbox Geocoding] Tra cứu bản đồ thành công: "${data.features[0].place_name}" -> [${lat}, ${lng}]`);
                    return { latitude: lat, longitude: lng };
                }
            }
        }
    } catch (err) {
        console.error("Lỗi geocoding Mapbox:", err.message);
    }

    // Step E: Smart Keyword Fallbacks (Avoid static Airport fallback)
    if (combinedStr.includes('sông') || combinedStr.includes('hàn')) {
        return { latitude: 16.0667, longitude: 108.2250 }; // Sông Hàn
    }
    if (combinedStr.includes('hội an')) {
        return { latitude: 15.8801, longitude: 108.3380 }; // Phố cổ Hội An
    }
    if (combinedStr.includes('biển') || combinedStr.includes('bãi')) {
        return { latitude: 16.0602, longitude: 108.2462 }; // Bãi biển Mỹ Khê
    }
    if (combinedStr.includes('hải châu')) {
        return { latitude: 16.0600, longitude: 108.2200 }; // Quận Hải Châu
    }
    if (combinedStr.includes('sơn trà')) {
        return { latitude: 16.1000, longitude: 108.2778 }; // Quận Sơn Trà
    }

    return { latitude: 16.0602, longitude: 108.2462 }; // Default to My Khe Beach area instead of Airport
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

    // Load existing events from DB into memory for smart deduplication
    const existingEventsResult = await pool.request().query("SELECT event_id, title, location_name FROM Events");
    const existingEvents = existingEventsResult.recordset;

    const categoriesResult = await pool.request().query("SELECT category_id, name FROM EventCategories");
    const categoriesMap = categoriesResult.recordset;
    const defaultCategoryId = categoriesMap.length > 0 ? categoriesMap[0].category_id : 1;

    for (const rawItem of rawEvents.slice(0, 5)) {
        try {
            const parsedEvent = await parseEventWithGemini(rawItem);
            if (!parsedEvent || !parsedEvent.title) continue;

            // RULE 1: Skip general travel/recommendation articles without specific locations
            const genericLocations = ['đà nẵng', 'thành phố đà nẵng', 'việt nam', 'quảng nam', ''];
            const cleanLoc = (parsedEvent.location_name || '').trim().toLowerCase();
            const isGenericLoc = genericLocations.includes(cleanLoc);
            
            if (parsedEvent.is_specific_event === false || isGenericLoc) {
                console.log(`⏩ [Skip Non-Specific Event] Bỏ qua bài viết không có địa điểm cụ thể: "${parsedEvent.title}" (Vị trí: "${parsedEvent.location_name}")`);
                skippedNonEventsCount++;
                continue;
            }

            // RULE 2: Skip events that ended in the past (Only keep current & future events)
            const now = new Date();
            const eventEndTime = parsedEvent.end_time ? new Date(parsedEvent.end_time) : (parsedEvent.start_time ? new Date(parsedEvent.start_time) : null);
            if (eventEndTime && eventEndTime < now) {
                console.log(`⏩ [Skip Past Event] Bỏ qua sự kiện đã diễn ra trong quá khứ: "${parsedEvent.title}" (Thời gian kết thúc: ${eventEndTime.toISOString()})`);
                skippedNonEventsCount++;
                continue;
            }

            // RULE 3: Smart Word-Overlap Deduplication
            const duplicateMatch = findDuplicateInList(parsedEvent.title, existingEvents);
            if (duplicateMatch) {
                console.log(`⏩ [Deduplication Match] Bỏ qua vì đã trùng với sự kiện ID ${duplicateMatch.event_id}: "${duplicateMatch.title}"`);
                skippedDuplicatesCount++;
                continue;
            }

            // Step B: Geocode location accurately
            const coords = await geocodeLocationDaNang(
                parsedEvent.location_name,
                parsedEvent.address,
                parsedEvent.clean_searchable_location,
                parsedEvent.estimated_latitude,
                parsedEvent.estimated_longitude
            );
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
            
            // Add to existing list in memory so subsequent items in same run match against it!
            existingEvents.push({ event_id: newEventId, title: parsedEvent.title, location_name: parsedEvent.location_name });
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
