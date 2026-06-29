/**
 * contextBuilder.js
 */

/**
 * Build context POI cho AI
 * @param {Array}  pois
 * @param {string} sortBy
 * @param {{ total: number, offset: number, remaining: number }} pagination
 */
function buildPOIContext(pois, sortBy, pagination = {}) {
    const { total = 0, offset = 0, remaining = 0 } = pagination;

    if (!pois?.length) {
        if (offset > 0) {
            return `(Đã hiển thị hết tất cả ${total} địa điểm phù hợp. Không còn kết quả nào khác.)`;
        }
        return '(Không tìm thấy địa điểm phù hợp trong hệ thống. Thử tìm kiếm với từ khóa khác.)';
    }

    const sortNote =
        sortBy === 'rating'   ? ' — sắp xếp theo đánh giá cao nhất' :
        sortBy === 'distance' ? ' — sắp xếp theo khoảng cách gần nhất' : '';

    const startIndex = offset + 1;
    const header = `📍 ĐỊA ĐIỂM (hiển thị ${startIndex}–${offset + pois.length} / tổng ${total} kết quả${sortNote}):\n`;

    const list = pois.map((p, i) => {
        let line = `${offset + i + 1}. **${p.name}**`;
        if (p.category)    line += ` [${p.category}]`;
        line += `\n   Địa chỉ: ${p.address || 'N/A'}`;
        if (p.rating)      line += `\n   Đánh giá: ${p.rating}/5 ⭐`;
        if (p.phone_number) line += `\n   SĐT: ${p.phone_number}`;
        if (p.opening_hours) line += `\n   Giờ mở cửa: ${p.opening_hours}`;
        if (p.ticket_price != null && p.ticket_price !== '') {
            const price = Number(p.ticket_price);
            if (!isNaN(price) && price === 0) line += `\n   Giá vé: Miễn phí 🆓`;
            else if (!isNaN(price) && price > 0) line += `\n   Giá vé: ${price.toLocaleString('vi-VN')}đ`;
            else line += `\n   Giá vé: ${p.ticket_price}`;
        }
        // Hiển thị TOÀN BỘ description (không cắt)
        if (p.description) line += `\n   Mô tả: ${p.description}`;
        if (p.distance_km != null) line += `\n   Khoảng cách: ~${Number(p.distance_km).toFixed(1)} km`;
        return line;
    }).join('\n\n');

    const footer = remaining > 0
        ? `\n\n⚠️ AI CẦN BIẾT: Vẫn còn ${remaining} địa điểm khác chưa hiển thị (đã xem ${offset + pois.length}/${total}). Hãy gợi ý người dùng hỏi "xem thêm" hoặc "còn quán nào khác không".`
        : `\n\n✅ Đã hiển thị toàn bộ ${total} địa điểm phù hợp.`;

    return header + list + footer;
}

/**
 * Build context sự kiện cho AI
 * ✅ FIX: Hiển thị cả description đầy đủ (không chỉ short_description)
 */
function buildEventContext(events) {
    if (!events?.length) return '(Không có sự kiện nào đang diễn ra hoặc sắp diễn ra)';

    return `🎉 SỰ KIỆN (${events.length} sự kiện):\n` +
        events.map((e, i) => {
            const start = new Date(e.start_time).toLocaleDateString('vi-VN');
            const end   = new Date(e.end_time).toLocaleDateString('vi-VN');
            let line = `${i + 1}. **${e.title}**`;
            if (e.category) line += ` [${e.category}]`;
            line += `\n   Địa điểm: ${e.location_name || 'N/A'}${e.district ? ` (${e.district})` : ''}`;
            if (e.address && e.address !== e.location_name) line += `\n   Địa chỉ: ${e.address}`;
            line += `\n   Thời gian: ${start} → ${end}`;
            line += `\n   Vé: ${e.is_free ? 'Miễn phí 🆓' : `${Number(e.ticket_price || 0).toLocaleString('vi-VN')}đ`}`;
            // Ưu tiên short_description, fallback sang description
            const desc = e.short_description || e.description;
            if (desc) line += `\n   Mô tả: ${desc}`;
            return line;
        }).join('\n\n');
}

function buildTrafficContext(alerts) {
    if (!alerts?.length) return '(Không có cảnh báo giao thông nào đang hoạt động)';

    const severityIcon = { High: '🔴', Medium: '🟠', Low: '🟡' };

    return `🚦 CẢNH BÁO GIAO THÔNG (${alerts.length} cảnh báo):\n` +
        alerts.map((t, i) => {
            const icon = severityIcon[t.severity] || '⚠️';
            let line = `${i + 1}. ${icon} [${t.severity}] ${t.title}`;
            line += `\n   Vị trí: ${t.location_name || 'N/A'}`;
            if (t.description) line += `\n   Chi tiết: ${t.description}`;
            return line;
        }).join('\n\n');
}

function buildFloodContext(zones) {
    if (!zones?.length) return '(Không có vùng ngập lụt nào đang ghi nhận)';

    const riskIcon = { High: '🔴', Medium: '🟠', Low: '🟡' };

    return `🌊 VÙNG NGẬP LỤT (${zones.length} khu vực):\n` +
        zones.map((f, i) => {
            const icon = riskIcon[f.risk_level] || '💧';
            let line = `${i + 1}. ${icon} ${f.zone_name} — Quận ${f.district}`;
            line += `\n   Mức độ: ${f.risk_level}${f.depth_cm ? ` | Độ sâu: ~${f.depth_cm}cm` : ''}`;
            if (f.typical_flood_months) line += `\n   Tháng ngập thường: ${f.typical_flood_months}`;
            if (f.description) line += `\n   ${f.description}`;
            return line;
        }).join('\n\n');
}

function build(intent, data) {
    switch (intent) {
        case 'poi':     return buildPOIContext(data.pois, data.sortBy, data.pagination);
        case 'event':   return buildEventContext(data.events);
        case 'traffic': return buildTrafficContext(data.traffic);
        case 'flood':   return buildFloodContext(data.flood);
        default:        return '(Câu hỏi chung)';
    }
}

module.exports = { build, buildPOIContext, buildEventContext, buildTrafficContext, buildFloodContext };