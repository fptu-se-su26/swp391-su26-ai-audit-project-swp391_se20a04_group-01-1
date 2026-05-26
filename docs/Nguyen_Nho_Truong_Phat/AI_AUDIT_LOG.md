# AI Audit Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học |SWP|
| Mã môn học |391|
| Lớp |SE20A04|
| Học kỳ |SU26|
| Tên bài tập / Project |DN-Pulse: Intelligent Urban Routing System|
| Tên sinh viên / Nhóm |Nguyễn Nho Trường Phát|
| MSSV / Danh sách MSSV |DE190716|
| Giảng viên hướng dẫn |QuangLTN3|
| Ngày bắt đầu |2026-05-26|
| Ngày hoàn thành |  |

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

```
- Gợi ý ý tưởng giải pháp
- Thiết kế database
- Thiết kế giao diện
- Viết code mẫu
- Debug lỗi
- Tối ưu code
- Viết test case
- Viết báo cáo
- Tìm hiểu các cách làm và triển khai
...

## 4. Nhật ký sử dụng AI chi tiết

> Mỗi lần sử dụng AI cho một phần quan trọng của bài tập/project, sinh viên cần ghi lại theo mẫu bên dưới.  
> Sinh viên/nhóm có thể nhân bản mẫu “Lần sử dụng AI” nhiều lần tùy theo số lần sử dụng AI thực tế.

---

### Lần sử dụng AI số 1

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng |2026-05-26|
| Công cụ AI | ChatGPT / Gemini / Claude / Antigravity |
| Mục đích sử dụng |Thiết kế Database|
| Phần việc liên quan | Database |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```1. Tối ưu kiểu dữ liệu không gian (Spatial Data) Bạn đang sử dụng SQL Server, một hệ quản trị hỗ trợ cực kỳ mạnh mẽ kiểu dữ liệu GEOGRAPHY. Lỗi ở các thuộc tính: Trong các bảng FloodZones và EventRoads, bạn đang để các trường như polygon_coordinates, polyline_encoded, và geojson_coords. Trong thực tế, bạn không nên lưu tọa độ dưới dạng chuỗi văn bản (như VARCHAR hay JSON text). Gợi ý sửa: Hãy gộp chung lại thành một thuộc tính duy nhất mang tên geography_data (hoặc affected_area) và set cứng kiểu dữ liệu là GEOGRAPHY. Backend của bạn sẽ gọi thẳng hàm STDistance hoặc STIntersects của SQL Server để xử lý. Với bảng Events & POIs: Bạn đang tách rời latitude và longitude. Điều này ổn định cho truy vấn cơ bản, nhưng để tối ưu hóa việc tìm các sự kiện "trong bán kính 2-5km", bạn nên thêm một trường location_point (kiểu GEOGRAPHY) để SQL Server có thể đánh index không gian (Spatial Index). 2. Chuẩn hóa mối quan hệ Nhiều-Nhiều (M:N) Lỗi ở UserFavoriteEvents: Trên sơ đồ, bạn đang biểu diễn UserFavoriteEvents (với thuộc tính saved_at) như một thuộc tính của đường liên kết (relationship diamond) giữa User và Events. Gợi ý sửa: Trong cơ sở dữ liệu quan hệ, bạn không thể code một đường liên kết. Bạn bắt buộc phải chuyển nó thành một bảng trung gian (Associative Entity). Bảng này sẽ có tên là UserFavoriteEvents gồm các cột: user_id (FK), event_id (FK), và saved_at. Khóa chính của bảng này sẽ là khóa ghép (user_id, event_id). 3. Nguy cơ phình to (Bloat) ở bảng Notifications Lỗi logic hệ thống: Bảng Notifications của bạn đang trỏ trực tiếp bằng user_id. Như mình đã từng lưu ý trước đây, nếu có một sự kiện cấm đường lớn ảnh hưởng đến 10.000 người dùng, việc backend tạo ra 10.000 dòng dữ liệu INSERT vào bảng này cùng một lúc sẽ làm sập hoặc phình to Database một cách lãng phí. Gợi ý sửa: Hãy tách thành 2 bảng: NotificationTemplates (Lưu nội dung thông báo gốc: id, title, message, type, created_at). UserNotifications (Chỉ lưu trạng thái đọc của người dùng: user_id, notification_template_id, is_read). (Thậm chí trong thực tế, các thông báo mang tính Real-time thường được đẩy thẳng qua Firebase Push Notification chứ không lưu cứng toàn bộ vào SQL DB ). 4. Tinh chỉnh bảng TrafficAlerts và EventRoads Lỗi dư thừa khóa ngoại: Bảng TrafficAlerts đang có liên kết khóa ngoại event_id. Nếu một sự cố giao thông (tai nạn, tắc đường đột xuất) không liên quan đến sự kiện nào cả, trường này sẽ bị Null. Đồng thời, bạn đã có bảng EventRoads chuyên xử lý các tuyến đường bị cấm do sự kiện. Gợi ý sửa: Giữ nguyên EventRoads để quản lý các tuyến đường phục vụ sự kiện. Đối với TrafficAlerts, hãy đảm bảo trường event_id là tùy chọn (Nullable) hoặc tốt nhất là loại bỏ nó nếu bạn muốn bảng này chỉ thuần túy lưu trữ dữ liệu kẹt xe/tai nạn ngẫu nhiên, tách biệt hoàn toàn với logic sự kiện. 5. Quản lý Route Data trong SavedRoutes Lưu ý thiết kế: Bảng SavedRoutes của bạn có trường route_data. Khi Mapbox API trả về một tuyến đường, dữ liệu JSON của tuyến đường đó rất lớn (chứa hàng ngàn điểm tọa độ để vẽ Polyline). Gợi ý sửa: Nếu bạn lưu toàn bộ file JSON đó vào SQL Server, hãy sử dụng kiểu dữ liệu NVARCHAR(MAX) hoặc lưu nó ở một dịch vụ lưu trữ ngoài (như AWS S3/Firebase Storage) và chỉ lưu route_data_url trong Database. Nếu bạn chỉ cần điểm đầu và cuối (origin_lat, destination_lat), khi người dùng mở lại, hãy gọi lại Mapbox API để xin đường mới nhất, như vậy sẽ đảm bảo tuyến đường luôn được cập nhật tình trạng giao thông thực tế.
```

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.

```
Được, mình sẽ phân tích thẳng vào phần bạn gửi. Nhìn chung SQL hiện tại của bạn đã làm được project, không sai nghiêm trọng. Các góp ý bạn liệt kê phía dưới là đúng theo hướng “nâng cấp chuyên nghiệp”, nhưng không phải cái nào cũng nên sửa ngay, vì nếu sửa quá sâu sẽ làm bạn khó code backend/frontend hơn.

Theo thiết kế ban đầu trong file DN-Pulse, database của bạn gồm 11 bảng, trong đó Users, Events, TrafficAlerts, EventRoads, POIs, SavedRoutes, UserFavoriteEvents, Notifications là các bảng chính để phục vụ sự kiện, giao thông, bản đồ và trải nghiệm người dùng.

Kết luận nhanh

Bạn có thể giữ gần như nguyên bản SQL hiện tại, chỉ nên chỉnh một số điểm sau:

Vấn đề	Có nên sửa ngay không?	Mức độ
Đổi password thành password_hash	Có	Bắt buộc nên sửa
UserFavoriteEvents	Không cần sửa	Bạn đã làm đúng
Notifications tách 2 bảng	Nên sửa nếu muốn chuẩn hơn	Khá quan trọng
Spatial Data GEOGRAPHY	Có thể thêm, không bắt buộc thay hết	Nâng cao
TrafficAlerts.event_id	Giữ nullable như hiện tại	Đúng rồi
SavedRoutes.route_data	Giữ NVARCHAR(MAX) được	Đủ dùng cho project
Thêm updated_at cho vài bảng	Nên thêm	Tốt hơn

Sau đó AI đưa ra các code mẫu và giải thích
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

```
copy hết tất cả code mẫu từ AI để test
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

```text
Viết tại đây...
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot |  |
| Kết quả chạy/test |  |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

```
có được databse để test hệ thống 
```

---

### Lần sử dụng AI số 2

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng |  |
| Công cụ AI | ChatGPT / Gemini / Claude / GitHub Copilot / Cursor / Antigravity / Khác |
| Mục đích sử dụng |  |
| Phần việc liên quan | Requirement / Design / Database / Frontend / Backend / Testing / Debug / Report / Presentation / Other |
| Mức độ sử dụng | Hỗ trợ ý tưởng / Hỗ trợ một phần / Hỗ trợ nhiều / Sinh chính nội dung |

#### 4.1. Prompt đã sử dụng

```text
Dán nguyên văn prompt đã hỏi AI tại đây.
```

#### 4.2. Kết quả AI gợi ý

```text
Viết tại đây...
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
Viết tại đây...
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
Viết tại đây...
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot |  |
| Kết quả chạy/test |  |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
Viết tại đây...
```

---

### Lần sử dụng AI số 3

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng |  |
| Công cụ AI | ChatGPT / Gemini / Claude / GitHub Copilot / Cursor / Antigravity / Khác |
| Mục đích sử dụng |  |
| Phần việc liên quan | Requirement / Design / Database / Frontend / Backend / Testing / Debug / Report / Presentation / Other |
| Mức độ sử dụng | Hỗ trợ ý tưởng / Hỗ trợ một phần / Hỗ trợ nhiều / Sinh chính nội dung |

#### 4.1. Prompt đã sử dụng

```text
Dán nguyên văn prompt đã hỏi AI tại đây.
```

#### 4.2. Kết quả AI gợi ý

```text
Viết tại đây...
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
Viết tại đây...
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
Viết tại đây...
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot |  |
| Kết quả chạy/test |  |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
Viết tại đây...
```

---

## 5. Bảng tổng hợp mức độ sử dụng AI

Đánh dấu mức độ AI hỗ trợ ở từng hạng mục.

| Hạng mục | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu |  |  |  |  |  |
| Viết user story/use case |  |  |  |  |  |
| Thiết kế database |  |  |  |  |  |
| Thiết kế kiến trúc hệ thống |  |  |  |  |  |
| Thiết kế giao diện |  |  |  |  |  |
| Code frontend |  |  |  |  |  |
| Code backend |  |  |  |  |  |
| Debug lỗi |  |  |  |  |  |
| Viết test case |  |  |  |  |  |
| Kiểm thử sản phẩm |  |  |  |  |  |
| Tối ưu code |  |  |  |  |  |
| Viết báo cáo |  |  |  |  |  |
| Làm slide thuyết trình |  |  |  |  |  |

---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
|---:|---|---|---|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |

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
|---|---|---|---|---|
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |

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
|---|---|
|  |  |
