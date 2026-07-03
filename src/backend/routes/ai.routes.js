const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const weatherClient = require('../utils/weatherClient');

// ==========================================
// 1. DATABASE HELPERS FOR TOOLS
// ==========================================

async function dbGetActiveFloodZones() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT zone_id, zone_name, risk_level, polygon_coordinates, description 
        FROM FloodZones 
        WHERE is_active = 1
    `);
    return result.recordset;
}

async function dbGetTrafficAlerts() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT alert_id, alert_type, title, description, location_name, latitude, longitude, severity 
        FROM TrafficAlerts 
        WHERE is_active = 1
    `);
    return result.recordset;
}

async function dbGetActiveEvents() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT event_id, title, short_description, location_name, latitude, longitude, address, start_time, end_time 
        FROM Events 
        WHERE status = 'approved' AND end_time >= GETDATE()
    `);
    return result.recordset;
}

async function dbGetEventRoadClosures(eventId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input("event_id", sql.Int, eventId)
        .query(`
            SELECT road_id, road_name, restriction_type, restriction_start, restriction_end 
            FROM EventRoad 
            WHERE event_id = @event_id
        `);
    return result.recordset;
}

async function dbSearchPois(category, minRating) {
    const pool = await poolPromise;
    let query = `
        SELECT p.poi_id, p.name, p.latitude, p.longitude, p.address, p.description, p.rating, c.name as category_name
        FROM POIs p
        LEFT JOIN POIsCategories c ON p.category_id = c.id
        WHERE p.is_active = 1
    `;
    const req = pool.request();
    
    let conditions = [];
    if (category) {
        conditions.push("c.name LIKE @category");
        req.input("category", sql.NVarChar, `%${category}%`);
    }
    if (minRating) {
        conditions.push("p.rating >= @min_rating");
        req.input("min_rating", sql.Decimal(2, 1), minRating);
    }
    
    if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
    }
    
    query += " ORDER BY p.rating DESC";
    const result = await req.query(query);
    return result.recordset;
}

async function dbCheckWeather(district) {
    if (district) {
        const districts = weatherClient.getSupportedDistricts();
        const matched = districts.find(d => d.toLowerCase().includes(district.toLowerCase()) || district.toLowerCase().includes(d.toLowerCase()));
        if (matched) {
            return await weatherClient.getWeatherForDistrict(matched);
        }
        return { error: `Không tìm thấy quận '${district}'. Các quận hỗ trợ: ${districts.join(', ')}` };
    } else {
        const districts = weatherClient.getSupportedDistricts();
        const data = [];
        for (const d of districts) {
            const weather = await weatherClient.getWeatherForDistrict(d);
            data.push(weather);
        }
        return data;
    }
}

// ==========================================
// 2. GEMINI TOOLS DECLARATIONS
// ==========================================

const floodZonesTool = {
    name: "get_active_flood_zones",
    description: "Lấy danh sách các khu vực/tuyến đường đang bị ngập lụt tại Đà Nẵng.",
    parameters: {
        type: "OBJECT",
        properties: {},
    }
};

const trafficAlertsTool = {
    name: "get_traffic_alerts",
    description: "Lấy danh sách các sự cố giao thông thời gian thực như kẹt xe, tai nạn, công trình đang thi công.",
    parameters: {
        type: "OBJECT",
        properties: {},
    }
};

const activeEventsTool = {
    name: "get_active_events",
    description: "Lấy danh sách các sự kiện đô thị, lễ hội lớn đang và sắp diễn ra ở Đà Nẵng.",
    parameters: {
        type: "OBJECT",
        properties: {},
    }
};

const eventRoadClosuresTool = {
    name: "get_event_road_closures",
    description: "Lấy thông tin các tuyến đường bị chặn hoặc hạn chế lưu thông do một sự kiện cụ thể gây ra.",
    parameters: {
        type: "OBJECT",
        properties: {
            event_id: {
                type: "INTEGER",
                description: "ID của sự kiện cần tra cứu cấm đường."
            }
        },
        required: ["event_id"]
    }
};

const searchPoisTool = {
    name: "search_pois",
    description: "Tìm kiếm các địa điểm ăn uống, du lịch, giải trí tại Đà Nẵng lọc theo danh mục hoặc rating.",
    parameters: {
        type: "OBJECT",
        properties: {
            category: {
                type: "STRING",
                description: "Tên danh mục cần tìm (ví dụ: Hải sản, Cà phê, Khách sạn, Khu du lịch)."
            },
            min_rating: {
                type: "NUMBER",
                description: "Đánh giá xếp hạng tối thiểu (từ 1.0 đến 5.0)."
            }
        }
    }
};

const checkWeatherTool = {
    name: "check_weather",
    description: "Tra cứu thông tin thời tiết hiện tại (nhiệt độ, trạng thái, lượng mưa) tại các quận/huyện ở Đà Nẵng.",
    parameters: {
        type: "OBJECT",
        properties: {
            district: {
                type: "STRING",
                description: "Tên quận/huyện cần tra cứu (ví dụ: Hải Châu, Thanh Khê, Sơn Trà, Liên Chiểu, Ngũ Hành Sơn, Cẩm Lệ, Hòa Vang). Có thể để trống để tra cứu toàn bộ thành phố."
            }
        }
    }
};

// ==========================================
// 3. SYSTEM INSTRUCTIONS
// ==========================================

const systemInstruction = `
Bạn là Trợ lý AI dẫn đường thông minh có tên "DNPulse Assistant" của dự án DN-Pulse - Hệ thống dẫn đường đô thị thông minh Đà Nẵng.
Nhiệm vụ của bạn là hỗ trợ người dùng tìm kiếm lộ trình, tìm kiếm sự kiện, tra cứu điểm ngập lụt, kẹt xe và địa điểm ăn uống/du lịch tại Đà Nẵng.

Quy tắc ứng xử và định dạng đầu ra:
1. Bạn phải giao tiếp lịch sự, ngắn gọn và hữu ích bằng tiếng Việt.
2. Khi người dùng hỏi đường đi từ điểm A đến điểm B, hãy sử dụng thông tin từ các tools như cảnh báo ngập lụt, kẹt xe, sự kiện cấm đường để đưa ra gợi ý tối ưu nhất.
3. Luôn trả về phản hồi dưới dạng chuỗi JSON có cấu trúc chính xác sau đây ở phần cuối câu trả lời của bạn, ĐẶC BIỆT KHI CẦN tương tác với Bản đồ (ví dụ: vẽ đường đi, hiển thị cảnh báo ngập, cắm marker sự kiện). 

Cấu trúc JSON phản hồi bắt buộc nếu có hành động trên bản đồ (CHỈ trả về JSON nguyên bản, không bọc markdown block \`\`\`json):
{
  "text": "Câu trả lời thân thiện của bạn ở đây giải thích tuyến đường và các cảnh báo...",
  "actions": [
    {
      "type": "SET_ROUTE",
      "payload": {
        "origin": { "lat": 16.0678, "lng": 108.2208, "label": "Cau Rong" },
        "destination": { "lat": 16.0734, "lng": 108.1498, "label": "Dai hoc Bach Khoa" },
        "travelMode": "driving",
        "avoidFlood": true,
        "avoidCongestion": false
      }
    }
  ]
}

Nếu câu hỏi chỉ là trò chuyện thông thường hoặc hỏi đáp thông tin không liên quan trực tiếp đến việc vẽ lại lộ trình, bạn chỉ cần trả về dạng JSON đơn giản:
{
  "text": "Câu trả lời của bạn ở đây...",
  "actions": []
}

QUY TAC BAT BUOC: Ban PHAI tra ve DUY NHAT mot chuoi JSON hop le. KHONG viet bat ky van ban nao truoc hoac sau JSON. KHONG dung markdown hay backtick. KHONG dung comment trong JSON. Neu ban tra ve plain text (khong phai JSON), he thong se bi loi.
Khi hoi ve su kien: dung tool get_active_events de lay danh sach thuc te, sau do goi y lo trinh den su kien.
Khi hoi ve thoi tiet: dung tool check_weather de lay du lieu thoi tiet theo quan/huyen.
`;

// Helper doc don JSON: go markdown, sau do extract JSON object bang regex
function cleanJsonResponse(text) {
    if (!text || !text.trim()) return '';
    let cleaned = text.trim();

    // Buoc 1: Go markdown code block neu co
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    // Buoc 2: Neu da la JSON hop le, tra ve ngay
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        return cleaned;
    }

    // Buoc 3: Tim va trich xuat JSON object tu trong text (model co the viet them text truoc/sau)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }

    return cleaned;
}


// ==========================================
// 4. MOCK DEMO FALLBACK FOR DEMOS
// ==========================================

function getMockResponse(message) {
    const text = message.toLowerCase();
    
    if (text.includes("ngập") || text.includes("lụt")) {
        return {
            text: "⚠️ [Chế độ Demo] Tôi phát hiện đường Hàm Nghi đang có nguy cơ ngập úng cao do mưa lớn kéo dài. Tôi đã tự động thiết lập lộ trình thay thế đi qua đường Lê Duẩn để đến Đại học Bách Khoa an toàn.",
            actions: [
                {
                    type: "SET_ROUTE",
                    payload: {
                        origin: { lat: 16.0678, lng: 108.2208, label: "Cầu Rồng" },
                        destination: { lat: 16.0734, lng: 108.1498, label: "Đại học Bách Khoa" },
                        travelMode: "driving",
                        avoidFlood: true,
                        avoidCongestion: false
                    }
                }
            ]
        };
    }
    
    if (text.includes("sự kiện") || text.includes("pháo hoa") || text.includes("diff")) {
        return {
            text: "🎆 [Chế độ Demo] Tối nay tại Đà Nẵng diễn ra Lễ hội Pháo hoa Quốc tế DIFF dọc bờ sông Hàn. Lộ trình của bạn từ Sân bay đã được dẫn tới bãi đỗ xe gần khán đài chính. Lưu ý: Đường Trần Hưng Đạo đang cấm xe, tôi đã điều hướng tránh cung đường này.",
            actions: [
                {
                    type: "SET_ROUTE",
                    payload: {
                        origin: { lat: 16.0645, lng: 108.2016, label: "Sân bay Đà Nẵng" },
                        destination: { lat: 16.0792, lng: 108.2275, label: "Khán đài DIFF Sông Hàn" },
                        travelMode: "driving",
                        avoidFlood: false,
                        avoidCongestion: true
                    }
                }
            ]
        };
    }
    
    if (text.includes("hải sản") || text.includes("ăn gì") || text.includes("nhà hàng")) {
        return {
            text: "🦞 [Chế độ Demo] Quanh khu vực biển Mỹ Khê, tôi đề xuất quán ăn chất lượng cao: 'Hải Sản Bé Mặn' (4.3 sao, có bãi đỗ xe rộng rãi). Bản đồ đã cắm marker vị trí nhà hàng này cho bạn.",
            actions: [
                {
                    type: "SET_ROUTE",
                    payload: {
                        origin: { lat: 16.0678, lng: 108.2208, label: "Cầu Rồng" },
                        destination: { lat: 16.0664, lng: 108.2471, label: "Hải Sản Bé Mặn Mỹ Khê" },
                        travelMode: "driving",
                        avoidFlood: false,
                        avoidCongestion: false
                    }
                }
            ]
        };
    }

    if (text.includes("thời tiết") || text.includes("mưa") || text.includes("nhiệt độ")) {
        return {
            text: "☀️ [Chế độ Demo] Thời tiết hiện tại ở các quận Đà Nẵng trung bình là 29.5°C, trời nhiều mây. Khu vực quận Liên Chiểu đang có mưa vừa (lượng mưa 3.5mm/h), độ ẩm khoảng 78%, gió nhẹ.",
            actions: []
        };
    }

    return {
        text: `🤖 [Chế độ Demo] Trợ lý DNPulse đã nhận yêu cầu của bạn: "${message}". Để sử dụng trí tuệ nhân tạo Gemini phân tích thời gian thực và gọi dữ liệu hệ thống, vui lòng cấu hình GEMINI_API_KEY ở file cấu hình .env.`,
        actions: []
    };
}

// ==========================================
// 5. POST /api/ai/chat ENDPOINT
// ==========================================

router.post("/chat", async (req, res) => {
    try {
        const { message, history, userLocation } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: "Thiếu câu hỏi đầu vào!" });
        }

        // Nếu có GPS, ghép thêm context vị trí vào đầu tin nhắn để AI biết
        let enrichedMessage = message;
        if (userLocation && userLocation.lat && userLocation.lng) {
            const gpsNote = `[Vị trí GPS hiện tại của người dùng: lat=${userLocation.lat.toFixed(6)}, lng=${userLocation.lng.toFixed(6)}. Khi người dùng nói "từ vị trí của tôi", "từ đây", "chỗ tôi đang đứng" hoặc hỏi GPS, hãy dùng tọa độ này làm điểm xuất phát với label "GPS_USER"] `;
            enrichedMessage = gpsNote + message;
        }

        // Chuyển đổi API Key
        const apiKey = process.env.GEMINI_API_KEY;
        
        // 5.1. CHẠY CHẾ ĐỘ DEMO NẾU THIẾU API KEY
        if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE' || apiKey.trim() === '') {
            console.log("⚠️ Không tìm thấy GEMINI_API_KEY. Kích hoạt chế độ Demo dự phòng.");
            const mockRes = getMockResponse(message);
            return res.json({ success: true, isMock: true, ...mockRes });
        }

        // 5.2. KẾT NỐI GEMINI SDK & THỰC THI REACTION LOOP
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite",  // Replacement chinh thuc cua 2.0-flash-lite, ~1000-1500 req/ngay free tier
                systemInstruction: systemInstruction,
                tools: [{
                    functionDeclarations: [
                        floodZonesTool,
                        trafficAlertsTool,
                        activeEventsTool,
                        eventRoadClosuresTool,
                        searchPoisTool,
                        checkWeatherTool
                    ]
                }]
            });

            // Định dạng lịch sử chat khớp với yêu cầu của SDK
            const formattedHistory = (history || []).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: String(msg.text || '') }]
            }));

            const chat = model.startChat({
                history: formattedHistory
            });

            // Gửi tin nhắn (có kèm GPS context nếu có)
            let result = await chat.sendMessage(enrichedMessage);
            let response = result.response;

            let loopCount = 0;
            const maxLoops = 5;

            // Vòng lặp giải quyết Function Calling
            // Lưu ý: response.functionCalls() là method (gọi hàm), không phải property
            let functionCallsList = response.functionCalls ? response.functionCalls() : [];
            while (functionCallsList && functionCallsList.length > 0 && loopCount < maxLoops) {
                loopCount++;
                const functionResponses = [];
                console.log(`🔄 Vòng lặp Tool #${loopCount}: ${functionCallsList.length} function call(s)`);

                for (const call of functionCallsList) {
                    const { name, args } = call;
                    console.log(`🤖 AI Agent gọi Tool: ${name} với tham số:`, args);
                    
                    let data;
                    try {
                        let rawData;
                        if (name === "get_active_flood_zones") {
                            rawData = await dbGetActiveFloodZones();
                        } else if (name === "get_traffic_alerts") {
                            rawData = await dbGetTrafficAlerts();
                        } else if (name === "get_active_events") {
                            rawData = await dbGetActiveEvents();
                        } else if (name === "get_event_road_closures") {
                            rawData = await dbGetEventRoadClosures(args.event_id);
                        } else if (name === "search_pois") {
                            rawData = await dbSearchPois(args.category, args.min_rating);
                        } else if (name === "check_weather") {
                            rawData = await dbCheckWeather(args.district);
                        } else {
                            rawData = { error: "Không tìm thấy hàm yêu cầu" };
                        }
                        
                        // Sanitize dữ liệu: chuyển Date/Decimal thành kiểu JSON thuần
                        data = JSON.parse(JSON.stringify(rawData));
                        console.log(`✅ Tool ${name} trả về ${Array.isArray(data) ? data.length + ' bản ghi' : 'dữ liệu'}`);
                    } catch (err) {
                        console.error(`Lỗi thực thi hàm ${name}:`, err.message);
                        data = { error: err.message };
                    }

                    functionResponses.push({
                        functionResponse: {
                            name: name,
                            response: { content: data }
                        }
                    });
                }

                // Gửi kết quả của Tools ngược lại cho mô hình
                result = await chat.sendMessage(functionResponses);
                response = result.response;
                // Lấy function calls tiếp theo (nếu có)
                functionCallsList = response.functionCalls ? response.functionCalls() : [];
            }

            // Đọc kết quả cuối cùng dạng văn bản
            let rawText = '';
            try {
                rawText = response.text();
            } catch (textErr) {
                console.warn("⚠️ Không thể đọc text từ response:", textErr.message);
            }
            console.log("💬 AI Response Raw:", rawText);
            
            let parsedResult;
            const cleanedText = cleanJsonResponse(rawText);
            
            if (!cleanedText) {
                // AI trả về chuỗi rỗng - fallback ngay
                parsedResult = {
                    text: "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại.",
                    actions: []
                };
            } else {
                try {
                    parsedResult = JSON.parse(cleanedText);
                } catch (parseError) {
                    console.error("Lỗi parse JSON phản hồi từ AI:", parseError.message, "| Raw:", cleanedText.slice(0, 200));
                    // Fallback nếu AI trả về text thông thường không đúng cấu trúc JSON
                    parsedResult = {
                        text: rawText,
                        actions: []
                    };
                }
            }

            res.json({
                success: true,
                isMock: false,
                text: parsedResult.text || rawText,
                actions: parsedResult.actions || []
            });
        } catch (apiError) {
            console.warn("⚠️ Lỗi kết nối Google API:", apiError.message);
            
            // Xử lý riêng lỗi Rate Limit (429)
            if (apiError.status === 429) {
                return res.json({
                    success: true,
                    isMock: true,
                    text: `⏳ Trợ lý DNPulse hiện đang bận (đã vượt giới hạn số lần gọi API miễn phí). Vui lòng thử lại sau vài phút.\n\n💡 Nếu cần dùng liên tục, hãy nâng cấp Gemini API lên gói trả phí tại https://ai.google.dev`,
                    actions: []
                });
            }

            const mockRes = getMockResponse(message);
            return res.json({
                success: true,
                isMock: true,
                text: `⚠️ [Lỗi mạng] Kết nối tới Google Gemini bị gián đoạn. Trợ lý tạm thời chuyển sang chế độ dự phòng ngoại tuyến:\n\n${mockRes.text}`,
                actions: mockRes.actions
            });
        }


    } catch (error) {
        console.error("❌ Lỗi API Chat AI Agent:", error);
        res.status(500).json({ success: false, message: "Lỗi liên lạc với AI Agent", error: error.message });
    }
});

module.exports = router;
