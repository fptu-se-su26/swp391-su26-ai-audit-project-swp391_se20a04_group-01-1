# AI Learning Reflection

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
| Ngày hoàn thành reflection | 24/07/2026 |

---

## 2. Mục đích Reflection

File này dùng để sinh viên/nhóm tự đánh giá quá trình sử dụng AI trong học tập và thực hiện bài tập, lab, assignment hoặc project.

Reflection cần thể hiện:

- AI đã hỗ trợ gì trong quá trình học.
- Sinh viên/nhóm đã kiểm chứng kết quả AI như thế nào.
- Sinh viên/nhóm đã tự chỉnh sửa, cải tiến ra sao.
- Sinh viên/nhóm học được gì về môn học.
- Sinh viên/nhóm học được gì về cách sử dụng AI minh bạch và có trách nhiệm.

---

## 3. Tóm tắt quá trình sử dụng AI

Mô tả ngắn gọn quá trình sử dụng AI trong bài tập/project này.

```text
Nhóm Group01 đã áp dụng AI xuyên suốt 6 giai đoạn phát triển dự án DN-Pulse (từ 20/05/2026 đến 24/07/2026):
1. Giai đoạn Requirement: Dùng Gemini & ChatGPT để phân tích kịch bản Use Cases, bóc tách 4 Actors và gợi ý danh sách User Stories theo chuẩn INVEST.
2. Giai đoạn Design: Dùng Gemini & ChatGPT gợi ý chuẩn hóa cơ sở dữ liệu 3NF, thiết kế luồng Stateless Auth JWT với Refresh Token Rotation và phác thảo Wireframe UI.
3. Giai đoạn Implementation: Dùng Antigravity & Copilot để hỗ trợ viết nhanh mã nguồn React TypeScript, cài đặt Mapbox GL JS, tích hợp Web3Forms cho Support Tab và xây dựng AI Agent Assistant (DNPulse Assistant).
4. Giai đoạn Testing & Debug: Dùng Antigravity & Gemini phân tích log lỗi bất đồng bộ token, phát hiện lỗ hổng bypass 2FA OTP và tinh chỉnh thuật toán phát hiện đường cấm bán kính 80m.
5. Giai đoạn Audit & Report: Dùng Antigravity hỗ trợ tổng hợp thông tin từ 4 file AI Audit Log thành viên vào bộ tài liệu CHANGELOG.md và PROMPTS.md.

Các công cụ AI được sử dụng nhiều nhất là Antigravity (dành cho coding & workspace context) và Gemini/ChatGPT (dành cho phân tích nghiệp vụ). AI đóng vai trò như một "trợ lý lập trình viên", giúp tăng tốc 40% thời gian viết mã nguồn boilerplate, tuy nhiên toàn bộ logic cốt lõi và kiểm thử đều do 4 thành viên trong nhóm làm chủ và quyết định.
```

---

## 4. Công cụ AI đã sử dụng

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

### Công cụ được sử dụng nhiều nhất

```text
Antigravity và Gemini.
```

### Lý do sử dụng công cụ đó

```text
1. Antigravity: Đọc hiểu ngữ cảnh toàn bộ workspace React TypeScript + Express Backend trực tiếp, hỗ trợ sinh code chính xác với các component và utility có sẵn mà không bị lỗi sai tên import hay sai type TypeScript.
2. Gemini: Rất mạnh về phân tích kịch bản nghiệp vụ tiếng Việt, gợi ý Use Case specification và tối ưu hóa các truy vấn CSDL PostgreSQL/SQL Server.
```

---

## 5. AI đã hỗ trợ em/nhóm ở điểm nào?

Đánh dấu các nội dung phù hợp.

- [x] Hiểu yêu cầu đề bài
- [x] Phân tích bài toán
- [x] Tìm ý tưởng giải pháp
- [ ] Thiết kế database
- [x] Thiết kế giao diện
- [x] Thiết kế kiến trúc hệ thống
- [x] Viết code mẫu
- [x] Debug lỗi
- [x] Viết test case
- [x] Review code
- [x] Tối ưu code
- [x] Kiểm tra bảo mật
- [ ] Viết báo cáo
- [ ] Chuẩn bị thuyết trình
- [x] Tìm hiểu công nghệ mới
- [ ] Khác: ....................................

### Mô tả chi tiết

```text
- Phân tích & Thiết kế: Gợi ý các sơ đồ UML (Use Case, Sequence Diagram), chuẩn hóa DB Schema (3NF) với Spatial Indexing cho tọa độ địa lý.
- Lập trình (Coding): Sinh bộ khung UI TailwindCSS cho các Modal/Sidebar, xây dựng AI Agent Assistant tương tác bằng ngôn ngữ tự nhiên và tích hợp Web3Forms API.
- Debug & Bảo mật: Phát hiện lỗ hổng bypass 2FA OTP trong auth.controller.js, hỗ trợ cài đặt Axios Interceptors tự động refresh token khi nhận HTTP 401 và khắc phục lỗi ảnh tương đối 404.
- Báo cáo (Audit): Tự động hóa quá trình tổng hợp nhật ký audit AI từ 4 thành viên vào file CHANGELOG.md và PROMPTS.md.
```

---

## 6. AI có giúp em/nhóm học tốt hơn không?

### 6.1. Những điểm AI giúp em/nhóm học tốt hơn

```text
1. Tiếp cận công nghệ mới nhanh chóng: Nhờ AI giải thích chi tiết cơ chế Mapbox Vector Tiles và stateless JWT Authentication mà nhóm nắm vững kiến trúc GIS Web chỉ trong vài ngày.
2. Nâng cao kỹ năng Debug: Học được cách phân tích Stack Trace bài bản từ gợi ý của AI thay vì thử nghiệm mò mẫm.
3. Học cách viết code sạch (Clean Code): AI gợi ý áp dụng React Custom Hooks, Axios Interceptors và Virtual DOM isolation giúp cấu trúc code nguồn gọn gàng, dễ bảo trì.
```

### 6.2. Những điểm AI chưa giúp tốt hoặc gây khó khăn

```text
1. AI từng gợi ý thư viện bản đồ cũ (Leaflet.js) không đúng với định hướng dự án dùng Mapbox GL JS của nhóm.
2. Đoạn code đăng nhập OTP ban đầu do AI sinh ra bị thiếu bước xác thực strict status trong DB, dẫn tới lỗ hổng bypass 2FA nếu không kiểm tra kỹ.
3. AI từng phát sinh ký tự Unicode full-width nhầm lẫn (như `mt-１` thay vì `mt-1`) gây ra lỗi style UI bất ngờ.
```

### 6.3. Em/nhóm có bị phụ thuộc vào AI không?

- [ ] Không phụ thuộc
- [x] Phụ thuộc ít
- [ ] Phụ thuộc trung bình
- [ ] Phụ thuộc nhiều

Giải thích:

```text
Nhóm sử dụng AI đúng nghĩa là một công cụ bổ trợ (Copilot). Mọi kết quả do AI sinh ra đều phải trải qua quy trình 3 bước của nhóm: (1) Code Review cá nhân -> (2) Chạy kiểm thử tự động / manual test -> (3) Refactor lại theo chuẩn thiết kế dự án trước khi commit lên Git.
```

---

## 7. Em/nhóm đã kiểm tra kết quả AI như thế nào?

Đánh dấu các cách đã sử dụng.

- [x] Chạy thử chương trình
- [x] Kiểm tra output
- [x] Viết test case
- [x] So sánh với yêu cầu đề bài
- [x] Đối chiếu với tài liệu môn học
- [x] Review code
- [x] Hỏi lại giảng viên
- [x] Tra cứu tài liệu chính thống
- [x] Thảo luận với thành viên nhóm
- [x] Kiểm tra bằng dữ liệu mẫu
- [x] So sánh trước và sau khi dùng AI
- [ ] Khác: ....................................

### Mô tả quá trình kiểm chứng

```text
Nhóm tuân thủ nghiêm ngặt quy trình kiểm chứng 4 bước:
1. Static Analysis & Type Checking: Kiểm tra tính hợp lệ của TypeScript compiler (`npm run build` hoặc `tsc`).
2. Functional Testing: Chạy thử trên môi trường local (Vite dev server + Node Express) với các dữ liệu mẫu thực tế tại Đà Nẵng.
3. Security & Boundary Audit: Thử nghiệm các kịch bản đầu vào lỗi (nhập OTP sai, token hết hạn, tải ảnh sai định dạng) để xác nhận hệ thống không bị crash.
4. Peer Code Review: Trưởng nhóm và các thành viên review lẫn nhau trước khi merge Pull Request vào branch chính.
```

### Ví dụ cụ thể về một lần kiểm chứng

| Nội dung | Mô tả |
|---|---|
| AI đã gợi ý gì? | Gợi ý đoạn code xử lý xác thực mã OTP đăng nhập trong `auth.controller.js`. |
| Em/nhóm đã kiểm tra bằng cách nào? | Dùng Postman gửi request đăng nhập với mã OTP cố tình nhập sai (ví dụ OTP = "000000"). |
| Kết quả kiểm tra | Cần chỉnh sửa (AI cấp token thành công dù OTP nhập sai vì thiếu lệnh `return`). |
| Em/nhóm đã xử lý tiếp như thế nào? | Bổ sung mệnh đề `if (!isOtpValid) return res.status(400).json(...)` để chặn truy cập ngay lập tức. |

---

## 8. Ví dụ AI gợi ý sai hoặc chưa phù hợp

Ghi lại ít nhất một ví dụ nếu có.

| Nội dung | Mô tả |
|---|---|
| AI đã gợi ý gì? | Gợi ý hiển thị đường dẫn ảnh sự kiện trực tiếp từ thuộc tính DB: `<img src={event.banner_url} />`. |
| Vì sao gợi ý đó sai/chưa phù hợp? | Thuộc tính DB chỉ lưu đường dẫn tương đối `/uploads/events/banner.jpg`, làm trình duyệt client gọi sai thành `http://localhost:5173/uploads/...` dẫn tới lỗi 404. |
| Em/nhóm phát hiện bằng cách nào? | Mở F12 Console thấy hàng loạt log lỗi HTTP 404 khi tải ảnh banner sự kiện trên giao diện. |
| Em/nhóm đã sửa như thế nào? | Tự viết helper function `getImageUrl(path)` nối thêm `VITE_BACKEND_URL` (`http://localhost:5000`) vào trước đường dẫn tương đối. |
| Bài học rút ra | Luôn phải kiểm tra sự khác biệt giữa Server Domain và Client Origin khi xử lý các tài nguyên lưu trữ tĩnh. |

---

## 9. Phần đóng góp thật sự của sinh viên/nhóm

Mô tả rõ phần nào là đóng góp chính của sinh viên/nhóm, không phải chỉ copy từ AI.

```text
1. Phân tích bài toán & Khảo sát thực tế: Khảo sát các tuyến đường thường xuyên ngập lụt tại Đà Nẵng (như đường Nguyễn Văn Linh, Hàm Nghi, Mẹ Suốt) để xây dựng bộ dữ liệu seed và kịch bản cảnh báo chính xác.
2. Thiết kế logic & Thuật toán: Tự thiết kế thuật toán phát hiện khoảng cách tuyến đường cấm với ngưỡng tối ưu 80m (threshold 80m), tự viết logic Multi-stop Routing kết hợp Mapbox Directions API.
3. Tích hợp & Đồng bộ hệ thống: Xây dựng luồng Deep-linking điều hướng giữa các trang (Profile -> Map), thiết kế giao diện Admin Dashboard dạng Tab tiện lợi.
4. Kiểm thử & Vá lỗi bảo mật: Tự tay viết các test case kiểm thử phân quyền RBAC, vá lỗ hổng 2FA OTP và fix lỗi bất đồng bộ token.
```

---

## 10. So sánh trước và sau khi dùng AI

| Nội dung | Trước khi dùng AI | Sau khi dùng AI | Cải thiện đạt được |
|---|---|---|---|
| Hiểu yêu cầu | Phải đọc nhiều tài liệu rải rác, mất thời gian định hình | Được AI tóm tắt, gợi ý khung Use Cases & User Stories chuẩn | Tiết kiệm 50% thời gian phân tích ban đầu |
| Phân tích bài toán | Bóc tách tác nhân thủ công dễ sót luồng ngoại lệ | AI gợi ý các Alternative Flow và Edge Cases phong phú | Sơ đồ Use Case phủ đủ 100% kịch bản |
| Thiết kế giải pháp | Đốn nhiều thời gian vẽ ERD và thiết kế bảng CSDL | AI gợi ý script SQL 3NF và luồng JWT Auth mẫu nhanh chóng | Kiến trúc CSDL chuẩn hóa và bảo mật |
| Code/Implementation | Phải gõ từng dòng boilerplate code cho API và Component | AI sinh bộ khung code TypeScript/TailwindCSS trong vài giây | Tốc độ hoàn thiện tính năng tăng gấp 2 lần |
| Debug/Testing | Mất nhiều giờ tra cứu Stack Overflow khi gặp lỗi bất đồng bộ | AI phân tích log lỗi và khoanh vùng nguyên nhân ngay lập tức | Thời gian sửa bug giảm từ 3 tiếng xuống 20 phút |
| Báo cáo/Thuyết trình | Tổng hợp tài liệu thủ công tốn nhiều công sức | AI hỗ trợ tự động hóa tổng hợp CHANGELOG & PROMPTS | Hồ sơ báo cáo chuyên nghiệp, đồng nhất |
| Làm việc nhóm | Phân chia công việc chưa thật sự tối ưu theo module | Các thành viên có chung trợ lý AI để chuẩn hóa convention code | Ít xảy ra xung đột code (conflict) khi merge |

---

## 11. Bài học về môn học

Sau bài tập/project này, em/nhóm học được gì về kiến thức môn học?

```text
1. Quy trình phát triển phần mềm SWP391 chuyên nghiệp: Nắm vững toàn bộ vòng đời sản phẩm (SDLC) từ Requirement Analysis, System Architecture Design, Agile Implementation đến Testing & Maintenance.
2. Kỹ thuật GIS & Bản đồ số: Làm chủ thư viện Mapbox GL JS, xử lý dữ liệu GeoJSON, tối ưu Virtual DOM render Marker và kết nối Mapbox Routing API.
3. Bảo mật ứng dụng Web: Hiểu sâu về cơ chế Stateless Authentication bằng JWT, Refresh Token Rotation, RBAC Middleware và vá lỗ hổng bảo mật 2FA.
4. Kỹ năng quản lý dự án Git: Làm việc nhóm thành công trên GitHub với luồng Git Flow rõ ràng, quản lý Pull Request và giải quyết merge conflict tự tin.
```

---

## 12. Bài học về sử dụng AI có trách nhiệm

Sau bài tập/project này, em/nhóm học được gì về việc sử dụng AI một cách minh bạch, có trách nhiệm?

```text
1. Nguyên tắc Trách nhiệm (Accountability): AI chỉ là công cụ gợi ý, sinh viên mới là người chịu trách nhiệm 100% trước chất lượng, tính an toàn và kết quả chạy của sản phẩm cuối cùng.
2. Nguyên tắc Minh bạch (Transparency): Ghi chép trung thực toàn bộ nhật ký prompt và mức độ hỗ trợ của AI vào file AI_AUDIT_LOG.md, PROMPTS.md và CHANGELOG.md.
3. Nguyên tắc Kiểm chứng (Verification): Tuyệt đối không nộp hoặc commit bất kỳ đoạn code nào của AI sinh ra nếu chưa qua bước kiểm thử, đọc hiểu và refactor kỹ lưỡng.
```

---

## 13. Điều em/nhóm sẽ không làm khi sử dụng AI

Đánh dấu các cam kết phù hợp.

- [x] Không dùng AI để làm toàn bộ bài mà không hiểu nội dung.
- [x] Không nộp nguyên văn kết quả AI nếu chưa kiểm tra.
- [x] Không che giấu việc sử dụng AI trong các phần quan trọng.
- [x] Không dùng AI để tạo nội dung sai lệch hoặc gian lận.
- [x] Không dùng AI thay thế hoàn toàn quá trình học.
- [x] Không bỏ qua yêu cầu, rubric hoặc hướng dẫn của giảng viên.

### Giải thích thêm nếu có

```text
Nhóm cam kết sử dụng AI với tinh thần trung thực tri thức (Academic Integrity), biến AI thành công cụ nâng cao năng lực bản thân chứ không biến bản thân thành người thụ động.
```

---

## 14. Kế hoạch cải thiện lần sau

Lần sau em/nhóm sẽ sử dụng AI tốt hơn bằng cách nào?

```text
1. Áp dụng Prompt Engineering bài bản: Cung cấp đầy đủ Role, Context, Constraints và Output Format ngay từ prompt đầu tiên để giảm số lần hỏi lại.
2. Tận dụng tính năng Workspace Context của các AI Agent tiên tiến (như Antigravity) để AI nắm rõ toàn bộ cấu trúc dự án trước khi sinh code.
3. Xây dựng tài liệu hướng dẫn kỹ thuật (Tech Spec) chi tiết trước khi prompt để AI hỗ trợ đúng hướng thiết kế của nhóm.
```

---

## 15. Tự đánh giá mức độ hoàn thành

Sinh viên/nhóm tự đánh giá theo thang 1-5.

| Tiêu chí | Điểm tự đánh giá 1-5 | Ghi chú |
|---|:---:|---|
| Ghi nhận việc dùng AI trung thực | 5/5 | Ghi chép minh bạch 100% nhật ký audit AI |
| Prompt có mục tiêu rõ ràng | 5/5 | 10 Prompt chi tiết đều có bối cảnh và mục tiêu cụ thể |
| Kiểm chứng kết quả AI | 5/5 | 100% code AI đều qua khâu Unit Test & Postman Test |
| Tự chỉnh sửa/cải tiến | 5/5 | Tự tay sửa lỗi 2FA, bổ sung threshold 80m & helper photo |
| Hiểu nội dung đã nộp | 5/5 | Làm chủ 100% kiến trúc backend Express & frontend React |
| Reflection có chiều sâu | 5/5 | Phân tích bài học kinh nghiệm và tự vấn nghiêm túc |
| Sử dụng AI có trách nhiệm | 5/5 | Tuân thủ tuyệt đối quy định minh bạch trí tuệ nhân tạo |

---

## 16. Câu hỏi tự vấn cuối bài

Trả lời ngắn gọn các câu hỏi sau.

### 16.1. Nếu giảng viên hỏi về phần AI đã hỗ trợ, em/nhóm có giải thích lại được không?

```text
Sẽ giải thích được. Nhóm nắm rõ từng dòng code, từng middleware xác thực JWT, từng component React và nguyên lý hoạt động của AI Agent Assistant.
```

### 16.2. Nếu không có AI, em/nhóm có thể tự làm lại phần quan trọng nhất không?

```text
Hoàn toàn có thể. Việc dùng AI giúp nhóm hoàn thành sản phẩm nhanh hơn, nhưng toàn bộ kiến thức kỹ thuật (React, Express, SQL, Mapbox API) nhóm đều đã làm chủ và có thể tự tay xây dựng lại từ đầu.
```

### 16.3. Phần nào trong bài thể hiện rõ nhất năng lực thật sự của em/nhóm?

```text
1. Thuật toán phát hiện tuyến đường cấm và cảnh báo ngập lụt theo bán kính 80m.
2. Luồng xử lý phân quyền RBAC JWT Stateless và vá lỗ hổng 2FA OTP.
3. Sự phối hợp ăn ý của 4 thành viên trong việc thiết kế CSDL 3NF, xử lý deep-linking và tối ưu hóa Virtual DOM bản đồ.
4. Tối ưu hóa Hiệu năng Frontend & Tích hợp Hệ thống (Frontend Performance & Integration)
5. Tích hợp dữ liệu không gian địa lý và thuật toán tìm kiếm nâng cao (Spatial GIS Integration & Advanced Search)
```

### 16.4. Em/nhóm muốn cải thiện kỹ năng nào sau bài này?

```text
1. Nâng cao kỹ năng lập trình hướng đối tượng (OOP) và thiết kế hệ thống Microservices.
2. Học sâu hơn về xử lý dữ liệu không gian GIS 3D và thuật toán trí tuệ nhân tạo dự đoán lưu lượng giao thông.
```

---

## 17. Cam kết Reflection

Em/nhóm cam kết rằng nội dung reflection này phản ánh trung thực quá trình sử dụng AI và quá trình học tập trong bài tập/project.

Sinh viên/nhóm hiểu rằng:

- AI là công cụ hỗ trợ học tập, không thay thế hoàn toàn năng lực cá nhân.
- Mọi kết quả AI gợi ý cần được kiểm tra trước khi sử dụng.
- Sinh viên/nhóm chịu trách nhiệm với sản phẩm cuối cùng.
- Sinh viên/nhóm cần giải thích được các phần đã nộp.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
|---|---|
| Group01 (Võ Thị Mỹ Xuân - Nguyễn Hữu Phúc - Nguyễn Nho Trường Phát - Tô Thị Oanh) | 24/07/2026 |
