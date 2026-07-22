# Changelog

## 1. Quy định ghi Changelog

File này dùng để ghi lại các thay đổi quan trọng trong quá trình thực hiện bài tập, lab, assignment hoặc project.

Nguyên tắc ghi changelog:

- Chỉ ghi những gì đã hoàn thành thật sự.
- Không ghi kế hoạch nếu chưa thực hiện.
- Mỗi thay đổi nên có ngày, nội dung, người thực hiện và minh chứng.
- Nếu có AI hỗ trợ, cần ghi rõ AI đã hỗ trợ phần nào.
- Nếu có commit GitHub, cần ghi link commit.
- Nếu có lỗi đã sửa, cần ghi rõ lỗi, nguyên nhân và cách xử lý.

---

## 2. Thông tin project

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
| Ngày hoàn thành | 24/07/2026 |

---

## 3. Tổng quan các phiên bản/giai đoạn

| Phiên bản/Giai đoạn | Thời gian | Nội dung chính | Trạng thái |
|---|---|---|---|
| Phase 01 | 20/05/2026 - 24/05/2026 | Khởi tạo project & cấu hình môi trường | Completed |
| Phase 02 | 25/05/2026 - 31/05/2026 | Phân tích yêu cầu (Requirements & Use Cases) | Completed |
| Phase 03 | 01/06/2026 - 12/06/2026 | Thiết kế hệ thống (Architecture, ERD, RBAC & UI) | Completed |
| Phase 04 | 13/06/2026 - 05/07/2026 | Implementation (Frontend, Backend, AI Agent & Map) | Completed |
| Phase 05 | 06/07/2026 - 17/07/2026 | Testing & Debug (Xử lý lỗi Token, Security 2FA, Routing) | Completed |
| Phase 06 | 18/07/2026 - 24/07/2026 | Hoàn thiện báo cáo, tài liệu Audit Log và demo | Completed |

---

# [Phase 01] Khởi tạo project

## Ngày thực hiện

```text
20/05/2026 - 24/05/2026
```

## Đã hoàn thành

- [x] Tạo repository
- [x] Tạo cấu trúc thư mục project
- [x] Tạo file README.md
- [x] Tạo thư mục `docs/`
- [x] Tạo file `AI_AUDIT_LOG.md`
- [x] Tạo file `PROMPTS.md`
- [x] Tạo file `REFLECTION.md`
- [x] Tạo file `CHANGELOG.md`
- [x] Khởi tạo source code ban đầu
- [x] Cài đặt thư viện/công cụ cần thiết
- [x] Cấu hình môi trường chạy project

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Khởi tạo Git repository và thiết lập cấu trúc thư mục Frontend (React/Vite/TS) & Backend (Express) | Nguyễn Hữu Phúc | `package.json`, `src/` | Commit initial setup |
| 2 | Khởi tạo bộ tài liệu audit trong `docs/` (`AI_AUDIT_LOG.md`, `PROMPTS.md`, `REFLECTION.md`, `CHANGELOG.md`) | Nguyễn Nho Trường Phát | `docs/` | Structure setup commit |
| 3 | Khởi tạo file cấu hình kết nối CSDL PostgreSQL/MySQL và thiết lập biến môi trường `.env` | Võ Thị Mỹ Xuân | `src/backend/config/` | Config commit |
| 4 | Cấu hình ESLint, Prettier, TailwindCSS và cài đặt các thư viện UI (Lucide-react, Mapbox GL) | Tô Thị Oanh | `src/frontend/` | Dependencies setup |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (ChatGPT, Gemini) hỗ trợ gợi ý cấu trúc thư mục dự án chuẩn cho React TypeScript + Node.js Express, sinh file .gitignore tối ưu cho Node/Vite và hỗ trợ viết script khởi tạo package.json ban đầu.
```

## Commit/Screenshot minh chứng

```text
- Repository URL: https://github.com/fptu-se-su26/swp391-su26-ai-audit-project-swp391_se20a04_group-01-1
- Initial commits: Setup base workspace & documentation templates.
```

## Ghi chú

```text
Cả 4 thành viên đã đồng bộ môi trường phát triển thành công (Node v20+, npm, VS Code extensions).
```

---

# [Phase 02] Phân tích yêu cầu

## Ngày thực hiện

```text
25/05/2026 - 31/05/2026
```

## Đã hoàn thành

- [x] Xác định problem statement
- [x] Xác định user roles
- [x] Viết user stories
- [x] Viết use cases
- [x] Xác định functional requirements
- [x] Xác định non-functional requirements
- [x] Xác định business rules
- [x] Xác định acceptance criteria
- [x] Review yêu cầu với giảng viên/nhóm
- [x] Chỉnh sửa yêu cầu sau feedback

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Phân tích ca sử dụng (Use Cases), bóc tách tác nhân (User, Admin) và thiết lập kịch bản hệ thống | Võ Thị Mỹ Xuân | `docs/Vo_Thi_My_Xuan/AI_AUDIT_LOG.md` | Log #1 (12/05 - 25/05) |
| 2 | Khảo sát nhu cầu giao thông Đà Nẵng, xây dựng Functional Requirements cho tính năng Cảnh báo & POI | Nguyễn Hữu Phúc | `docs/Nguyen_Huu_Phuc/AI_AUDIT_LOG.md` | Log #1 (18/05 - 26/05) |
| 3 | Xây dựng danh sách User Stories & Business Rules cho luồng Đăng ký/Đăng nhập, RBAC và duyệt cảnh báo | Tô Thị Oanh | `docs/To_Thi_Oanh/AI_AUDIT_LOG.md` | Log #1 - #3 |
| 4 | Tổng hợp tài liệu Yêu cầu phần mềm và chuẩn bị nội dung thuyết trình Requirement Review | Nguyễn Nho Trường Phát | `docs/Nguyen_Nho_Truong_Phat/AI_AUDIT_LOG.md` | Requirement docs |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (Gemini, ChatGPT) hỗ trợ chuẩn hóa danh sách User Stories theo chuẩn INVEST, gợi ý các kịch bản ngoại lệ (Edge Cases) cho luồng đăng ký/xác thực tài khoản và bóc tách vai trò người dùng (User vs Admin).
```

## Commit/Screenshot minh chứng

```text
- File tài liệu Use Case & Requirement Specification lưu trong thư mục docs/
```

## Ghi chú

```text
Đã thống nhất 2 vai trò người dùng chính: Người dân/Khách du lịch (User) và Quản trị viên hệ thống đô thị (Admin).
```

---

# [Phase 03] Thiết kế hệ thống

## Ngày thực hiện

```text
01/06/2026 - 12/06/2026
```

## Đã hoàn thành

- [x] Thiết kế kiến trúc tổng quan
- [x] Thiết kế database/ERD
- [x] Thiết kế API
- [x] Thiết kế giao diện/wireframe
- [x] Thiết kế flow xử lý
- [x] Thiết kế class diagram
- [x] Thiết kế sequence diagram
- [x] Thiết kế security/authorization flow
- [x] Review thiết kế
- [x] Chỉnh sửa thiết kế sau feedback

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Thiết kế hạ tầng dữ liệu, viết câu lệnh SQL DDL tạo bảng `users`, `events`, `pois`, `routes`, `reviews` | Võ Thị Mỹ Xuân | `docs/Database/`, `seed_pois.sql` | SQL schema scripts |
| 2 | Thiết kế luồng phân quyền Stateless RBAC qua JWT, truy xuất danh sách người dùng qua Database View | Tô Thị Oanh| `src/backend/middleware/` | Audit Log #1 & #2 |
| 3 | Thiết kế kiến trúc bản đồ Mapbox, xử lý render lớp Marker sự kiện & thuật toán lọc điểm POI theo bán kính | Nguyễn Hữu Phúc | `src/frontend/components/Map/` | Map architecture doc |
| 4 | Thiết kế Wireframe & UI Layout cho Admin Dashboard, Modal thêm POI và Sidebar chi tiết sự kiện | Nguyễn Nho Trường Phát | `docs/design_ui/` | UI Mockups |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (Gemini, Claude, ChatGPT) hỗ trợ thiết kế sơ đồ CSDL chuẩn hóa (3NF), tối ưu các chỉ mục Index cho câu truy vấn không gian (Spatial Queries) và sinh bộ boilerplate cho Middleware xác thực JWT.
```

## Commit/Screenshot minh chứng

```text
- Script sơ đồ cơ sở dữ liệu: docs/Database/DNPulse_DB_final.sql
- Sơ đồ kiến trúc & ERD trong docs/diagrams/
```

## Ghi chú

```text
Hệ thống sử dụng mô hình RESTful API cho backend Express và giao diện SPA React TypeScript kết hợp Mapbox GL JS.
```

---

# [Phase 04] Implementation

## Ngày thực hiện

```text
13/06/2026 - 05/07/2026
```

## Đã hoàn thành

- [x] Tạo project structure
- [x] Cài đặt database connection
- [x] Xây dựng backend
- [x] Xây dựng frontend
- [x] Xây dựng authentication/authorization
- [x] Xử lý CRUD
- [x] Xử lý validation
- [x] Tích hợp API
- [x] Xử lý upload/download file
- [x] Xử lý lỗi
- [x] Tối ưu giao diện
- [x] Cập nhật README hướng dẫn chạy

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Phát triển tính năng "Đồng bộ & Hiển thị Sự kiện Đô thị lên Bản đồ chính", chỉ đường đa điểm (Multi-stop routing) | Nguyễn Hữu Phúc | `src/frontend/pages/Home/`, `src/backend/routes/events.routes.js` | Commit `c8147b77`, `6e722118` |
| 2 | Triển khai AI Agent dẫn đường thông minh (DNPulse Assistant) tích hợp trực tiếp vào giao diện bản đồ | Nguyễn Hữu Phúc | `src/frontend/components/AIAssistant/` | Log #3 (29/06/2026) |
| 3 | Xây dựng API Đăng nhập, Đăng ký, Quên mật khẩu OTP, Refresh Token và phân quyền RBAC |Tô Thị Oanh | `src/backend/routes/auth.routes.js`, `src/backend/controllers/` | Audit Log #3, #8, #9 |
| 4 | Xây dựng Admin Dashboard dạng Tab components (Quản lý User, Duyệt Cảnh báo, Quản lý Sự kiện & POI) | Tô Thị Oanh| `src/frontend/pages/Admin/` | Commit `11/06/2026` |
| 5 | Tối ưu cấu trúc render Virtual DOM của các lớp Marker trên Mapbox và xây dựng Store quản lý trạng thái xác thực | Võ Thị Mỹ Xuân | `src/frontend/store/`, `src/frontend/components/Map/` | Log #4, #6 |
| 6 | Triển khai tích hợp Web3Forms cho Contact Form, Support Tab và Deep-linking điều hướng từ Profile sang Bản đồ | Võ Thị Mỹ Xuân | `src/frontend/pages/Profile/SupportTab.tsx` | Commit `d0f4657f`, `f80d8c84` |
| 7 | Cập nhật dữ liệu POI seed (Nhà thuốc, Mua sắm), fix ảnh Unsplash và xử lý upload banner/thumbnail sự kiện multipart | Nguyễn Nho Trường Phát | `src/backend/seed_pois.sql`, `src/backend/routes/` | Commit `109feae2`, `4fd51358` |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (Antigravity, Gemini, GitHub Copilot, Claude) hỗ trợ sinh mã nguồn boilerplate cho API Routes, tối ưu hóa thuật toán render Marker bản đồ không bị lag, tích hợp Web3Forms API và thiết lộ luồng AI Agent bằng ngôn ngữ tự nhiên.
```

## Commit/Screenshot minh chứng

```text
- Commit `c8147b77`: feat: implement multi-stop routing, travel completion history, and map UI fixes
- Commit `d0f4657f`: tính năng: đồng bộ deep-linking và điều hướng từ trang profile sang bản đồ chính
- Commit `4fd51358`: fix: send multipart/form-data for event banner/thumbnail upload
- Commit `f80d8c84`: Integrate Web3Forms API for functional contact submissions
```

## Ghi chú

```text
Toàn bộ các tính năng cốt lõi (Bản đồ, Cảnh báo, AI Assistant, Admin Dashboard, Profile & Support) đã hoàn thành 100%.
```

---

# [Phase 05] Testing & Debug

## Ngày thực hiện

```text
06/07/2026 - 17/07/2026
```

## Đã hoàn thành

- [x] Viết test case
- [x] Chạy test chức năng chính
- [x] Kiểm tra output
- [x] Kiểm tra validation
- [x] Kiểm tra lỗi giao diện
- [x] Kiểm tra lỗi database
- [x] Kiểm tra phân quyền
- [x] Kiểm tra bảo mật cơ bản
- [x] Fix bug
- [x] Chạy lại sau khi fix bug
- [x] Ghi nhận kết quả test

## Danh sách lỗi đã xử lý

| STT | Lỗi phát hiện | Nguyên nhân | Cách xử lý | Trạng thái |
|---:|---|---|---|---|
| 1 | Lỗi bypass 2FA OTP khi nhập sai mã xác thực | Thiếu bước validate kĩ trạng thái mã OTP trong database trước khi cấp JWT | Thêm kiểm tra strict OTP verification status trong `auth.controller.js` | Fixed |
| 2 | Hiển thị sai múi giờ ở lịch sử di chuyển người dùng | Timestamp từ server lưu ở định dạng UTC nhưng client không convert sang GMT+7 | Dùng thư viện định dạng ngày tháng hiển thị theo múi giờ local (Asia/Ho_Chi_Minh) | Fixed |
| 3 | Trùng lặp POI ID làm đứt gãy kết nối cơ sở dữ liệu | Trùng khóa chính ID trong file script `seed_pois.sql` | Đánh lại thứ tự ID tự tăng duy nhất cho toàn bộ bảng POI | Fixed |
| 4 | Đường dẫn ảnh banner/thumbnail sự kiện bị lỗi 404 | Đường dẫn tương đối `/uploads/` thiếu URL gốc của server backend | Bổ sung helper function tự động ghép `VITE_BACKEND_URL` vào trước đường dẫn ảnh | Fixed |
| 5 | Nhận diện đường cấm (Restricted Road) hoạt động sai bán kính | Ngưỡng khoảng cách phát hiện (threshold) cũ thiết lập 200m quá rộng gây nhầm lẫn | Tinh chỉnh threshold phát hiện tuyến đường cấm xuống 80m | Fixed |

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Debug lỗi bất đồng bộ vòng đời token mạng, thêm Axios Network Interceptors xử lý tự động refresh token | Võ Thị Mỹ Xuân | `src/frontend/utils/api.ts` | Log #7 (24/06 - 08/07) |
| 2 | Sửa thuật toán chỉ đường (Routing Path) và vá lỗ hổng bảo mật 2FA OTP | Tô Thị Oanh | `src/backend/controllers/auth.controller.js` | Log #4 & #5 |
| 3 | Tinh chỉnh ngưỡng phát hiện đường cấm 80m và sửa lỗi hiển thị sự kiện giao thông diễn ra mặc định | Nguyễn Hữu Phúc | `src/frontend/components/Map/` | Commit `7b49e76e` |
| 4 | Khắc phục đường dẫn ảnh tương đối `/uploads/` và đồng bộ hiển thị chi tiết sự kiện trên sidebar | Nguyễn Nho Trường Phát | `src/frontend/components/Sidebar/` | Commit `75e10d34`, `4d6c6a80` |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (Antigravity, Gemini) hỗ trợ phân tích stack trace lỗi bất đồng bộ token, phát hiện nguyên nhân đường dẫn ảnh 404 và gợi ý thuật toán tính khoảng cách Haversine / threshold 80m cho tuyến đường cấm.
```

## Commit/Screenshot minh chứng

```text
- Commit `7b49e76e`: fix: improve restricted road detection (threshold 80m, stable refs)
- Commit `75e10d34`: fix: resolve relative /uploads/ banner URL by prepending backend base URL
- Commit `c245eaf8`: Fix lỗi thời gian
```

## Ghi chú

```text
Đã vượt qua tất cả các test case về chức năng, phân quyền bảo mật và hiển thị giao diện trên thiết bị Desktop & Mobile.
```

---

# [Phase 06] Hoàn thiện báo cáo và demo

## Ngày thực hiện

```text
18/07/2026 - 24/07/2026
```

## Đã hoàn thành

- [x] Hoàn thiện source code
- [x] Hoàn thiện README.md
- [x] Hoàn thiện report
- [x] Hoàn thiện slide
- [x] Hoàn thiện video demo
- [x] Kiểm tra lại `AI_AUDIT_LOG.md`
- [x] Kiểm tra lại `PROMPTS.md`
- [x] Hoàn thiện `REFLECTION.md`
- [x] Kiểm tra lại `CHANGELOG.md`
- [x] Đóng gói bài nộp

## Thay đổi chi tiết

| STT | Nội dung thay đổi | Người thực hiện | File/Module liên quan | Minh chứng |
|---:|---|---|---|---|
| 1 | Rà soát dọn dẹp mã nguồn, loại bỏ console log thừa và đóng gói bản phát hành chính thức | Nguyễn Hữu Phúc | `src/` | Release commit |
| 2 | Hoàn thiện file `README.md` với đầy đủ hướng dẫn cài đặt, cấu hình `.env` và sơ đồ chạy dự án | Nguyễn Nho Trường Phát | `README.md` | README commit |
| 3 | Tổng hợp nhật ký audit AI từ các thành viên vào bộ hồ sơ `docs/` (`AI_AUDIT_LOG.md`, `CHANGELOG.md`) | Võ Thị Mỹ Xuân & Tô Thị Oanh | `docs/` | Audit logs update |
| 4 | Thiết kế Slide thuyết trình dự án DN-Pulse và thực hiện quay Video Demo sản phẩm hoàn chỉnh | Cả nhóm / Nguyễn Nho Trường Phát | `docs/` | Slide & Video Demo |

## AI có hỗ trợ không?

- [x] Có
- [ ] Không

Nếu có, mô tả AI đã hỗ trợ phần nào:

```text
AI (Antigravity, ChatGPT, Claude) hỗ trợ tự động tổng hợp thông tin từ 4 file AI Audit Log thành viên, kiểm tra tính nhất quán của file CHANGELOG.md và tinh chỉnh nội dung Slide báo cáo.
```

## Commit/Screenshot minh chứng

```text
- Bộ hồ sơ báo cáo hoàn chỉnh nằm trong thư mục docs/
- Link video demo và Slide thuyết trình được cập nhật tại README.md
```

## Ghi chú

```text
Dự án DN-Pulse đã hoàn thành đúng tiến độ đề ra (20/05/2026 - 24/07/2026).
```

---

# 4. Tổng kết thay đổi cuối project

## 4.1. Các chức năng đã hoàn thành

| STT | Chức năng | Trạng thái | Minh chứng | Ghi chú |
|---:|---|---|---|---|
| 1 | Bản đồ tương tác & Hiển thị Cảnh báo Giao thông / Sự kiện đô thị | Completed | Code base & Video Demo | Hiển thị sự kiện real-time |
| 2 | Dẫn đường thông minh đa điểm & Cảnh báo khu vực cấm / ngập lụt | Completed | Commit `c8147b77` | Threshold phát hiện 80m |
| 3 | Trợ lý ảo AI Assistant (DNPulse AI Agent) tư vấn lộ trình & thời tiết | Completed | Component `AIAssistant` | Ngôn ngữ tự nhiên |
| 4 | Hệ thống Đăng nhập / Đăng ký, OTP 2FA & Phân quyền RBAC | Completed | Code backend `auth.routes` | Bảo mật JWT Stateless |
| 5 | Admin Dashboard quản lý Người dùng, Duyệt Cảnh báo & Thêm POI/Sự kiện | Completed | Component `AdminDashboard` | Giao diện dạng Tab |
| 6 | Quản lý Hồ sơ cá nhân (Profile), Lịch sử di chuyển & Support Form | Completed | Component `SupportTab` | Tích hợp Web3Forms |

---

## 4.2. Các chức năng chưa hoàn thành

| STT | Chức năng | Lý do chưa hoàn thành | Hướng cải thiện |
|---:|---|---|---|
| 1 | Tích hợp AI dự đoán kẹt xe thời gian thực qua Camera giao thông | Chưa tiếp cận được nguồn dữ liệu API Camera công cộng trực tiếp của thành phố | Sẽ kết nối API IoT công cộng khi có quyền truy cập |
| 2 | Ứng dụng PWA hỗ trợ hoạt động ngoại tuyến (Offline Map) | Ưu tiên hoàn thiện trải nghiệm Web Responsive trên các thiết bị trước | Triển khai Service Worker và Caching Strategy ở phiên bản v2.0 |

---

## 4.3. Tổng hợp AI hỗ trợ trong project

| Hạng mục | AI có hỗ trợ không? | Mức độ hỗ trợ | Ghi chú |
|---|---|---|---|
| Requirement | Có | Trung bình | Hỗ trợ gợi ý User Stories & Use Cases |
| Design | Có | Trung bình | Gợi ý DB Schema (3NF) & luồng RBAC JWT |
| Database | Có | Trung bình | Sinh script SQL DDL & Query lồng nhau |
| Coding | Có | Nhiều | Antigravity, Copilot, Gemini hỗ trợ viết UI & API Routes |
| Debug | Có | Nhiều | Phân tích log, fix lỗi 2FA, token refresh, image 404 |
| Testing | Có | Ít | Gợi ý test cases kiểm thử giao diện & API |
| Report | Có | Trung bình | Tổng hợp CHANGELOG.md, REFLECTION.md |
| Presentation | Có | Ít | Gợi ý dàn ý Slide báo cáo |

---

## 4.4. Bài học rút ra

```text
Quá trình làm dự án DN-Pulse đã giúp nhóm học hỏi được rất nhiều về:
1. Quy trình làm việc nhóm bài bản: Phân chia module rõ ràng, quản lý Git branch nghiêm ngặt và xử lý merge conflict hiệu quả.
2. Áp dụng AI minh bạch & có trách nhiệm: Sử dụng AI làm công cụ trợ lực (tăng tốc độ viết boilerplate, debug lỗi, gợi ý ý tưởng) nhưng luôn kiểm chứng, làm chủ mã nguồn và tự tay tinh chỉnh logic cốt lõi.
3. Tư duy thiết kế phần mềm hướng người dùng: Thiết kế bản đồ trực quan, tối ưu tốc độ render Marker và tích hợp AI Agent thân thiện.
```

---

## 4.5. Hướng cải thiện tiếp theo

```text
1. Nâng cấp AI Assistant thành Trợ lý giọng nói (Voice AI Assistant) giúp người lái xe thao tác không cần chạm.
2. Mở rộng tính năng kết nối cộng đồng (Community Reporting) cho phép người dân gửi ảnh chụp giao thông thực tế.
3. Tối ưu hiệu năng bản đồ không gian 3D cho các khu vực đô thị trọng điểm tại Đà Nẵng.
```

---

# 5. Cam kết cập nhật Changelog

Sinh viên/nhóm cam kết rằng nội dung changelog phản ánh đúng các thay đổi đã thực hiện trong quá trình làm bài tập/project.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
|---|---|
| Group01 (Võ Thị Mỹ Xuân - Nguyễn Hữu Phúc - Nguyễn Nho Trường Phát - Tô Thị Oanh)  | 24/07/2026 |
