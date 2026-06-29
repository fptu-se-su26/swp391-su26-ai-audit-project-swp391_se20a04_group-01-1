/**
 * controllers/aiService.js
 *
 * ✅ FIX: import từ '../services/geminiService' (không phải '../services/aiService'
 *    vì không có file đó — lỗi này khiến server crash ngay khi khởi động)
 */
const { askGemini } = require('../services/geminiService');
const { detectIntent, extractEntities } = require('../services/intentService');
const {
    searchPOIs,
    countPOIs,
    getAllActivePOIs,
    countAllActivePOIs,
} = require('../services/poiService');
const { getActiveEvents }        = require('../services/eventService');
const { getActiveTrafficAlerts } = require('../services/trafficService');
const { getActiveFloodZones }    = require('../services/floodService');
const contextBuilder             = require('../services/contextBuilder');
const conversationService        = require('../services/conversationService');

const PAGE_SIZE = 8;

const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng Bản đồ Thông Minh Đà Nẵng (Smart Map).

NGUYÊN TẮC BẮT BUỘC:
1. Chỉ sử dụng dữ liệu trong phần CONTEXT DATA để trả lời. KHÔNG tự bịa thêm thông tin.
2. Nếu CONTEXT DATA có nhiều kết quả, hãy liệt kê TẤT CẢ các mục trong đó.
3. Nếu CONTEXT DATA trống hoặc ghi "Không tìm thấy", nói: "Hệ thống chưa có thông tin về yêu cầu này."
4. Khi CONTEXT DATA ghi "AI CẦN BIẾT: Vẫn còn X địa điểm khác", PHẢI thông báo điều đó và gợi ý người dùng hỏi "xem thêm".
5. Khi CONTEXT DATA ghi "Đã hiển thị hết", xác nhận với người dùng không còn kết quả nào nữa.
6. Trả lời bằng tiếng Việt, thân thiện, có cấu trúc rõ ràng.
7. Về thời gian di chuyển/lộ trình: hướng dẫn dùng tính năng "Tìm đường" trên bản đồ.

QUY TẮC HIỂN THỊ:
- Địa điểm: liệt kê đánh số, kèm địa chỉ, rating, giá vé nếu có.
- Sự kiện: tên, địa điểm, thời gian, giá vé.
- Giao thông: mức độ và vị trí.
- Ngập lụt: khu vực, mức độ rủi ro, khuyến nghị.

PHẠM VI: Chỉ hỗ trợ thông tin về Đà Nẵng. Câu hỏi ngoài phạm vi → từ chối lịch sự.`;

const chat = async (req, res) => {
    try {
        const { message, sessionId, userLat, userLng } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: 'Tin nhắn không được để trống' });
        }

        const sid    = sessionId || 'default';
        const intent = detectIntent(message);
        const { searchKeyword, location, sortBy, isRequestingMore } = extractEntities(message);

        const parsedLat  = userLat ? parseFloat(userLat) : null;
        const parsedLng  = userLng ? parseFloat(userLng) : null;
        const hasCoords  = parsedLat != null && parsedLng != null && !isNaN(parsedLat) && !isNaN(parsedLng);

        const sessionState = conversationService.getState(sid);
        let newState = { ...sessionState };
        let contextStr = '';

        // ══════════════ POI ══════════════
        if (intent === 'poi') {
            let offset = 0;
            let effectiveKeyword  = searchKeyword;
            let effectiveLocation = location;
            let effectiveSortBy   = sortBy;

            if (isRequestingMore && sessionState.lastIntent === 'poi') {
                // ✅ FIX: giữ nguyên keyword/location/sortBy từ lần hỏi TRƯỚC
                //    (controller cũ bị lỗi: dùng searchKeyword mới thay vì sessionState.poiKeyword)
                offset            = sessionState.poiOffset   || 0;
                effectiveKeyword  = sessionState.poiKeyword  ?? searchKeyword;
                effectiveLocation = sessionState.poiLocation ?? location;
                effectiveSortBy   = sessionState.poiSortBy   ?? sortBy;
            } else {
                // Reset khi bắt đầu câu hỏi mới
                newState.poiKeyword  = searchKeyword;
                newState.poiLocation = location;
                newState.poiSortBy   = sortBy;
                newState.poiUserLat  = hasCoords ? parsedLat : null;
                newState.poiUserLng  = hasCoords ? parsedLng : null;
            }

            // Tọa độ: dùng của session (nếu đang phân trang) hoặc request hiện tại
            const effectiveLat = isRequestingMore
                ? (sessionState.poiUserLat ?? parsedLat)
                : (hasCoords ? parsedLat : null);
            const effectiveLng = isRequestingMore
                ? (sessionState.poiUserLng ?? parsedLng)
                : (hasCoords ? parsedLng : null);

            const hasFilter = effectiveKeyword || effectiveLocation;

            const [pois, total] = await Promise.all([
                hasFilter
                    ? searchPOIs({
                        keyword:  effectiveKeyword,
                        location: effectiveLocation,
                        sortBy:   effectiveSortBy,
                        limit:    PAGE_SIZE,
                        offset,
                        userLat:  effectiveLat,
                        userLng:  effectiveLng,
                    })
                    : getAllActivePOIs({
                        sortBy:  effectiveSortBy,
                        limit:   PAGE_SIZE,
                        offset,
                        userLat: effectiveLat,
                        userLng: effectiveLng,
                    }),
                hasFilter
                    ? countPOIs({ keyword: effectiveKeyword, location: effectiveLocation })
                    : countAllActivePOIs(),
            ]);

            // Lưu offset mới = vị trí kế tiếp để truy vấn
            newState.poiOffset  = offset + pois.length;
            newState.lastIntent = 'poi';

            const remaining = Math.max(0, total - (offset + pois.length));
            contextStr = contextBuilder.buildPOIContext(pois, effectiveSortBy, { total, offset, remaining });
        }

        // ══════════════ EVENT ══════════════
        else if (intent === 'event') {
            const events = await getActiveEvents(location, PAGE_SIZE);
            newState.lastIntent = 'event';
            contextStr = contextBuilder.build('event', { events });
        }

        // ══════════════ TRAFFIC ══════════════
        else if (intent === 'traffic') {
            const traffic = await getActiveTrafficAlerts(location, PAGE_SIZE);
            newState.lastIntent = 'traffic';
            contextStr = contextBuilder.build('traffic', { traffic });
        }

        // ══════════════ FLOOD ══════════════
        else if (intent === 'flood') {
            const flood = await getActiveFloodZones(location, PAGE_SIZE);
            newState.lastIntent = 'flood';
            contextStr = contextBuilder.build('flood', { flood });
        }

        // ══════════════ ROUTE ══════════════
        else if (intent === 'route') {
            newState.lastIntent = 'route';
            contextStr = '(Yêu cầu chỉ đường: Vui lòng sử dụng tính năng "Tìm đường" trực tiếp trên bản đồ để có chỉ dẫn chính xác với thời gian thực.)';
        }

        // ══════════════ GENERAL ══════════════
        else {
            newState.lastIntent = 'general';
            contextStr = '(Câu hỏi chung về ứng dụng Smart Map Đà Nẵng)';
        }

        conversationService.setState(sid, newState);

        const history    = conversationService.getHistory(sid);
        const historyStr = conversationService.formatHistoryForPrompt(history);

        const fullPrompt = `${SYSTEM_PROMPT}
${historyStr}
=== CONTEXT DATA ===
${contextStr}

=== CÂU HỎI ===
${message}`;

        const reply = await askGemini(fullPrompt);

        conversationService.addMessage(sid, 'user',      message);
        conversationService.addMessage(sid, 'assistant', reply);

        res.json({ success: true, reply, intent });

    } catch (err) {
        console.error('Lỗi chatbot:', err);
        res.status(500).json({
            success: false,
            message: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
        });
    }
};

const clearHistory = (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) conversationService.clearSession(sessionId);
    res.json({ success: true, message: 'Đã xóa lịch sử hội thoại' });
};

module.exports = { chat, clearHistory };