/**
 * pending-spec.test.js
 *
 * Đây KHÔNG phải test thật — đây là checklist dạng `test.todo` liệt kê các
 * Test Case trong file Excel (TestCases_StateDiagram_v2.xlsx) mà code backend
 * ĐÃ UPLOAD chưa có implementation tương ứng.
 *
 * Khi Jest chạy, các dòng này sẽ hiện trong report dưới mục "todo" — coi như
 * một spec sống (living spec) để dev backend biết còn thiếu gì.
 *
 * Khi bạn implement xong 1 mục, hãy:
 *   1. Viết route/service thật
 *   2. Chuyển test.todo(...) thành test(...) với assertion thật
 *   3. Xoá dòng khỏi file này
 */

describe("MODULE 1&2 – Auth: các nhánh chưa có trong code", () => {
    test.todo(
        "TC_023 (RULE-OTP-01) - Đăng ký mới phải sinh OTP 6 số và set trạng thái UNVERIFIED; " +
        "nhập đúng OTP -> chuyển ACTIVE. Hiện /register không tạo OTP, không có cột status UNVERIFIED."
    );
    test.todo(
        "TC_024 (RULE-OTP-02) - Nhập sai OTP đăng ký -> giữ UNVERIFIED, báo lỗi OTP không chính xác."
    );
    test.todo(
        "TC_025 (RULE-OTP-02, BVA) - Nhập OTP đăng ký thiếu ký tự (5/6 số) -> báo lỗi đủ 6 số."
    );
    test.todo(
        "TC_026 (RULE-2FA-02) - Sai mật khẩu đăng nhập 5 lần liên tiếp -> tự động chuyển LOCKED " +
        "trong 15 phút. Hiện /login không có cơ chế đếm số lần sai liên tiếp."
    );
    test.todo(
        "TC_027 (RULE-2FA-01) - Sai mật khẩu 4 lần liên tiếp -> vẫn ACTIVE (chưa khóa). " +
        "Cần đếm số lần sai liên tiếp theo user/IP, có thể lưu ở cột Users.failed_login_count."
    );
    test.todo(
        "TC_029 (RULE-ADM-01) - Admin mở khóa tài khoản LOCKED -> ACTIVE. " +
        "admin.routes.js hiện chỉ có PUT /users/:id/ban, thiếu route PUT /users/:id/unban."
    );
    test.todo(
        "TC_031 (RULE-REG-02) - User tự xóa tài khoản qua Cài đặt -> trạng thái DELETED, " +
        "đăng xuất, ẩn toàn bộ data cá nhân. Chưa có route DELETE /api/user/account."
    );
    test.todo(
        "TC_032 - Đăng nhập tài khoản DELETED phải trả message riêng " +
        '"Tài khoản không tồn tại trên hệ thống" khác với sai mật khẩu thông thường. ' +
        "Hiện code dùng is_active (0/1) nên không phân biệt được LOCKED vs DELETED."
    );
});

describe("MODULE 3&4 – Tìm kiếm địa điểm (RULE-MAP-01): chưa có endpoint search theo từ khóa", () => {
    test.todo("TC_013 - Tìm kiếm từ khóa hợp lệ trong khu vực Đà Nẵng -> trả vị trí chính xác.");
    test.todo("TC_014 - Tìm kiếm địa điểm ngoài khu vực hỗ trợ -> báo khu vực chưa hỗ trợ.");
    test.todo("TC_015 - Tìm kiếm khi mất kết nối Internet -> popup lỗi mạng (đây là logic phía client, nhưng cần API trả lỗi network rõ ràng/timeout).");
    test.todo("TC_016 - Bấm tìm kiếm khi ô tìm kiếm trống -> không gọi API / disable nút (client-side).");
    test.todo(
        "TC_017 - Từ khóa không tồn tại trong DB -> trả 'Không tìm thấy địa điểm phù hợp' " +
        "(cần GET /api/search?q=... hoặc tương tự, hiện chưa có)."
    );
    test.todo(
        "TC_018 (Security) - Input chuỗi SQL Injection vào search -> không crash, " +
        "không trả lỗi DB. Vì hiện chưa có endpoint search, CHƯA THỂ kiểm chứng " +
        "tham số hoá câu query cho tính năng này. Khi viết endpoint search MỚI, " +
        "bắt buộc dùng sql.NVarChar parameterized input như các route khác đã làm đúng."
    );
    test.todo("TC_019 - Tìm kiếm theo tên danh mục (VD: 'Trường học') -> trả danh sách liên quan.");
    test.todo("TC_020 - Tìm kiếm không phân biệt hoa/thường (case-insensitive).");
    test.todo("TC_021 - Tìm kiếm khi tắt GPS -> yêu cầu bật dịch vụ định vị (client-side check).");
    test.todo("TC_022 - Click chọn gợi ý autocomplete -> điều hướng trực tiếp, không cần gõ đủ.");
});

describe("MODULE 3&4 – Lưu địa điểm yêu thích có TÊN tùy chỉnh (RULE-MAP-01): chưa có field 'name'", () => {
    test.todo(
        "TC_043-046 (BVA độ dài tên 0/1/50/51 ký tự) - poi.routes.js hiện chỉ có " +
        "POST /pois/:id/favorite (toggle nhị phân, KHÔNG nhận tên tùy chỉnh). " +
        "Cần thêm bảng/field lưu route_name hoặc place_name do user đặt, với validate 1-50 ký tự."
    );
    test.todo(
        "TC_047 (EP ký tự đặc biệt trong tên) - cần validate regex chặn ký tự đặc biệt khi lưu tên."
    );
});

describe("MODULE 3&4 – Bộ lọc bản đồ (RULE-MAP-02): chưa có endpoint filter tổng hợp", () => {
    test.todo(
        "TC_048-053 - Áp dụng bộ lọc với tổ hợp Danh mục / Khoảng cách / Quận " +
        "(đủ cả 3, thiếu từng cái, để trống tất cả, không có dữ liệu phù hợp). " +
        "Cần endpoint GET /api/pois (hoặc /events) hỗ trợ filter theo distance + district " +
        "kết hợp category_id; hiện poi.routes.js chỉ filter theo category_id."
    );
    test.todo("TC_054 - Khoảng cách âm -> 400 validate input.");
    test.todo("TC_055 - Khoảng cách vượt ngưỡng tối đa hệ thống -> 400.");
    test.todo("TC_056 - Khoảng cách sai kiểu dữ liệu (chuỗi chữ) -> 400.");
    test.todo("TC_057 - Chọn tỉnh/thành ngoài Đà Nẵng -> báo khu vực chưa hỗ trợ.");
    test.todo("TC_058 - Multi-select nhiều danh mục cùng lúc -> gộp kết quả (OR logic).");
    test.todo("TC_059 - category_id trên URL không tồn tại trong DB -> 404 'Danh mục không tồn tại'.");
    test.todo("TC_060 - Nhấn 'Xóa bộ lọc' -> reset về danh sách mặc định (chủ yếu client-side state).");
});

describe("MODULE 5 – Định tuyến & dẫn đường chống ngập (RULE-DIR-03/04): chưa có route engine", () => {
    test.todo(
        "TC_033 - Bắt đầu dẫn đường khi GPS+mạng OK, tuyến an toàn -> vẽ đường, bật Navigation. " +
        "Cần tích hợp routing engine (OSRM/Mapbox/GraphHopper) + endpoint riêng, hiện chưa có."
    );
    test.todo("TC_034 - Phát hiện ngập real-time trên tuyến đang đi -> cảnh báo + nút tìm đường vòng.");
    test.todo("TC_034B - Tìm đường vòng sau cảnh báo ngập -> tính lại route < 3 giây.");
    test.todo("TC_035 - Tắt GPS khi bắt đầu dẫn đường -> popup yêu cầu bật định vị.");
    test.todo("TC_036 - Mất Internet khi bắt đầu dẫn đường -> báo lỗi mất kết nối.");
    test.todo("TC_036B - GPS trùng tọa độ điểm đích -> popup hoàn thành hành trình.");
    test.todo("TC_037 - Hủy dẫn đường bằng nút X -> kết thúc Navigation, về màn hình bản đồ.");
    test.todo("TC_037B - Đi chệch tuyến -> tự động tính lại lộ trình < 3 giây.");
    test.todo(
        "Ghi chú: savedRoutes.routes.js hiện CHỈ lưu/chia sẻ route_data do client tự tính " +
        "(client gọi routing engine ngoài rồi gửi kết quả lên lưu) — KHÔNG tự tính route " +
        "hay phát hiện ngập trên tuyến. Nếu đây là kiến trúc chủ định, các TC_033-037B " +
        "nên được test ở phía FRONTEND (logic gọi routing API + check FloodZones), " +
        "không phải backend."
    );
});

describe("MODULE 6 – Báo cáo cộng đồng (RULE-REP-02): chưa có route Reports", () => {
    test.todo(
        "TC_032A - Gửi báo cáo ngập hợp lệ (có ảnh, GPS đúng) -> lưu DB trạng thái PENDING. " +
        "Cần bảng CommunityReports/FloodReports + POST /api/reports, hiện chưa có route nào."
    );
    test.todo("TC_039 - GPS báo cáo lệch vị trí thực tế > 2km -> 400 báo lỗi vị trí.");
    test.todo("TC_040 - Gửi báo cáo không kèm ảnh xác minh -> 400 yêu cầu đính kèm ảnh.");
    test.todo("TC_038 / TC_032B - Admin phê duyệt báo cáo (ảnh+GPS hợp lệ) -> PENDING -> ACTIVE, bắn WebSocket.");
    test.todo("TC_041 / TC_032C - Admin từ chối báo cáo (ảnh rác/mờ) -> PENDING -> REJECTED, ẩn khỏi map.");
    test.todo("TC_032D - Admin đóng vùng ngập đã hết -> ACTIVE -> RESOLVED, mở lại định tuyến.");
    test.todo("TC_042 - User xem lịch sử báo cáo cá nhân kèm trạng thái -> GET /api/user/reports.");
    test.todo(
        "Ghi chú: FloodZones (flood.routes.js, admin.routes.js) là dữ liệu admin quản lý sẵn, " +
        "KHÁC với báo cáo do user gửi lên theo flow PENDING/ACTIVE/REJECTED trong Excel. " +
        "Đây là 2 khái niệm khác nhau cần làm rõ trước khi implement."
    );
});

describe("Supplemental TC_061-TC_088: pending implementation coverage", () => {
    test.todo(
        "TC_066 - Login with UNVERIFIED account should redirect/block until OTP verification. " +
        "Current /login does not model UNVERIFIED account state."
    );
    test.todo("TC_068 - Search keyword containing only whitespace needs a search/autocomplete endpoint or client-side test.");
    test.todo("TC_070 - Autocomplete below minimum keyword length is currently frontend logic, no backend autocomplete endpoint.");
    test.todo("TC_072 - Distance filter = 0km should return 400 once /api/pois supports distance filtering.");
    test.todo("TC_074 - Duplicate custom favorite-place name needs a custom name field; current backend only toggles by POI id.");
    test.todo("TC_077 - No safe route when every route is flooded needs a routing engine/service.");
    test.todo("TC_078 - Browser location permission denied belongs to client/browser permission tests.");
    test.todo("TC_079 - Routing API timeout needs a routing service dependency to mock.");
    test.todo("TC_080 - Network loss during active navigation belongs to client offline/reconnect tests.");
    test.todo("TC_081 - Report image upload >10MB needs report upload route/middleware.");
    test.todo("TC_082 - Report invalid file type needs report upload route/middleware.");
    test.todo("TC_083 - Blank report description needs CommunityReports model/route.");
    test.todo("TC_084 - Report description >500 chars needs report validation.");
    test.todo("TC_085 - Duplicate report near same location/time needs report duplicate detection.");
    test.todo("TC_086 - Normal user calling admin report approval API needs admin report routes.");
    test.todo("TC_087 - Re-approving RESOLVED report needs report state machine.");
    test.todo("TC_088 - Empty report history needs GET /api/user/reports; current tests only cover notification empty history.");
});
