# AI Audit Log

## 1. Thông tin chung

| Thông tin             | Nội dung                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| Môn học               | Application Development Project / Software Development Project              |
| Mã môn học            | SWP391                                                                      |
| Lớp                   | SE20A04                                                                     |
| Học kỳ                | Summer 2026                                                                 |
| Tên bài tập / Project | DN-Pulse: Bản đồ số cảnh báo thiên tai và định tuyến thông minh TP. Đà Nẵng |
| Tên sinh viên / Nhóm  | Võ Thị Mỹ Xuân / Nhóm 01                                                    |
| MSSV / Danh sách MSSV | SE20A04-DE190285                                                            |
| Giảng viên hướng dẫn  |                                                                             |
| Ngày bắt đầu          | 11/05/2026                                                                  |
| Ngày hoàn thành       | _Đang thực hiện (Dự kiến báo cáo tiến độ giai đoạn Tuần 8)_                 |

---

## 2. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng trong quá trình thực hiện bài tập/project.

- [x] ChatGPT
- [x] Gemini
- [x] Claude
- [ ] GitHub Copilot
- [ ] Cursor
- [x] Antigravity
- [ ] Perplexity
- [ ] Microsoft Copilot
- [ ] Công cụ khác: ....................................

---

## 3. Mục tiêu sử dụng AI

Mô tả ngắn gọn sinh viên/nhóm đã sử dụng AI để hỗ trợ những công việc nào.

Ví dụ:

- Phân tích yêu cầu bài toán
- Gợi ý ý tưởng giải pháp
- Thiết kế database
- Thiết kế giao diện
- Viết code mẫu
- Debug lỗi
- Tối ưu code
- Viết test case
- Kiểm tra bảo mật
- Viết báo cáo
- Chuẩn bị slide thuyết trình
- Tìm hiểu công nghệ mới

### Mô tả mục tiêu sử dụng AI

## 3. Mục tiêu sử dụng AI

Mô tả ngắn gọn sinh viên/nhóm đã sử dụng AI để hỗ trợ những công việc nào.

### Mô tả mục tiêu sử dụng AI

Sinh viên đã sử dụng AI xuyên suốt quá trình thực hiện dự án từ Tuần 1 đến Tuần 8 nhằm hỗ trợ:

- Phân tích yêu cầu bài toán và bóc tách các kịch bản nghiệp vụ cho hệ thống.
- Gợi ý ý tưởng giải pháp và thiết kế sơ đồ ca sử dụng hệ thống (Use Case Diagrams & Specifications).
- Thiết kế mô hình cơ sở dữ liệu (Database Schema) cho hệ thống xác thực và lưu trữ thông tin yêu thích.
- Viết code mẫu quản lý trạng thái tập trung (Zustand Auth Store) ở Frontend và định tuyến APIs (Express) ở Backend.
- Debug các lỗi đồng bộ hóa vòng đời token mạng (Axios Request Interceptors) và lỗi kiểu dữ liệu nghiêm ngặt trong TypeScript.
- Tối ưu hóa hiệu năng render không gian bản đồ Mapbox (Refactoring) và chuẩn bị tài liệu báo cáo kỹ thuật.

---

## 4. Nhật ký sử dụng AI chi tiết

> Mỗi lần sử dụng AI cho một phần quan trọng của bài tập/project, sinh viên cần ghi lại theo mẫu bên dưới.
> Sinh viên/nhóm có thể nhân bản mẫu “Lần sử dụng AI” nhiều lần tùy theo số lần sử dụng AI thực tế.

---

### Lần sử dụng AI số 1

| Nội dung            | Thông tin                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| Ngày sử dụng        | 12/05/2026                                                             |
| Công cụ AI          | Gemini                                                                 |
| Mục đích sử dụng    | Phân tích ca sử dụng, bóc tách tác nhân và thiết lập kịch bản hệ thống |
| Phần việc liên quan | Requirement / Design / Specification                                   |
| Mức độ sử dụng      | Hỗ trợ nhiều                                                           |

#### 4.1. Prompt đã sử dụng

```text
Tôi đang làm đồ án SWP391 xây dựng hệ thống bản đồ số DN-Pulse. Tôi chịu trách nhiệm hai module chính là Đăng nhập bên thứ ba (Google Login) và Hệ thống lưu giữ lịch sử/địa điểm yêu thích (Favorites). Hãy đóng vai trò là một Business Analyst (BA) chuyên nghiệp, giúp tôi bóc tách các Actor (Tác nhân), liệt kê toàn bộ các Use Case cần vẽ cho hệ thống này và mô tả chi tiết kịch bản (Flow) của Use Case "Lưu địa điểm yêu thích" bao gồm Basic Flow và Alternative Flow để tôi tiến hành vẽ sơ đồ UML.
```

#### 4.2. Kết quả AI gợi ý

AI đã phân tích cấu trúc nghiệp vụ hệ thống và cung cấp:

- Danh sách Actors: Người dùng chưa đăng nhập (Guest), Người dùng đã xác thực (Member/Verified User), Hệ thống bản đồ Mapbox (System), Hệ thống xác thực Google (Third-party Identity Provider).

- Danh sách Use Cases chính: Đăng nhập qua Google (Google Authentication), Xem danh sách địa điểm (View POIs), Đánh dấu địa điểm yêu thích (Toggle Favorite POI), Lưu lộ trình di chuyển (Save Route), Xem lịch sử lộ trình (View Saved Routes).

- Kịch bản Use Case "Lưu địa điểm yêu thích": Mô tả luồng đi cơ bản (Người dùng chọn địa điểm -> Nhấn nút trái tim -> Hệ thống lưu dữ liệu và đổi màu icon) và các luồng rẽ nhánh (Lỗi kết nối internet, Người dùng chưa đăng nhập thì hệ thống chuyển hướng sang trang Login).

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

- Sử dụng danh sách phân rã Use Case để làm sườn bố cục cấu trúc cho công cụ vẽ sơ đồ UML (như Draw.io / StarUML).

- Áp dụng các luồng rẽ nhánh (Alternative Flows) của AI đề xuất để thiết kế thông báo phản hồi (Toast notification) tương ứng trên giao diện UI.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

- Sơ đồ ca sử dụng ban đầu do AI gợi ý tách biệt quá rời rạc giữa "Lưu địa điểm" và "Lưu lộ trình". Sinh viên đã cải tiến bằng cách gộp chung và tối ưu thành một module quản lý thông minh tập trung là Favorites Management lồng ghép các mối quan hệ <<extend>> và <<include>> một cách khoa học để sơ đồ UML gọn gàng, mạch lạc, không bị rối mắt.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

- Nắm tư duy đặc tả yêu cầu hệ thống theo chuẩn phần mềm quốc tế, biết cách xác định ranh giới hệ thống (System Boundary) và mối liên kết logic giữa các tác nhân.

---

### Lần sử dụng AI số 2

| Nội dung            | Thông tin                                                    |
| ------------------- | ------------------------------------------------------------ |
| Ngày sử dụng        | 19/05/2026                                                   |
| Công cụ AI          | Gemini                                                       |
| Mục đích sử dụng    | Phân tích hạ tầng dữ liệu và viết câu lệnh SQL khởi tạo bảng |
| Phần việc liên quan | Database / Schema Design                                     |
| Mức độ sử dụng      | Hỗ trợ một phần                                              |

#### 4.1. Prompt đã sử dụng

```text
Tôi tiếp tục làm phần Database cho tính năng Google Login và Favorites của đồ án bản đồ DN-Pulse. Hãy giúp tôi viết câu lệnh SQL Server hoàn chỉnh để khởi tạo các bảng lưu thông tin người dùng đăng nhập qua bên thứ ba (Users), bảng lưu các địa điểm yêu thích (UserFavoritePOIs) kết nối khóa ngoại đến bảng POIs có sẵn, và bảng lưu lộ trình (SavedRoutes).
```

#### 4.2. Kết quả AI gợi ý

```
AI đã cung cấp cấu trúc mã lệnh SQL Server:

- Thiết lập bảng Users bổ sung các trường phân tách nhà cung cấp dịch vụ như google_id, auth_provider, avatar_url.

- Thiết lập bảng trung gian UserFavoritePOIs liên kết giữa hai khóa ngoại user_id và poi_id để giải quyết mối quan hệ nhiều - nhiều (N-N).

- Thiết lập bảng SavedRoutes chứa dữ liệu văn bản lớn lưu cấu trúc chuỗi hình học lộ trình GeoJSON của Mapbox.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Các câu lệnh khởi tạo bảng cơ bản (CREATE TABLE) và thiết lập các khóa ngoại, khóa chính liên kết cấu trúc dữ liệu.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

- Phát hiện cấu trúc bảng yêu thích của AI bị thiếu ràng buộc duy nhất khiến dữ liệu bị trùng lặp khi người dùng click liên tục nhiều lần. Sinh viên đã chủ động bổ sung ràng buộc kiểm soát: CONSTRAINT UC_User_POI UNIQUE (user_id, poi_id) để làm sạch dữ liệu đầu vào.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Thấu hiểu cách thiết kế chuẩn hóa cơ sở dữ liệu quan hệ, tránh dư thừa thông tin và đảm bảo tính toàn vẹn dữ liệu thông qua các ràng buộc khóa ngoại chặt chẽ.

### Lần sử dụng AI số 3

| Nội dung            | Thông tin                                                          |
| ------------------- | ------------------------------------------------------------------ |
| Ngày sử dụng        | 26/05/2026                                                         |
| Công cụ AI          | Gemini                                                             |
| Mục đích sử dụng    | Viết mã nguồn xử lý logic xác thực và đồng bộ tài khoản người dùng |
| Phần việc liên quan | Backend / API Routes / Security Authentication                     |
| Mức độ sử dụng      | Hỗ trợ nhiều                                                       |

#### 4.1. Prompt đã sử dụng

Hãy viết cho tôi mã xử lý tệp routes/auth.routes.js bằng Node.js Express tích hợp thư viện google-auth-library để giải mã và xác thực mã credential (idToken) nhận về từ client. Nếu token từ Google hợp lệ, hãy truy vấn kiểm tra email trong SQL Server qua thư viện mssql, tiến hành đăng ký tài khoản tự động nếu chưa có, và dùng thư viện jsonwebtoken để ký một chuỗi JWT Token hệ thống trả về cho client.

#### 4.2. Kết quả AI gợi ý

AI cung cấp cấu trúc cho endpoint POST /api/auth/google:

- Gọi hàm bất đồng bộ client.verifyIdToken({ idToken, audience: CLIENT_ID }) để đảm bảo token an toàn, không bị chỉnh sửa giả mạo.

- Thực hiện logic truy vấn dữ liệu: Kiểm tra SELECT \* FROM Users WHERE email = @email. Nếu dữ liệu rỗng, tiến hành chạy lệnh INSERT INTO Users... để tạo nhanh hồ sơ.

- Đóng gói định danh người dùng vào hàm mã hóa jwt.sign() kèm theo hạn hạn định mức thời gian sử dụng chuỗi mã 24 giờ.

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

- Khung logic bóc tách thông tin cá nhân (payload) từ Google Server và hàm ký mã JWT nội bộ hệ thống.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

- Mã nguồn mẫu của AI sử dụng kiến trúc kết nối Database đơn lẻ kiểu cũ dễ gây nghẽn luồng. Sinh viên đã cấu trúc lại, kết nối gọi lệnh SQL thông qua đối tượng tập trung poolPromise lấy từ tệp ../db.js cốt lõi của dự án nhằm tối ưu tốc độ truy xuất cơ sở dữ liệu.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

- Hiểu rõ quy trình xác thực không mật khẩu (Passwordless Authentication) giúp tăng cường bảo mật thông tin tài khoản cho người dùng cuối.

---

### Lần sử dụng AI số 4

| Nội dung            | Thông tin                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| Ngày sử dụng        | 02/06/2026                                                             |
| Công cụ AI          | Gemini                                                                 |
| Mục đích sử dụng    | Xây dựng Store quản lý trạng thái tập trung cho luồng dữ liệu xác thực |
| Phần việc liên quan | Frontend / State Management / Client Storage                           |
| Mức độ sử dụng      | Hỗ trợ một phần                                                        |

#### 4.1. Prompt đã sử dụng

Tôi đang viết tệp src/frontend/src/store/authStore.ts bằng React TypeScript dùng Zustand. Hãy viết logic action loginWithGoogle để nhận credential từ Google Sign-In, gửi lên backend qua Axios, lưu token nội bộ hệ thống nhận về vào LocalStorage, đồng thời thay đổi biến trạng thái isAuthenticated trên toàn hệ thống.

#### 4.2. Kết quả AI gợi ý

AI đã phác thảo khung cấu trúc quản lý trạng thái:

- Sử dụng hàm create() của Zustand để định nghĩa Store chứa user, token, isAuthenticated.

- Thiết lập hành động loginWithGoogle gọi Axios ngầm, nhận kết quả và kích hoạt localStorage.setItem('token', token).

- Thiết lập hành động logout để dọn dẹp bộ nhớ đẹp và đưa trạng thái ứng dụng về giá trị mặc định.

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

- Logic điều phối đồng bộ luồng dọn dẹp LocalStorage của hàm logout.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

- AI sinh code mẫu dạng JavaScript thô dính lỗi kiểu dữ liệu ẩn any bị trình biên dịch nghiêm ngặt của Vite từ chối. Sinh viên đã tự viết lại theo mô hình TypeScript chuẩn mã nguồn, định nghĩa tường minh cấu trúc Interface cho đối tượng User và định dạng AuthState để bảo vệ mã nguồn.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?
Lập trình viên làm chủ được mô hình điều phối dữ liệu một chiều (Unidirectional Data Flow), giúp việc đồng bộ thông tin tài khoản giữa các màn hình con trở nên đơn giản và nhất quán.

### Lần sử dụng AI số 5

| Nội dung            | Thông tin                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| Ngày sử dụng        | 09/06/2026                                                                      |
| Công cụ AI          | Gemini                                                                          |
| Mục đích sử dụng    | Viết các câu lệnh truy vấn cấu trúc SQL lồng nhau để tối ưu băng thông hệ thống |
| Phần việc liên quan | Backend / Database Query / Security Control                                     |
| Mức độ sử dụng      | Hỗ trợ nhiều                                                                    |

#### 4.1. Prompt đã sử dụng

Tôi cần viết một API router.post("/:id/favorite", authMiddleware, ...) trong tệp routes/poi.routes.js để xử lý logic khi người dùng bấm nút yêu thích. Cơ chế: nếu cặp (user_id, poi_id) đã tồn tại trong bảng UserFavorites thì thực thi lệnh DELETE (bỏ thích), nếu chưa tồn tại thì thực thi lệnh INSERT (thêm thích). Hãy viết cho tôi đoạn code xử lý lồng tối ưu nhất bằng SQL Server.

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.

- AI hướng dẫn gộp logic kiểm tra và xử lý trực tiếp bên trong một câu lệnh SQL duy nhất:

- Sử dụng mệnh đề điều kiện IF EXISTS (SELECT 1 FROM UserFavorites WHERE user_id = @user_id AND poi_id = @poi_id).

- Nhánh 1: Nếu điều kiện đúng, thực thi câu lệnh xóa bản ghi dữ liệu DELETE FROM UserFavorites....

- Nhánh 2: Nếu điều kiện sai, thực thi câu lệnh thêm bản ghi dữ liệu INSERT INTO UserFavorites....

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

- Khung cú pháp mệnh đề kiểm tra điều kiện tồn tại dữ liệu IF EXISTS của SQL Server.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

- Code mẫu của AI lấy trực tiếp tham số mã người dùng truyền tự do từ Client lên (req.body.user_id), điều này mở ra lỗ hổng bảo mật nghiêm trọng (ID Spoofing). Sinh viên đã sửa đổi bằng cách trích xuất user_id trực tiếp từ token giải mã an toàn nằm trong req.user.id do bộ chặn authMiddleware cung cấp để bảo vệ thông tin người dùng.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

- Năng cao năng lực tư duy bảo mật hệ thống, luôn hoài nghi dữ liệu đầu vào (Input Validation) gửi lên từ máy Client để phòng chống mã độc can thiệp.

### Lần sử dụng AI số 6

| Nội dung            | Thông tin                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| Ngày sử dụng        | 17/06/2026                                                                   |
| Công cụ AI          | Gemini                                                                       |
| Mục đích sử dụng    | Tối ưu cấu trúc render Virtual DOM của hệ thống hiển thị lớp Marker trên Map |
| Phần việc liên quan | Frontend UI/UX / Map Rendering Optimization / State Isolation                |
| Mức độ sử dụng      | Hỗ trợ một phần                                                              |

#### 4.1. Prompt đã sử dụng

Trong ứng dụng Mapbox React của tôi, mỗi lần người dùng click icon trái tim để thích địa điểm, tôi gọi API lưu xong rồi gọi lại API tải toàn bộ danh sách POIs khiến bản đồ số bị đứng và giật lag rất chậm do phải nạp lại tất cả các Marker từ đầu. Làm sao để tối ưu hóa việc bật/tắt màu đỏ của trái tim trên Marker ngay lập tức mà không làm ảnh hưởng đến bản đồ?

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.
AI đã phân tích nguyên nhân gây thắt nút cổ chai hiệu năng và đề xuất giải pháp xử lý dữ liệu đệm cục bộ:

- Tuyệt đối không được kích hoạt hành vi reload dữ liệu tổng hoặc tải lại giao diện bản đồ.

- Khởi tạo riêng một Store phụ tên là favoritePoiStore.ts để lưu giữ một mảng số nguyên nhỏ chứa duy nhất ID các địa điểm đã thích (favoriteIds: number[]).

- Sử dụng phương pháp cập nhật giao diện lạc quan (Optimistic UI Update): Khi nhấn nút, lập tức thay đổi mảng này cục bộ ở Frontend trước để biểu tượng trái tim đổi màu ngay lập tức dưới 0.1 giây, tiến trình gọi Axios lưu DB sẽ chạy ẩn dưới nền.

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

- Giải pháp kiến trúc mảng đệm ID (favoriteIds.includes(poi.id)) để cô lập trạng thái hiển thị của Component con.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

- Để phòng ngừa sự cố lỗi kết nối mạng làm sai lệch dữ liệu giữa Client và DB, sinh viên đã tự tích hợp thêm cơ chế khôi phục trạng thái ngược (Rollback mechanism): Nếu khối lệnh Axios báo lỗi thất bại, ứng dụng tự động hoàn trả mảng ID đệm về trạng thái cũ và nổ thông báo lỗi bằng Toast thông báo cho khách hàng.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

- Thấu hiểu bản chất cơ chế hoạt động của bộ khuếch đại Virtual DOM trong React, biết cách viết mã nguồn sạch cô lập các trạng thái để bảo vệ hiệu năng ứng dụng.

### Lần sử dụng AI số 7

| Nội dung            | Thông tin                                                                         |
| ------------------- | --------------------------------------------------------------------------------- |
| Ngày sử dụng        | 24/06/2026                                                                        |
| Công cụ AI          | Gemini                                                                            |
| Mục đích sử dụng    | Debug lỗi bất đồng bộ vòng đời token mạng và rà soát lỗi kiểu dữ liệu nghiêm ngặt |
| Phần việc liên quan | Frontend Debugging / Network Interceptors / Type Alignment                        |
| Mức độ sử dụng      | Hỗ trợ nhiều                                                                      |

#### 4.1. Prompt đã sử dụng

Hệ thống của tôi đang bị lỗi trắng màn hình sau khi đăng nhập bằng Google. Thêm vào đó, khi trang chủ Map vừa load lên, các API gọi lấy danh sách yêu thích lập tức trả về mã lỗi 401 Unauthorized do token lưu trong localStorage chưa kịp đính kèm vào Header của Axios Client. Hãy hướng dẫn tôi sửa file src/frontend/src/services/api.ts để xử lý dứt điểm tình trạng này.

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.
AI đã phân tích chu kỳ bất đồng bộ mạng và hướng dẫn thiết lập bộ đánh chặn request động:

- Thay vì gán cứng token lúc khởi tạo Axios Instance, sử dụng hàm chặn trước hành trình gửi: apiClient.interceptors.request.use(config => {...}).

- Bên trong hàm đánh chặn ngầm, gọi trực tiếp câu lệnh localStorage.getItem('token') theo thời gian thực để đính kèm động vào thuộc tính header Authorization

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

- Giải pháp và đoạn mã cấu hình bộ chặn Interceptor động trong tệp src/frontend/src/services/api.ts.

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

- Đối với lỗi sập luồng gây trắng trang (Blank Page Error), sinh viên tự rà soát mã nguồn phát hiện do Database vừa nâng cấp thêm trường mực nước (depth_cm), nhưng Interface TypeScript cũ chưa khai báo trường này dẫn đến luồng render của Vite bị sập. Sinh viên đã tự tay cập nhật đồng bộ các tệp Type Interface để cứu sập ứng dụng thành công.

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

- Làm chủ kỹ thuật đánh chặn luồng dữ liệu mạng (Network Interception), kiểm soát tốt lỗi đồng bộ vòng đời phần mềm nâng cao.

---

### Lần sử dụng AI số 8

| Nội dung            | Thông tin                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Ngày sử dụng        |                                                                                                        |
| Công cụ AI          | ChatGPT / Gemini / Claude / GitHub Copilot / Cursor / Antigravity / Khác                               |
| Mục đích sử dụng    |                                                                                                        |
| Phần việc liên quan | Requirement / Design / Database / Frontend / Backend / Testing / Debug / Report / Presentation / Other |
| Mức độ sử dụng      | Hỗ trợ ý tưởng / Hỗ trợ một phần / Hỗ trợ nhiều / Sinh chính nội dung                                  |

#### 4.1. Prompt đã sử dụng

```text
Dán nguyên văn prompt đã hỏi AI tại đây.
```

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.

```text
Viết tại đây...
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

```text
Viết tại đây...
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

```text
Viết tại đây...
```

#### 4.5. Minh chứng

| Loại minh chứng   | Nội dung |
| ----------------- | -------- |
| Link commit       |          |
| File liên quan    |          |
| Screenshot        |          |
| Kết quả chạy/test |          |
| Link video demo   |          |
| Ghi chú khác      |          |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

```text
Viết tại đây...
```

---

---

## 5. Bảng tổng hợp mức độ sử dụng AI

Đánh dấu mức độ AI hỗ trợ ở từng hạng mục.

| Hạng mục                    | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh chính | Ghi chú |
| --------------------------- | :-----------: | :----------: | :-------------: | :-----------: | ------- |
| Phân tích yêu cầu           |               |              |                 |               |         |
| Viết user story/use case    |               |              |                 |               |         |
| Thiết kế database           |               |              |                 |               |         |
| Thiết kế kiến trúc hệ thống |               |              |                 |               |         |
| Thiết kế giao diện          |               |              |                 |               |         |
| Code frontend               |               |              |                 |               |         |
| Code backend                |               |              |                 |               |         |
| Debug lỗi                   |               |              |                 |               |         |
| Viết test case              |               |              |                 |               |         |
| Kiểm thử sản phẩm           |               |              |                 |               |         |
| Tối ưu code                 |               |              |                 |               |         |
| Viết báo cáo                |               |              |                 |               |         |
| Làm slide thuyết trình      |               |              |                 |               |         |

---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
| --: | ----------------- | -------------- | ------------------- |
|   1 |                   |                |                     |
|   2 |                   |                |                     |
|   3 |                   |                |                     |

---

## 7. Kiểm chứng kết quả AI

Mô tả cách sinh viên/nhóm kiểm tra lại kết quả do AI gợi ý.

Có thể bao gồm:

- Chạy thử chương trình
- Viết test case
- So sánh với yêu cầu đề bài
- Kiểm tra output
- Đối chiếu tài liệu môn học
- Hỏi lại giảng viên
- Review cùng thành viên nhóm
- Kiểm tra lỗi bảo mật
- Kiểm tra bằng dữ liệu mẫu
- So sánh trước và sau khi dùng AI

### Nội dung kiểm chứng

```text
Viết tại đây...
```

---

## 8. Đóng góp cá nhân hoặc đóng góp nhóm

### 8.1. Đối với bài cá nhân

Mô tả phần sinh viên tự làm, phần AI hỗ trợ và phần đã tự cải tiến.

```text
Viết tại đây...
```

### 8.2. Đối với bài nhóm

| Thành viên | MSSV | Nhiệm vụ chính | Có sử dụng AI không? | Minh chứng đóng góp |
| ---------- | ---- | -------------- | -------------------- | ------------------- |
|            |      |                | Có / Không           |                     |
|            |      |                | Có / Không           |                     |
|            |      |                | Có / Không           |                     |
|            |      |                | Có / Không           |                     |

---

## 9. Reflection cuối bài

### 9.1. AI đã hỗ trợ em/nhóm ở điểm nào?

```text
Viết tại đây...
```

### 9.2. Phần nào em/nhóm không sử dụng theo gợi ý của AI? Vì sao?

```text
Viết tại đây...
```

### 9.3. Em/nhóm đã kiểm tra tính đúng đắn của kết quả AI như thế nào?

```text
Viết tại đây...
```

### 9.4. Nếu không có AI, phần nào sẽ khó khăn nhất?

```text
Viết tại đây...
```

### 9.5. Sau bài tập/project này, em/nhóm học được gì về môn học?

```text
Viết tại đây...
```

### 9.6. Sau bài tập/project này, em/nhóm học được gì về cách sử dụng AI có trách nhiệm?

```text
Viết tại đây...
```

---

## 10. Cam kết học thuật

Sinh viên/nhóm cam kết rằng:

- Nội dung AI hỗ trợ đã được ghi nhận trung thực.
- Không nộp nguyên văn kết quả AI mà không kiểm tra.
- Có khả năng giải thích các phần đã nộp.
- Chịu trách nhiệm về tính đúng đắn của sản phẩm cuối cùng.
- Hiểu rằng việc sử dụng AI không khai báo có thể ảnh hưởng đến kết quả đánh giá.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
| ----------------------- | ------------- |
|                         |               |
