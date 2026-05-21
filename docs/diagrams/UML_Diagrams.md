1. Hình ảnh Sơ đồ Tổng quan
   ![Sơ đồ Use Case DN-Pulse](./UseCase_Diagram.png)
3. Các Tác nhân (Actors)
- Sơ đồ bao gồm 3 tác nhân chính:
- User (Người dùng): Tương tác trực tiếp với các tính năng cốt lõi của hệ thống ở mặt ứng dụng.
- Admin (Quản trị viên): Chịu trách nhiệm quản lý dữ liệu hệ thống và kiểm soát báo cáo thống kê.
- OpenStreetMap API: Hệ thống cung cấp dịch vụ bản đồ bên thứ ba (External System) mà ứng dụng tích hợp để lấy dữ liệu nền.
3. Các Luồng chức năng chính
- Nhóm chức năng của User: Tập trung vào trải nghiệm định hướng, quan sát và an toàn đô thị, bao gồm các Use Case:
  -  Xem bản đồ & Sự kiện
  -  Mô phỏng giao thông theo Timeline
  -  Lưu & Quản lý lộ trình
  -  Nhận thông báo cảnh báo vùng đệm
  -  Tìm đường thoát hiểm khẩn cấp
  -  Định tuyến thông minh đa lựa chọn
-  Nhóm chức năng của Admin: Tập trung vào vận hành, bao gồm:
   -  Quản lý dữ liệu POI du lịch
   -  Xem báo cáo thống kê
4. Các Mối quan hệ Bao hàm (<<include>>)
- Sơ đồ thể hiện rõ các ràng buộc bắt buộc giữa các Use Case:
- Đăng ký / Đăng nhập: Là chức năng bắt buộc (<<include>>) để thực hiện "Lưu & Quản lý lộ trình" (đối với User) cũng như "Quản lý dữ liệu POI du lịch" và "Xem báo cáo thống kê" (đối với Admin).
- Khai thác dữ liệu nền bản đồ: Chức năng này kết nối trực tiếp với OpenStreetMap API và được yêu cầu bắt buộc (<<include>>) bởi "Tìm đường thoát hiểm khẩn cấp" và "Định tuyến thông minh đa lựa chọn".
- Định tuyến thông minh đa lựa chọn: Được bao hàm (<<include>>) bởi chức năng "Nhận thông báo cảnh báo vùng đệm".
