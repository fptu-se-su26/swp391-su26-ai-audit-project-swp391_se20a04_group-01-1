| Ngày | Công cụ AI | Prompt tóm tắt | Kết quả dùng được? | Ghi chú |
|------|-----------|----------------|-------------------|---------|
| 2026-05-26 | Gemini | Thiết kế cấu trúc Database SQL Server, chỉ định kiểu dữ liệu cho bảng Users, POIs, Saved_Routes. | Có | Đã thay đổi AUTO_INCREMENT sang IDENTITY(1,1) để tương thích với SQL Server. |
| 2026-05-26 | Gemini | Viết script SQL seeding 20 dòng dữ liệu mẫu cho mỗi bảng để test luồng dữ liệu. | Có | Script chạy tốt, dữ liệu mẫu đã đổ thành công vào Database, kiểm tra được các mối quan hệ khóa ngoại (Foreign Key). |
| 2026-05-26 | Gemini | Xử lý lỗi cài đặt axios do xung đột peer dependencies giữa react-leaflet và phiên bản React 18/19. | Có | Sử dụng flag `--legacy-peer-deps` để ép cài đặt thành công mà không làm ảnh hưởng các thư viện hiện có. |
| 2026-05-26 | Gemini | Xây dựng khung Server Express.js (Node.js) tại cổng 5001, cấu hình kết nối mssql driver tới DB SQL Server. | Có | Cần cấu hình CORS để cho phép trình duyệt React (5173) truy cập API (5001), tránh lỗi Blocked by CORS policy. |
| 2026-05-26 | Gemini | Viết logic API Login và Register cho file authService.ts. | Có | Đã áp dụng bcrypt để hash password và thực hiện query tới DB thành công. |
| 2026-05-26 | Gemini | Tư vấn triển khai hệ thống xác thực JWT (JSON Web Token) cho các route được bảo vệ (ProtectedRoute). | Có | Đã đặt thời gian hết hạn cho token và lưu vào localStorage của trình duyệt. |
| 2026-05-26 | Gemini | Lập lộ trình nâng cao cho Tuần 5: Tích hợp Google OAuth và tối ưu hóa truy vấn POIs trên bản đồ. | Một phần | Đã xác định cần chuẩn bị Client ID từ Google Cloud Console trước khi bắt đầu code. |
