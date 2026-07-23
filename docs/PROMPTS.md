# Prompt Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học | Software development project |
| Mã môn học | SWP391 |
| Lớp | SE20A04 |
| Học kỳ | SU26 |
| Tên bài tập / Project | DN-Pulse (Hệ thống bản đồ cảnh báo giao thông & sự kiện đô thị Đà Nẵng) |
| Tên sinh viên / Nhóm | Group01 |
| MSSV / Danh sách MSSV | DE190285 (Võ Thị Mỹ Xuân) - DE190462 (Nguyễn Hữu Phúc) - DE190716 (Nguyễn Nho Trường Phát) - DE191103 (Tô Thị Oanh) |
| Giảng viên hướng dẫn | Thầy Lê Thiện Nhật Quang |
| Repository URL | https://github.com/fptu-se-su26/swp391-su26-ai-audit-project-swp391_se20a04_group-01-1 |
| Ngày bắt đầu | 20/05/2026 |
| Ngày cập nhật gần nhất | 24/07/2026 |

---

## 2. Mục đích của file Prompt Log

File này dùng để ghi lại các prompt quan trọng đã sử dụng trong quá trình thực hiện bài tập, lab, assignment hoặc project.

Sinh viên/nhóm cần ghi lại:

- Đã hỏi AI điều gì.
- Mục đích sử dụng prompt.
- Công cụ AI đã sử dụng.
- AI đã trả lời hoặc gợi ý gì.
- Kết quả đó có được áp dụng vào bài hay không.
- Sinh viên/nhóm đã kiểm tra, chỉnh sửa hoặc cải tiến gì sau khi nhận kết quả từ AI.

---

## 3. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng.

- [x] ChatGPT
- [x] Gemini
- [x] Claude
- [x] GitHub Copilot
- [ ] Cursor
- [x] Antigravity
- [ ] Microsoft Copilot
- [ ] Perplexity
- [ ] Công cụ khác: ....................................

---

## 4. Bảng tổng hợp prompt đã sử dụng

| STT | Ngày | Công cụ AI | Mục đích | Prompt tóm tắt | Kết quả chính | Có sử dụng vào bài không? | Minh chứng |
|---:|---|---|---|---|---|---|---|
| 1 | 21/05/2026 | Gemini | Phân tích Use Case & Bóc tách Actors | "Tôi đang làm đồ án SWP391 bản đồ DN-Pulse, đóng vai BA bóc tách Actors, Use Cases và Flow cho Lưu địa điểm yêu thích..." | Danh sách 4 Actors, 5 Use Cases và kịch bản Basic/Alternative Flow chi tiết | Có | Log #1 (Võ Thị Mỹ Xuân) |
| 2 | 23/05/2026 | ChatGPT | Tư vấn kiến trúc & tính năng bản đồ giao thông | "Tư vấn công nghệ và kiến trúc hệ thống bản đồ cảnh báo giao thông, ngập lụt và AI trợ lý cho TP. Đà Nẵng..." | Đề xuất tech stack React + Mapbox GL JS + Node Express + Antigravity AI Agent | Có | Log #1 (Nguyễn Hữu Phúc) |
| 3 | 26/05/2026 | Gemini | Thiết kế luồng Stateless Auth & JWT RBAC | "Hãy thiết kế luồng xác thực JWT cho 2 role User và Admin, hỗ trợ Refresh Token và middleware kiểm tra quyền hạn..." | Sơ đồ luồng JWT Auth, Refresh Token Rotation & mẫu middleware verifyRole | Có | Log #1 (Tô Thị Oanh) |
| 4 | 30/05/2026 | ChatGPT | Thiết kế Database CSDL Spatial | "Viết câu lệnh DDL SQL khởi tạo các bảng users, events, pois, routes với chỉ mục spatial index..." | Script DDL SQL với các cột Latitude/Longitude và Spatial Indexing | Có | `seed_pois.sql` (Nguyễn Nho Trường Phát) |
| 5 | 05/06/2026 | ChatGPT | Debug lỗi vá lỗ hổng bảo mật 2FA OTP | "Backend đang bị lỗi nhập OTP sai vẫn cấp JWT token đăng nhập thành công. Kiểm tra lại auth controller..." | Phát hiện thiếu verification check trước bước cấp token, bổ sung strict validation | Có | `auth.controller.js` (Tô Thị Oanh) |
| 6 | 15/06/2026 | Antigravity | Phát triển tính năng Đồng bộ Sự kiện & Chỉ đường | "Tôi muốn kết nối API sự kiện giao thông/cấm đường hiển thị thành Marker động trên Mapbox với chỉ đường đa điểm..." | Code React Mapbox layer rendering, Multi-stop routing control và filter bar | Có | Commit `c8147b77` (Nguyễn Hữu Phúc) |
| 7 | 24/06/2026 | Gemini | Tối ưu Virtual DOM Marker & Axios Interceptor | "Bản đồ bị giật lag khi render Marker POI. Refactor sang Virtual DOM isolation và Axios Interceptor refresh token..." | Component Marker isolation và Axios Interceptors tự làm mới token 401 | Có | `src/frontend/utils/api.ts` (Võ Thị Mỹ Xuân) |
| 8 | 29/06/2026 | Antigravity | Triển khai AI Agent dẫn đường thông minh | "Viết component DNPulse AI Assistant hỗ trợ hỏi đáp bằng ngôn ngữ tự nhiên về lộ trình, thời tiết và cảnh báo..." | UI Chat Assistant widget, n8n/LLM integration service & function calling định tuyến | Có | Component `AIAssistant` (Nguyễn Hữu Phúc) |
| 9 | 08/07/2026 | Antigravity | Triển khai Web3Forms Form & Deep-linking | "Viết component SupportTab trong Profile tích hợp Web3Forms API gửi email và xử lý URL routeId sang bản đồ..." | `SupportTab.tsx` với Web3Forms API và URL parameter route loader | Có | Commit `d0f4657f` (Võ Thị Mỹ Xuân) |
| 10 | 16/07/2026 | Antigravity | Fix lỗi đường dẫn tương đối `/uploads/` banner | "Ảnh banner sự kiện bị lỗi 404 do đường dẫn tương đối `/uploads/` thiếu backend domain. Gợi ý helper function..." | Helper function `getImageUrl()` tự động prepend `VITE_BACKEND_URL` | Có | Commit `75e10d34` (Nguyễn Nho Trường Phát) |

---

## 5. Prompt chi tiết

---

### Prompt số 1

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/05/2026 |
| Công cụ AI | Gemini |
| Mục đích | Phân tích Use Case & Bóc tách Actors cho module Authentication và Favorites |
| Phần việc liên quan | Requirement / Design |
| Mức độ sử dụng | Hỏi ý tưởng / Hỏi phân tích nghiệp vụ |

#### 5.1. Prompt nguyên văn

```text
Tôi đang làm đồ án SWP391 xây dựng hệ thống bản đồ số DN-Pulse. Tôi chịu trách nhiệm hai module chính là Đăng nhập bên thứ ba (Google Login) và Hệ thống lưu giữ lịch sử/địa điểm yêu thích (Favorites). Hãy đóng vai trò là một Business Analyst (BA) chuyên nghiệp, giúp tôi bóc tách các Actor (Tác nhân), liệt kê toàn bộ các Use Case cần vẽ cho hệ thống này và mô tả chi tiết kịch bản (Flow) của Use Case "Lưu địa điểm yêu thích" bao gồm Basic Flow và Alternative Flow để tôi tiến hành vẽ sơ đồ UML.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Võ Thị Mỹ Xuân cần chuẩn bị tài liệu phân tích nghiệp vụ (Use Case Specification) cho báo cáo Requirement Review tuần 2.

#### 5.3. Kết quả AI trả về

AI đưa ra cấu trúc phân rã gồm 4 Tác nhân (Guest, Member, Mapbox API, Google OAuth), danh sách 5 Use Cases cốt lõi và kịch bản chi tiết cho Use Case "Lưu địa điểm yêu thích".

#### 5.4. Kết quả đã áp dụng vào bài

Áp dụng danh sách Use Cases để vẽ sơ đồ UML Use Case Diagram trong StarUML và xây dựng Toast Notifications cho luồng rẽ nhánh (Alternative Flow).

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Sơ đồ ban đầu của AI tách rời "Lưu địa điểm" và "Lưu lộ trình". Sinh viên đã hợp nhất thành module quản lý tập trung **Favorites Management** với quan hệ `<<extend>>` và `<<include>>` ngắn gọn hơn.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Docs requirement commit |
| File liên quan | `docs/Vo_Thi_My_Xuan/AI_AUDIT_LOG.md` |
| Screenshot | Sơ đồ Use Case Diagram |
| Kết quả chạy/test | Pass Requirement Review |
| Link tài liệu/báo cáo | `docs/` |
| Ghi chú khác | Hoàn thành đúng tiến độ tuần 2 |

#### 5.8. Ghi chú thêm

```text
Prompt đóng vai (Role-playing prompt) mang lại hiệu quả phân tích nghiệp vụ rất cao.
```

---

### Prompt số 2

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 23/05/2026 |
| Công cụ AI | ChatGPT |
| Mục đích | Phân tích kiến trúc tổng quan & Đề xuất tính năng bản đồ giao thông Đà Nẵng |
| Phần việc liên quan | Requirement / Architecture Design |
| Mức độ sử dụng | Hỏi ý tưởng / Hỏi kiến trúc hệ thống |

#### 5.1. Prompt nguyên văn

```text
Tôi muốn làm một dự án môn học về một map có cảnh báo ngập khi trời mưa, cảnh báo tắc đường, gợi ý đường đi và tích hợp AI dẫn đường cho thành phố Đà Nẵng. Hãy gợi ý kiến trúc tổng quan, các công nghệ nên dùng (Frontend, Backend, Database, GIS/Map Engine) và danh sách các tính năng cốt lõi cho nhóm 4 người triển khai trong 9 tuần.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Nguyễn Hữu Phúc khảo sát công nghệ và đề xuất khung giải pháp kỹ thuật cho dự án DN-Pulse.

#### 5.3. Kết quả AI trả về

ChatGPT đề xuất kiến trúc Web SPA dùng React + Mapbox GL JS ở Frontend, Node.js + Express REST API ở Backend, PostgreSQL + PostGIS lưu trữ dữ liệu bản đồ và AI Agent trợ lý ngôn ngữ tự nhiên.

#### 5.4. Kết quả đã áp dụng vào bài

Áp dụng toàn bộ khung kiến trúc và công nghệ được gợi ý để xây dựng cấu trúc thư mục dự án và chọn Mapbox GL JS làm bản đồ nền.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Thay vì dùng GIS Server rườm rà (Geoserver), nhóm tối ưu đơn giản bằng cách dùng Mapbox Vector Tiles và REST API tùy chỉnh để phản hồi nhanh hơn.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Architecture documentation |
| File liên quan | `docs/Nguyen_Huu_Phuc/AI_AUDIT_LOG.md` |
| Screenshot | Sơ đồ kiến trúc tổng quan |
| Kết quả chạy/test | Thông qua thiết kế nhóm |
| Link tài liệu/báo cáo | `README.md` |
| Ghi chú khác | Cài đặt thành công Mapbox GL |

#### 5.8. Ghi chú thêm

```text
Prompt mở (Open-ended prompt) giúp nhóm mở rộng tầm nhìn về kiến trúc GIS Web.
```

---

### Prompt số 3

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 26/05/2026 |
| Công cụ AI | Gemini |
| Mục đích | Thiết kế luồng xác thực Stateless Authentication & Phân quyền RBAC bằng JWT |
| Phần việc liên quan | Design / Backend / Security |
| Mức độ sử dụng | Hỏi thiết kế giải pháp & sinh code mẫu |

#### 5.1. Prompt nguyên văn

```text
Tôi đang xây dựng backend Node.js/Express cho hệ thống bản đồ DN-Pulse. Hệ thống có 2 role là USER và ADMIN. Hãy thiết kế luồng xác thực JWT hoàn chỉnh không lưu session (stateless auth), giải thích cơ chế Refresh Token để bảo mật và viết bộ middleware `verifyToken`, `verifyRole(roles)` bằng JavaScript ES6.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Tô Thị Oanh cần thay thế cơ chế hardcode tài khoản ban đầu bằng luồng xác thực JWT bảo mật cho các tuyến API Admin và User.

#### 5.3. Kết quả AI trả về

AI cung cấp sơ đồ tuần tự (Sequence Diagram) luồng cấp Access Token (hạn 15 phút) & Refresh Token (hạn 7 ngày) lưu trong HttpOnly Cookie, kèm mã nguồn 2 middleware `verifyToken` và `checkAdminRole`.

#### 5.4. Kết quả đã áp dụng vào bài

Sử dụng cấu trúc middleware `verifyToken` và `verifyRole` để bảo vệ các tuyến API `/api/admin/*` và `/api/user/profile`.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Bổ sung thêm bước kiểm tra trạng thái vô hiệu hóa tài khoản (`is_active == false`) trực tiếp trong middleware trước khi cho phép truy cập.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | JWT Auth middleware commit |
| File liên quan | `src/backend/middleware/auth.middleware.js` |
| Screenshot | Postman JWT Authorization Test |
| Kết quả chạy/test | 200 OK for valid JWT, 403 Forbidden for unauthorized role |
| Link tài liệu/báo cáo | `docs/To_Thi_Oanh/AI_AUDIT_LOG.md` |
| Ghi chú khác | Bảo mật dữ liệu người dùng |

#### 5.8. Ghi chú thêm

```text
Giúp nhóm hoàn thiện kiến trúc bảo mật backend nhanh chóng.
```

---

### Prompt số 4

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 30/05/2026 |
| Công cụ AI | ChatGPT |
| Mục đích | Thiết kế Database Schema và tạo script SQL DDL với Spatial Indexing |
| Phần việc liên quan | Database / Schema Design |
| Mức độ sử dụng | Hỏi sinh code SQL & tối ưu chỉ mục |

#### 5.1. Prompt nguyên văn

```text
Tôi làm phần Database cho hệ thống bản đồ DN-Pulse. Viết script SQL DDL tạo các bảng `users`, `events`, `pois`, `routes`, `reviews` với đầy đủ ràng buộc khóa chính, khóa ngoại, enum status và đánh Spatial Index cho cột latitude/longitude để tối ưu truy vấn bán kính xung quanh vị trí người dùng.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Nguyễn Nho Trường Phát chịu trách nhiệm thiết kế hạ tầng CSDL và viết file khởi tạo dữ liệu mẫu cho hệ thống.

#### 5.3. Kết quả AI trả về

ChatGPT trả về đoạn script SQL DDL chuẩn hóa (3NF) chứa đầy đủ cấu trúc bảng, kiểu dữ liệu `DECIMAL(10, 8)` cho tọa độ và lệnh `CREATE INDEX idx_pois_coords ON pois(latitude, longitude)`.

#### 5.4. Kết quả đã áp dụng vào bài

Sử dụng trực tiếp script DDL làm nền tảng cho file `DNPulse_DB_final.sql` và dữ liệu mẫu `seed_pois.sql`.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Đánh lại chuỗi ID tự tăng tự động cho các bảng để tránh lỗi trùng lặp khóa chính khi import dữ liệu POI nhiều lần.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Database scripts commit |
| File liên quan | `docs/Database/DNPulse_DB_final.sql`, `seed_pois.sql` |
| Screenshot | ERD Sơ đồ CSDL |
| Kết quả chạy/test | Import SQL thành công 100% |
| Link tài liệu/báo cáo | `docs/Nguyen_Nho_Truong_Phat/AI_AUDIT_LOG.md` |
| Ghi chú khác | CSDL phản hồi < 50ms |

#### 5.8. Ghi chú thêm

```text
Giúp tiết kiệm thời gian gõ cú pháp SQL DDL thủ công.
```

---

### Prompt số 5

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 05/06/2026 |
| Công cụ AI | ChatGPT |
| Mục đích | Debug lỗi lỗ hổng bảo mật bypass 2FA OTP trong luồng Đăng nhập |
| Phần việc liên quan | Backend / Security Debug |
| Mức độ sử dụng | Hỏi debug lỗi & giải pháp khắc phục |

#### 5.1. Prompt nguyên văn

```text
Backend Express của tôi bị lỗi bảo mật nghiêm trọng: Khi người dùng bấm đăng nhập OTP, nếu nhập sai mã OTP thì server vẫn trả về Access Token và đăng nhập thành công. Đây là code controller `verifyOtp` của tôi, hãy tìm nguyên nhân và sửa lại cho đúng.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Tô Thị Oanh phát hiện lỗ hổng bảo mật khi kiểm thử tự động API xác thực OTP 2FA.

#### 5.3. Kết quả AI trả về

ChatGPT chỉ ra nguyên nhân do controller thiếu mệnh đề `if (!isOtpValid) return res.status(400)...` trước lệnh `generateToken()`, dẫn đến code tiếp tục chạy xuống bước cấp token bất kể OTP đúng hay sai.

#### 5.4. Kết quả đã áp dụng vào bài

Cập nhật lại logic trong `auth.controller.js`, thêm bước kiểm tra nghiêm ngặt trạng thái OTP và hủy mã ngay sau khi xác thực thành công.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Bổ sung thêm giới hạn số lần nhập sai OTP (tối đa 5 lần) để chống tấn công brute-force.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Security fix OTP commit |
| File liên quan | `src/backend/controllers/auth.controller.js` |
| Screenshot | Postman test nhập sai OTP bị 400 Bad Request |
| Kết quả chạy/test | Pass 100% security test cases |
| Link tài liệu/báo cáo | `docs/To_Thi_Oanh/AI_AUDIT_LOG.md` |
| Ghi chú khác | Vá xong hổng bảo mật OTP 2FA |

#### 5.8. Ghi chú thêm

```text
Cung cấp code lỗi thực tế giúp AI xác định nguyên nhân ngay lập tức.
```

---

### Prompt số 6

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 15/06/2026 |
| Công cụ AI | Antigravity |
| Mục đích | Phát triển tính năng Đồng bộ Sự kiện Đô thị lên Bản đồ chính & Chỉ đường đa điểm |
| Phần việc liên quan | Frontend / Map Logic |
| Mức độ sử dụng | Hỏi sinh code & tối ưu giao diện |

#### 5.1. Prompt nguyên văn

```text
Tôi muốn phát triển tính năng "Đồng bộ & Hiển thị Sự kiện Đô thị lên Bản đồ chính (Home.tsx)" cho dự án DNPulse bằng React TypeScript + Mapbox GL. Cần kết nối API backend `/api/events/active`, render các điểm cấm đường/ngập lụt dưới dạng Marker động có hiệu ứng nhấp nháy, hiển thị Popup thông tin chi tiết và hỗ trợ tính năng chỉ đường qua nhiều điểm dừng (Multi-stop routing).
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Nguyễn Hữu Phúc triển khai tính năng cốt lõi hiển thị lớp dữ liệu giao thông theo thời gian thực trên bản đồ.

#### 5.3. Kết quả AI trả về

Antigravity sinh toàn bộ mã nguồn React Component quản lý Mapbox Layer, hàm fetch API sự kiện, xử lý sự kiện click Marker mở Sidebar chi tiết và bộ điều khiển chỉ đường Multi-stop.

#### 5.4. Kết quả đã áp dụng vào bài

Áp dụng mã nguồn vào `Home.tsx` và tạo commit `c8147b77` nâng cấp trải nghiệm người dùng trên bản đồ.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Tối ưu thuật toán lọc sự kiện theo trạng thái active (`active_only=true`) ở server để giảm tải dung lượng JSON truyền qua mạng.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Commit `c8147b77` |
| File liên quan | `src/frontend/pages/Home/`, `events.routes.js` |
| Screenshot | Hiển thị Marker cấm đường trên bản đồ |
| Kết quả chạy/test | Dẫn đường đa điểm mượt mà |
| Link tài liệu/báo cáo | `docs/Nguyen_Huu_Phuc/AI_AUDIT_LOG.md` |
| Ghi chú khác | Hoàn thiện module bản đồ chính |

#### 5.8. Ghi chú thêm

```text
Sử dụng Antigravity giúp tạo component React TypeScript chính xác với thiết kế dự án.
```

---

### Prompt số 7

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/06/2026 |
| Công cụ AI | Gemini |
| Mục đích | Tối ưu Virtual DOM Marker Mapbox & Bổ sung Axios Interceptor refresh token |
| Phần việc liên quan | Frontend Performance / Network Interceptors |
| Mức độ sử dụng | Hỏi tối ưu code & xử lý bất đồng bộ |

#### 5.1. Prompt nguyên văn

```text
Giao diện bản đồ của tôi bị giật lag khi hiển thị hơn 200 Marker POI cùng lúc. Hãy hướng dẫn cách refactor render Marker để không gây re-render toàn bộ React tree. Đồng thời viết bộ Axios Response Interceptor tự động bắt lỗi 401 Unauthorized để gọi API `/api/auth/refresh-token` cấp lại token mới mà không bắt người dùng đăng nhập lại.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Võ Thị Mỹ Xuân tối ưu hiệu năng bản đồ và xử lý trải nghiệm tự động làm mới phiên đăng nhập cho người dùng.

#### 5.3. Kết quả AI trả về

Gemini hướng dẫn tách biệt Marker thành các Pure Component độc lập dùng `React.memo` và cung cấp mã nguồn Axios Interceptor có hàng đợi (Request Queue) xử lý retry các request bị tạm dừng trong lúc refresh token.

#### 5.4. Kết quả đã áp dụng vào bài

Triển khai thành công Axios Interceptor trong `src/frontend/utils/api.ts` và áp dụng `React.memo` cho bộ Marker POI.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Tối ưu thêm cơ chế hủy request trùng lặp (Axios CancelToken) khi người dùng di chuyển bản đồ liên tục.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Axios Interceptor commit |
| File liên quan | `src/frontend/utils/api.ts` |
| Screenshot | Network tab tự động refresh token 401 |
| Kết quả chạy/test | FPS bản đồ tăng từ 30 lên 60 FPS |
| Link tài liệu/báo cáo | `docs/Vo_Thi_My_Xuan/AI_AUDIT_LOG.md` |
| Ghi chú khác | Trải nghiệm cuộn bản đồ siêu mượt |

#### 5.8. Ghi chú thêm

```text
Giải quyết triệt để lỗi trải nghiệm người dùng bị đăng xuất vô lý.
```

---

### Prompt số 8

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 29/06/2026 |
| Công cụ AI | Antigravity / ChatGPT |
| Mục đích | Triển khai AI Agent dẫn đường thông minh (DNPulse Assistant) tích hợp vào bản đồ |
| Phần việc liên quan | Frontend / Backend / AI Agent |
| Mức độ sử dụng | Hỏi sinh code & tối ưu tích hợp |

#### 5.1. Prompt nguyên văn

```text
Tôi muốn phát triển tính năng "Trợ lý ảo AI Assistant (DNPulse Assistant)" tích hợp trực tiếp vào giao diện bản đồ chính (React TypeScript + TailwindCSS). Trợ lý AI cần hỗ trợ người dùng bằng ngôn ngữ tự nhiên: hỏi lộ trình đi tránh ngập lụt, kiểm tra thời tiết Đà Nẵng, tìm địa điểm ăn uống/cây xăng gần nhất và hiển thị tuyến đường gợi ý lên Mapbox. Hãy viết React Component floating chat widget và hàm xử lý Function Calling định tuyến.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Nguyễn Hữu Phúc phát triển tính năng sáng tạo làm điểm nhấn chính cho báo cáo đồ án SWP391.

#### 5.3. Kết quả AI trả về

AI sinh mã nguồn React Component `AIAssistant.tsx` dạng cửa sổ chat nổi góc dưới màn hình, tích hợp icon micro/bàn phím và cơ chế gọi hàm (Function Calling) trả về kết quả tọa độ để vẽ Route lên Mapbox.

#### 5.4. Kết quả đã áp dụng vào bài

Tích hợp thành công component `AIAssistant` vào giao diện `Home.tsx`, cho phép người dùng gõ câu hỏi tiếng Việt tự nhiên để tìm đường.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Thêm các nút gợi ý câu hỏi nhanh (Quick Prompts) như "Tránh tuyến đường ngập", "Tìm cây xăng gần nhất" để người dùng thao tác 1-click không cần gõ chữ.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Commit AI Assistant integration |
| File liên quan | `src/frontend/components/AIAssistant/` |
| Screenshot | Giao diện AI Assistant trên bản đồ |
| Kết quả chạy/test | Dẫn đường AI chính xác theo ngữ cảnh |
| Link tài liệu/báo cáo | `docs/Nguyen_Huu_Phuc/AI_AUDIT_LOG.md` |
| Ghi chú khác | Đạt điểm đánh giá sáng tạo cao |

#### 5.8. Ghi chú thêm

```text
Đây là prompt quan trọng nhất mang lại giá trị đột phá cho toàn bộ dự án.
```

---

### Prompt số 9

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 08/07/2026 |
| Công cụ AI | Antigravity |
| Mục đích | Triển khai Web3Forms Contact Form & Deep-linking điều hướng từ Profile |
| Phần việc liên quan | Frontend Profile / Integration |
| Mức độ sử dụng | Hỏi sinh code & xử lý URL parameters |

#### 5.1. Prompt nguyên văn

```text
Hãy giúp tôi xây dựng component `SupportTab.tsx` nằm trong trang Profile người dùng. Component này tích hợp dịch vụ Web3Forms API để gửi ý kiến phản hồi về email admin. Đồng thời bổ sung logic đọc URL Parameter `routeId` khi người dùng bấm "Xem lộ trình này trên bản đồ" từ lịch sử di chuyển để tự động chuyển hướng (deep-linking) về trang Home và vẽ lại tuyến đường đã lưu.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Võ Thị Mỹ Xuân hoàn thiện tính năng gửi phản hồi hỗ trợ và đồng bộ điều hướng lộ trình cá nhân.

#### 5.3. Kết quả AI trả về

Antigravity sinh file `SupportTab.tsx` giao diện TailwindCSS đẹp mắt, gửi payload form qua Web3Forms API và hàm `navigate('/?routeId=' + id)` xử lý deep-linking.

#### 5.4. Kết quả đã áp dụng vào bài

Tích hợp component vào trang Profile và tạo commit `d0f4657f`, `f80d8c84`.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Sửa lỗi hiển thị trạng thái loading spinner khi đang gửi form và thông báo Toast cảm ơn khi gửi email thành công.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Commit `d0f4657f`, `f80d8c84` |
| File liên quan | `src/frontend/pages/Profile/SupportTab.tsx` |
| Screenshot | Giao diện SupportTab & Deep-linking |
| Kết quả chạy/test | Email phản hồi gửi thẳng về hộp thư Admin |
| Link tài liệu/báo cáo | `docs/Vo_Thi_My_Xuan/AI_AUDIT_LOG.md` |
| Ghi chú khác | Hoàn thiện trải nghiệm trang Profile |

#### 5.8. Ghi chú thêm

```text
Tích hợp Web3Forms giúp gửi email hỗ trợ không cần dựng mail server phức tạp.
```

---

### Prompt số 10

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 16/07/2026 |
| Công cụ AI | Antigravity |
| Mục đích | Fix lỗi đường dẫn tương đối `/uploads/` của ảnh banner/thumbnail sự kiện |
| Phần việc liên quan | Frontend Bug Fix / Asset URL Resolver |
| Mức độ sử dụng | Hỏi debug & viết helper utility |

#### 5.1. Prompt nguyên văn

```text
Giao diện EventDetailSidebar và AddPOIModal bị lỗi hiển thị ảnh 404. Nguyên nhân là đường dẫn banner từ API trả về dạng tương đối `/uploads/events/banner.jpg` nên client không tìm thấy. Hãy viết một helper function `getImageUrl(path)` để tự động phát hiện và nối thêm domain backend `import.meta.env.VITE_BACKEND_URL` vào trước đường dẫn ảnh tương đối.
```

#### 5.2. Bối cảnh khi viết prompt

Sinh viên Nguyễn Nho Trường Phát xử lý lỗi hiển thị hình ảnh trên các component Sidebar và Modal.

#### 5.3. Kết quả AI trả về

Antigravity cung cấp hàm helper `getImageUrl` kiểm tra nếu path bắt đầu bằng `http` thì giữ nguyên, nếu bắt đầu bằng `/uploads` thì tự động ghép thành `http://localhost:5000/uploads/...`.

#### 5.4. Kết quả đã áp dụng vào bài

Áp dụng helper function trên toàn bộ các component `EventDetailSidebar`, `POIPopup`, `POIFeaturedSidebar` và `AddPOIModal` trong commit `75e10d34`, `4d6c6a80`.

#### 5.5. Phần sinh viên/nhóm đã chỉnh sửa hoặc cải tiến

Thêm ảnh placeholder mặc định (`/images/placeholder.jpg`) khi `path` bị `null` hoặc `undefined` để tránh bị bể khung giao diện.

#### 5.6. Đánh giá chất lượng prompt

- [x] Prompt rõ ràng
- [x] Prompt có đủ bối cảnh
- [ ] Prompt còn thiếu thông tin
- [x] Prompt tạo ra kết quả tốt
- [ ] Prompt tạo ra kết quả chưa phù hợp
- [ ] Cần hỏi lại AI nhiều lần
- [x] Cần tự kiểm tra và chỉnh sửa nhiều
- [ ] Kết quả AI có lỗi hoặc chưa chính xác

#### 5.7. Minh chứng liên quan

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Commit `75e10d34`, `4d6c6a80` |
| File liên quan | `src/frontend/components/Sidebar/` |
| Screenshot | Ảnh banner sự kiện hiển thị sắc nét |
| Kết quả chạy/test | Fix 100% lỗi ảnh 404 |
| Link tài liệu/báo cáo | `docs/Nguyen_Nho_Truong_Phat/AI_AUDIT_LOG.md` |
| Ghi chú khác | Đảm bảo thẩm mỹ UI |

#### 5.8. Ghi chú thêm

```text
Helper function đơn giản nhưng giải quyết triệt để lỗi ảnh hiển thị toàn hệ thống.
```

---

## 6. Prompt quan trọng nhất

Chọn một prompt có ảnh hưởng lớn nhất đến bài tập/project.

### 6.1. Prompt được chọn

```text
Tôi muốn phát triển tính năng "Trợ lý ảo AI Assistant (DNPulse Assistant)" tích hợp trực tiếp vào giao diện bản đồ chính (React TypeScript + TailwindCSS). Trợ lý AI cần hỗ trợ người dùng bằng ngôn ngữ tự nhiên: hỏi lộ trình đi tránh ngập lụt, kiểm tra thời tiết Đà Nẵng, tìm địa điểm ăn uống/cây xăng gần nhất và hiển thị tuyến đường gợi ý lên Mapbox. Hãy viết React Component floating chat widget và hàm xử lý Function Calling định tuyến.
```

### 6.2. Vì sao prompt này quan trọng?

Prompt này giải quyết bài toán cốt lõi của dự án DN-Pulse: Kết nối giữa mô hình trí tuệ nhân tạo (LLM / AI Agent) với hệ thống bản đồ số thời gian thực (Mapbox GL JS). Nó nâng tầm ứng dụng từ một bản đồ thông thường thành một hệ thống bản đồ thông minh hỗ trợ tương tác ngôn ngữ tự nhiên.

### 6.3. Kết quả prompt này mang lại

1. Giao diện Chat Floating Widget đẹp mắt, tương thích cả Desktop và Mobile.
2. Bộ hàm Function Calling giúp AI chuyển đổi câu lệnh tự nhiên (ví dụ: "Tìm đường từ Cầu Rồng đến Sơn Trà không bị ngập") thành dữ liệu tọa độ địa lý.
3. Tích hợp trực tiếp với API chỉ đường Mapbox Directions API để vẽ tuyến đường né khu vực cấm/ngập lụt.

### 6.4. Sinh viên/nhóm đã kiểm tra kết quả như thế nào?

- Thực hiện thử nghiệm 20 câu hỏi tiếng Việt với các ngữ cảnh khác nhau (tìm cây xăng, tránh ngập, hỏi thời tiết, hỏi địa điểm du lịch).
- Kiểm tra tính chính xác của tọa độ trả về và tốc độ phản hồi của AI Widget (< 1.5 giây).

### 6.5. Sinh viên/nhóm đã cải tiến gì từ kết quả AI?

- Thêm bộ nhớ đệm (Caching) cho các câu hỏi phổ biến để tiết kiệm chi phí gọi API.
- Tinh chỉnh giao diện theo phong cách Glassmorphism đồng bộ với design system của toàn bộ ứng dụng.

---

## 7. Prompt chưa hiệu quả

Ghi lại ít nhất một prompt chưa tạo ra kết quả tốt hoặc chưa phù hợp.

### 7.1. Prompt chưa hiệu quả

```text
Viết cho tôi code bản đồ ngập lụt ở Đà Nẵng bằng React.
```

### 7.2. Vì sao prompt này chưa hiệu quả?

- **Quá ngắn và sơ sài**: Không cung cấp thư viện bản đồ đang dùng (Mapbox, Leaflet hay Google Maps).
- **Thiếu bối cảnh**: AI không biết dữ liệu ngập lụt lấy từ đâu (API backend, GeoJSON static hay Database).
- **Thiếu định dạng đầu ra**: AI tự sinh một đoạn code mẫu sơ khai bằng LeafletJS hoàn toàn không tương thích với dự án đang dùng React + TypeScript + Mapbox GL.

### 7.3. Cách cải thiện prompt

- Nêu rõ bối cảnh dự án và công nghệ đang dùng (`React 18`, `TypeScript`, `Mapbox GL JS`, `TailwindCSS`).
- Mô tả rõ nguồn dữ liệu (`API /api/events/road-closures`).
- Đưa ra yêu cầu cụ thể cho đầu ra (Component structure, props, state management).

### 7.4. Prompt sau khi cải tiến

```text
Tôi đang phát triển ứng dụng bản đồ DN-Pulse bằng React 18, TypeScript, Mapbox GL JS và TailwindCSS. Tôi có API backend `/api/events/active` trả về danh sách các điểm cấm đường và ngập lụt dưới dạng JSON array: `[{ id, title, lat, lng, type: 'FLOOD' | 'CLOSURE', severity }]`. Hãy viết một Custom React Hook `useRoadEvents` để fetch dữ liệu này và viết code render lớp GeoJSON Circle Layer đỏ/cam hiển thị các vùng ngập lên bản đồ Mapbox.
```

### 7.5. Kết quả sau khi cải tiến prompt

AI đã trả về đúng mã nguồn TypeScript chuẩn xác 100%, sử dụng `useCustomHook` gọn gàng, định nghĩa interface đầy đủ và tích hợp mượt mà vào Mapbox GL mà không xảy ra bất kỳ lỗi type nào.

---

## 8. Bài học về cách viết prompt

### 8.1. Khi viết prompt, em/nhóm cần cung cấp thông tin gì để AI trả lời tốt hơn?

1. **Role / Vai trò**: Gán vai trò cho AI (ví dụ: "Hãy đóng vai Senior React/Node.js Developer" hoặc "Hãy đóng vai Business Analyst").
2. **Context / Bối cảnh**: Mô tả công nghệ đang dùng (`React + TS + Node.js + PostgreSQL + Mapbox`).
3. **Task / Mục tiêu cụ thể**: Nêu rõ bài toán cần giải quyết, tránh câu hỏi mơ hồ.
4. **Constraints / Ràng buộc**: Quy định rõ những gì ĐƯỢC và KHÔNG ĐƯỢC làm (ví dụ: "Không dùng thư viện thứ 3 ngoài TailwindCSS", "Sử dụng async/await thay vì Promise.then").
5. **Output Format / Format kết quả**: Yêu cầu trả về dạng Markdown code block, JSON schema hay dạng bảng.

### 8.2. Em/nhóm đã học được gì về cách đặt câu hỏi cho AI?

- **Hỏi từng phần thay vì hỏi làm nguyên cả bài**: Chia nhỏ tính năng phức tạp thành các module nhỏ (Auth -> DB Schema -> API Route -> UI Component -> Debug).
- **Cung cấp Log lỗi chi tiết khi Debug**: Dán nguyên văn Stack Trace lỗi kèm đoạn code liên quan giúp AI khoanh vùng nguyên nhân chính xác hơn 90%.

### 8.3. Lần sau em/nhóm sẽ cải thiện prompt như thế nào?

- Xây dựng một file template prompt nội bộ cho nhóm trước khi bắt đầu dự án.
- Ưu tiên sử dụng các kỹ thuật Prompt Engineering nâng cao như **Few-Shot Prompting** (đưa ví dụ mẫu trước khi hỏi) và **Chain-of-Thought** (yêu cầu AI suy luận từng bước).

---

## 9. Phân loại prompt đã sử dụng

Đánh dấu số lượng prompt theo từng nhóm.

| Loại prompt | Số lượng | Ví dụ prompt tiêu biểu |
|---|---:|---|
| Prompt phân tích yêu cầu | 4 | "Đóng vai BA bóc tách Use Cases và kịch bản nghiệp vụ cho DN-Pulse..." |
| Prompt giải thích kiến thức | 3 | "Giải thích cơ chế Refresh Token Rotation và Stateless Auth..." |
| Prompt thiết kế giải pháp | 5 | "Tư vấn kiến trúc hệ thống bản đồ giao thông cảnh báo ngập lụt..." |
| Prompt thiết kế database | 4 | "Viết script DDL SQL khởi tạo bảng với Spatial Index..." |
| Prompt sinh code mẫu | 12 | "Viết React component Floating AI Assistant widget với Mapbox..." |
| Prompt debug lỗi | 8 | "Vá lỗi bypass 2FA OTP trong auth.controller.js..." |
| Prompt viết test case | 3 | "Viết bộ test case kiểm thử API xác thực và phân quyền RBAC..." |
| Prompt review code | 4 | "Review và refactor Virtual DOM render Marker bản đồ..." |
| Prompt tối ưu code | 5 | "Tối ưu câu truy vấn SQL lồng nhau và Axios Interceptor..." |
| Prompt viết báo cáo | 4 | "Tổng hợp dữ liệu Audit Log thành viên vào CHANGELOG.md..." |
| Prompt chuẩn bị thuyết trình | 2 | "Gợi ý dàn ý Slide thuyết trình báo cáo đồ án SWP391..." |
| Prompt khác | 2 | "Tạo script hỗ trợ format tài liệu Markdown..." |

---

## 10. Checklist chất lượng prompt

Sinh viên/nhóm tự kiểm tra chất lượng prompt đã dùng.

| Tiêu chí | Đã đạt? | Ghi chú |
|---|:---:|---|
| Prompt có mục tiêu rõ ràng | Đã đạt | Có câu hỏi và yêu cầu đầu ra cụ thể |
| Prompt có đủ bối cảnh | Đã đạt | Cung cấp đầy đủ tech stack và mô hình hệ thống |
| Prompt có nêu công nghệ/ngôn ngữ sử dụng | Đã đạt | Nêu rõ React, TypeScript, Express, PostgreSQL, Mapbox |
| Prompt có nêu yêu cầu đầu ra | Đã đạt | Yêu cầu định dạng code block TS/JS hoặc bảng Markdown |
| Prompt không yêu cầu AI làm toàn bộ bài một cách máy móc | Đã đạt | Chỉ hỗ trợ từng module và luôn được nhóm kiểm chứng |
| Prompt có yêu cầu AI giải thích hoặc phân tích | Đã đạt | Yêu cầu AI giải thích nguyên nhân lỗi và cơ chế xử lý |
| Kết quả AI được kiểm tra lại | Đã đạt | 100% code AI gợi ý đều qua bước Code Review & Test |
| Kết quả AI được chỉnh sửa trước khi sử dụng | Đã đạt | Refactor theo coding convention của project |
| Prompt quan trọng được ghi lại đầy đủ | Đã đạt | Đã lưu lại tại PROMPTS.md và các file audit thành viên |
| Prompt sai/chưa hiệu quả được rút kinh nghiệm | Đã đạt | Đã phân tích nguyên nhân và viết lại prompt chuẩn |

---

## 11. Cam kết sử dụng prompt minh bạch

Sinh viên/nhóm cam kết rằng:

- Các prompt quan trọng đã được ghi lại trung thực.
- Không che giấu việc sử dụng AI trong các phần quan trọng của bài.
- Không nộp nguyên văn kết quả AI nếu chưa kiểm tra và chỉnh sửa.
- Có khả năng giải thích các phần đã sử dụng từ AI.
- Chịu trách nhiệm với sản phẩm cuối cùng.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
|---|---|
| Group01 (Võ Thị Mỹ Xuân - Nguyễn Hữu Phúc - Nguyễn Nho Trường Phát - Tô Thị Oanh) | 24/07/2026 |
