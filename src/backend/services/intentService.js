/**
 * intentService.js
 *
 * DB POIsCategories có 6 categories (lấy từ POIFeaturedSidebar + POIsLayer):
 *   'Nhà hàng' | 'Khách sạn' | 'Điểm tham quan' | 'Giải trí' | 'Bảo tàng' | 'ATM'
 *
 * SQL trong poiService dùng: c.name LIKE '%keyword%'
 * → searchKeyword PHẢI khớp với tên category thực trong DB
 */

const INTENT_PATTERNS = {
    poi: {
        pattern: /quán|ăn|nhà hàng|cafe|cà phê|khách sạn|hotel|địa điểm|tham quan|du lịch|chơi|mua sắm|siêu thị|bệnh viện|trường|ngân hàng|atm|xăng|điểm đến|chỗ|nơi|tiệm|shop|cửa hàng|bảo tàng|giải trí|vui chơi|spa|massage|gym|yoga|công viên|chùa|đền|nhà thờ|khu vui|khu giải trí/i,
    },
    event: {
        pattern: /sự kiện|event|lễ hội|hoạt động|concert|triển lãm|hội chợ|diễn ra|tổ chức|chương trình/i,
    },
    traffic: {
        pattern: /kẹt|tắc|giao thông|traffic|tai nạn|sự cố|ùn|cảnh báo giao thông/i,
    },
    flood: {
        pattern: /ngập|lụt|flood|mưa|nước dâng|ngập lụt|vùng ngập|cảnh báo ngập/i,
    },
    route: {
        pattern: /lộ trình|đường đi|chỉ đường|route|dẫn đường|từ .+ đến|điều hướng/i,
    },
};

const DA_NANG_LOCATIONS = [
    'hải châu', 'thanh khê', 'liên chiểu', 'ngũ hành sơn', 'sơn trà', 'cẩm lệ', 'hòa vang',
    'cầu rồng', 'cầu thuận phước', 'cầu trần thị lý', 'cầu nguyễn văn trỗi',
    'biển mỹ khê', 'biển nam ô', 'biển non nước',
    'bà nà', 'bán đảo sơn trà', 'đèo hải vân',
    'chợ hàn', 'chợ cồn', 'vincom', 'lotte mart',
    'sân bay', 'ga đà nẵng', 'bến xe',
    'trung tâm', 'hội an',
    'nguyễn văn linh', 'lê duẩn', 'trần phú', 'bạch đằng', 'phan châu trinh',
    'hoàng diệu', '2 tháng 9', 'điện biên phủ', 'ngô quyền',
];

/**
 * POI_KEYWORD_MAP
 *
 * searchKeyword = tên category chính xác trong DB (hoặc từ xuất hiện trong p.name/description).
 * Algorithm chọn entry có term khớp DÀI NHẤT → cụ thể nhất.
 *
 * DB categories: 'Nhà hàng' | 'Khách sạn' | 'Điểm tham quan' | 'Giải trí' | 'Bảo tàng' | 'ATM'
 */
const POI_KEYWORD_MAP = [

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'Nhà hàng'
    // Mọi từ liên quan ăn uống đều map về 'Nhà hàng'
    // ══════════════════════════════════════════════════════════════
    { terms: ['nhà hàng hải sản', 'quán hải sản', 'hải sản', 'đồ biển'], searchKeyword: 'Nhà hàng' },
    { terms: ['nhà hàng buffet', 'buffet hải sản', 'buffet'],             searchKeyword: 'Nhà hàng' },
    { terms: ['bún bò huế', 'bún bò'],   searchKeyword: 'Nhà hàng' },
    { terms: ['mì quảng'],               searchKeyword: 'Nhà hàng' },
    { terms: ['cơm gà hội an', 'cơm gà'], searchKeyword: 'Nhà hàng' },
    { terms: ['bún mắm'],                searchKeyword: 'Nhà hàng' },
    { terms: ['bánh tráng'],             searchKeyword: 'Nhà hàng' },
    { terms: ['bánh mì'],                searchKeyword: 'Nhà hàng' },
    { terms: ['lẩu nướng', 'lẩu'],       searchKeyword: 'Nhà hàng' },
    { terms: ['nướng', 'bbq'],           searchKeyword: 'Nhà hàng' },
    { terms: ['sushi', 'nhật bản'],      searchKeyword: 'Nhà hàng' },
    { terms: ['pizza'],                  searchKeyword: 'Nhà hàng' },
    { terms: ['burger', 'hamburger'],    searchKeyword: 'Nhà hàng' },
    { terms: ['dimsum', 'dim sum'],      searchKeyword: 'Nhà hàng' },
    { terms: ['chè'],                    searchKeyword: 'Nhà hàng' },
    { terms: ['kem', 'ice cream'],       searchKeyword: 'Nhà hàng' },
    { terms: ['xôi'],                    searchKeyword: 'Nhà hàng' },
    { terms: ['nem'],                    searchKeyword: 'Nhà hàng' },
    { terms: ['phở'],                    searchKeyword: 'Nhà hàng' },
    // Chung hơn — đứng sau các món cụ thể
    { terms: ['quán ăn ngon', 'quán ăn', 'quán cơm', 'ăn uống', 'chỗ ăn', 'nơi ăn', 'ăn gì'],
      searchKeyword: 'Nhà hàng' },
    { terms: ['nhà hàng ngon', 'nhà hàng', 'restaurant'], searchKeyword: 'Nhà hàng' },
    // 'quán' đứng cuối để tránh override 'quán ăn'
    { terms: ['quán ngon', 'quán'],      searchKeyword: 'Nhà hàng' },

    // Đồ uống — tìm theo p.name/description (không có category riêng)
    { terms: ['quán cà phê ngon', 'quán cà phê', 'cà phê', 'cafe', 'coffee'], searchKeyword: 'cà phê' },
    { terms: ['trà sữa', 'bubble tea'],  searchKeyword: 'trà sữa' },
    { terms: ['nước ép', 'sinh tố'],     searchKeyword: 'nước ép' },
    { terms: ['quán bar', 'bar', 'pub', 'cocktail'], searchKeyword: 'bar' },

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'Khách sạn'
    // ══════════════════════════════════════════════════════════════
    { terms: ['khách sạn 5 sao', 'khách sạn sang', 'resort 5 sao'], searchKeyword: 'Khách sạn' },
    { terms: ['homestay'],               searchKeyword: 'Khách sạn' },
    { terms: ['resort'],                 searchKeyword: 'Khách sạn' },
    { terms: ['hotel', 'khách sạn'],     searchKeyword: 'Khách sạn' },
    { terms: ['nơi nghỉ', 'chỗ nghỉ', 'lưu trú'], searchKeyword: 'Khách sạn' },

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'Điểm tham quan'
    // ══════════════════════════════════════════════════════════════
    { terms: ['điểm tham quan nổi tiếng', 'điểm tham quan', 'danh lam thắng cảnh', 'danh lam', 'thắng cảnh'],
      searchKeyword: 'Điểm tham quan' },
    { terms: ['di tích lịch sử', 'di tích'], searchKeyword: 'Điểm tham quan' },
    { terms: ['điểm du lịch', 'tham quan', 'du lịch'], searchKeyword: 'Điểm tham quan' },
    { terms: ['chùa chiền', 'chùa'],     searchKeyword: 'Điểm tham quan' },
    { terms: ['đền thờ', 'đền'],         searchKeyword: 'Điểm tham quan' },
    { terms: ['nhà thờ', 'church'],      searchKeyword: 'Điểm tham quan' },
    { terms: ['biển đẹp', 'bãi biển', 'biển'], searchKeyword: 'Điểm tham quan' },
    { terms: ['núi', 'leo núi'],         searchKeyword: 'Điểm tham quan' },

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'Giải trí'
    // Tách riêng khỏi 'Điểm tham quan'
    // ══════════════════════════════════════════════════════════════
    { terms: ['khu vui chơi giải trí', 'công viên giải trí', 'khu giải trí', 'khu vui chơi'],
      searchKeyword: 'Giải trí' },
    { terms: ['vui chơi', 'giải trí'],   searchKeyword: 'Giải trí' },
    { terms: ['karaoke'],                searchKeyword: 'Giải trí' },
    { terms: ['rạp chiếu phim', 'rạp phim', 'cinema'], searchKeyword: 'Giải trí' },
    { terms: ['công viên', 'park'],      searchKeyword: 'Giải trí' },
    { terms: ['spa', 'làm đẹp'],         searchKeyword: 'Giải trí' },
    { terms: ['massage'],                searchKeyword: 'Giải trí' },
    { terms: ['phòng gym', 'tập gym', 'gym'], searchKeyword: 'Giải trí' },
    { terms: ['yoga'],                   searchKeyword: 'Giải trí' },
    { terms: ['bơi lội', 'hồ bơi'],      searchKeyword: 'Giải trí' },

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'Bảo tàng'
    // ══════════════════════════════════════════════════════════════
    { terms: ['viện bảo tàng', 'bảo tàng điêu khắc', 'bảo tàng lịch sử', 'bảo tàng', 'museum'],
      searchKeyword: 'Bảo tàng' },

    // ══════════════════════════════════════════════════════════════
    // CATEGORY: 'ATM'
    // ══════════════════════════════════════════════════════════════
    { terms: ['cây atm', 'máy rút tiền', 'rút tiền', 'atm'], searchKeyword: 'ATM' },
    { terms: ['ngân hàng', 'bank'],      searchKeyword: 'ATM' },

    // ══════════════════════════════════════════════════════════════
    // Không có category riêng — tìm theo p.name / p.description
    // ══════════════════════════════════════════════════════════════
    { terms: ['siêu thị', 'supermarket', 'mua sắm'], searchKeyword: 'siêu thị' },
    { terms: ['cửa hàng tiện lợi', 'cửa hàng', 'shop', 'tiệm'], searchKeyword: 'cửa hàng' },
    { terms: ['bệnh viện', 'hospital'],  searchKeyword: 'bệnh viện' },
    { terms: ['phòng khám', 'clinic'],   searchKeyword: 'phòng khám' },
    { terms: ['nhà thuốc', 'thuốc'],     searchKeyword: 'nhà thuốc' },
    { terms: ['đại học', 'trung học', 'trường học', 'trường'], searchKeyword: 'trường' },
    { terms: ['bưu điện', 'bưu cục'],    searchKeyword: 'bưu điện' },
    { terms: ['cây xăng', 'trạm xăng', 'xăng'], searchKeyword: 'xăng' },
];

// ─────────────────────────────────────────────────────────────────

function detectIntent(message) {
    const msg = message.toLowerCase();
    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
        if (config.pattern.test(msg)) return intent;
    }
    return 'general';
}

function extractEntities(message) {
    const msg = message.toLowerCase();

    // Tìm TẤT CẢ entry có ít nhất 1 term khớp
    const matched = POI_KEYWORD_MAP.filter(entry =>
        entry.terms.some(t => msg.includes(t))
    );

    let searchKeyword = null;
    if (matched.length > 0) {
        // Chọn entry có term khớp DÀI NHẤT → cụ thể nhất
        matched.sort((a, b) => {
            const lenA = Math.max(...a.terms.filter(t => msg.includes(t)).map(t => t.length));
            const lenB = Math.max(...b.terms.filter(t => msg.includes(t)).map(t => t.length));
            return lenB - lenA;
        });
        searchKeyword = matched[0].searchKeyword;
    }

    const location = DA_NANG_LOCATIONS.find(loc => msg.includes(loc)) || null;

    let sortBy = 'default';
    if (/gần|gần đây|gần nhất/.test(msg))                                     sortBy = 'distance';
    if (/ngon|tốt|chất lượng|đánh giá cao|rating|hay|tuyệt|nổi tiếng/.test(msg)) sortBy = 'rating';
    if (/rẻ|giá rẻ|tiết kiệm|bình dân/.test(msg))                             sortBy = 'price';

    const isRequestingMore = /thêm|khác|nữa|còn|tiếp theo|xem thêm|nhiều hơn/.test(msg);

    return { searchKeyword, location, sortBy, isRequestingMore };
}

module.exports = { detectIntent, extractEntities };