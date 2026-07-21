import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  Mail,
  AlertCircle,
  MapPin,
  Navigation,
  Clock,
  Star,
  Shield,
  Lock,
  Image,
  AlertTriangle,
  Send,
  Copy,
  CheckCircle2,
  HelpCircle,
  Compass,
  Lightbulb,
} from "lucide-react";

// Định nghĩa data
interface SupportCategory {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  emoji: string;
  items: {
    question: string;
    icon: React.ComponentType<any>;
  }[];
}

interface SupportContent {
  category: string;
  question: string;
  content: React.ReactNode;
}

const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: "map",
    title: "Bản đồ",
    emoji: "🗺️",
    icon: MapPin,
    items: [
      { question: "Làm sao tìm đường?", icon: Navigation },
      { question: "Định vị hiện tại", icon: MapPin },
      { question: "Ý nghĩa biểu tượng", icon: Star },
    ],
  },
  {
    id: "events",
    title: "Sự kiện",
    emoji: "🎉",
    icon: Star,
    items: [
      { question: "Xem sự kiện hôm nay", icon: Clock },
      { question: "Lưu sự kiện yêu thích", icon: Star },
      { question: "Xem chi tiết", icon: AlertCircle },
    ],
  },
  {
    id: "flood",
    title: "Ngập lụt & Giao thông",
    emoji: "🌊",
    icon: AlertTriangle,
    items: [
      { question: "Ý nghĩa màu sắc", icon: AlertCircle },
      { question: "Tuyến đường an toàn", icon: Navigation },
      { question: "Cảnh báo ngập", icon: AlertTriangle },
    ],
  },
  {
    id: "account",
    title: "Tài khoản",
    emoji: "👤",
    icon: Shield,
    items: [
      { question: "Đổi mật khẩu", icon: Lock },
      { question: "Đổi ngôn ngữ", icon: AlertCircle },
      { question: "Quản lý yêu thích", icon: Star },
    ],
  },
  {
    id: "contact",
    title: "Liên hệ",
    emoji: "📧",
    icon: Mail,
    items: [
      { question: "Email hỗ trợ", icon: Mail },
      { question: "Báo lỗi", icon: AlertCircle },
    ],
  },
];

// Content cho từng câu hỏi
const getSupportContent = (category: string, question: string): SupportContent => {
  const contents: Record<string, Record<string, SupportContent>> = {
    map: {
      "Làm sao tìm đường?": {
        category: "🗺️ Bản đồ",
        question: "📍 Làm sao tìm đường?",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Mục đích</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Chức năng này giúp bạn tìm tuyến đường tối ưu từ vị trí hiện tại hoặc một điểm bất kỳ đến địa điểm mong muốn, tích hợp thuật toán tự động né tránh vùng ngập và ùn tắc.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Mở bản đồ DN-Pulse.</li>
                <li><strong>2.</strong> Tìm địa điểm bằng cách sử dụng thanh tìm kiếm hoặc nhấn trực tiếp vào điểm trên bản đồ.</li>
                <li><strong>3.</strong> Trong cửa sổ thông tin, nhấn nút chỉ đường để mở bảng điều khiển lộ trình.</li>
                <li><strong>4.</strong> Chọn phương tiện di chuyển: Ô tô, Xe máy/Xe đạp, hoặc Đi bộ.</li>
                <li><strong>5.</strong> Hệ thống sẽ tính toán và hiển thị trực tiếp trên bản đồ.</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Lưu ý:</strong> Nếu tuyến đường dự kiến đi qua khu vực ngập nặng hoặc cấm đường, hệ thống sẽ tự động chuyển hướng sang đường vòng an toàn nhất.
              </p>
            </div>
          </div>
        ),
      },
      "Định vị hiện tại": {
        category: "🗺️ Bản đồ",
        question: "📍 Định vị hiện tại",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Nhấn nút <strong>Vị trí của tôi</strong> (nằm trong nhóm công cụ trên màn hình).</li>
                <li><strong>2.</strong> Chọn <strong>Cho phép</strong> khi trình duyệt hỏi quyền truy cập vị trí.</li>
                <li><strong>3.</strong> Hệ thống sẽ tự động di chuyển màn hình đến vị trí của bạn.</li>
              </ol>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 mb-2">
                <strong>✓ Nhận diện:</strong> Vị trí của bạn được thể hiện bằng một chấm tròn màu xanh dương, kèm theo vòng sóng phát sáng tỏa ra xung quanh.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Xử lý lỗi:</strong> Nếu không tìm thấy vị trí, hãy kiểm tra lại thiết lập GPS trên thiết bị và tải lại trang.
              </p>
            </div>
          </div>
        ),
      },
      "Ý nghĩa biểu tượng": {
        category: "🗺️ Bản đồ",
        question: "📍 Ý nghĩa biểu tượng trên hệ thống",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">DN-Pulse sử dụng bộ icon chuẩn mực và các dải màu trực quan:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Loại hiển thị</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Ý nghĩa</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700">Ghim Bản đồ</td>
                    <td className="px-3 py-2 text-slate-600">Các địa điểm (POI) được đánh dấu trên bản đồ</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700">Ngôi sao</td>
                    <td className="px-3 py-2 text-slate-600">Địa điểm hoặc sự kiện đã thêm vào mục Yêu thích</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700">La bàn</td>
                    <td className="px-3 py-2 text-slate-600">Nút điều hướng. Mũi tên xoay khi tìm đường</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700">Khiên cảnh báo</td>
                    <td className="px-3 py-2 text-slate-600">Cảnh báo về sự cố giao thông hoặc lỗi hệ thống</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-700">Vùng ngập lụt</td>
                    <td className="px-3 py-2 text-slate-600">Hiển thị cảnh báo dựa trên độ sâu ngập</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    },
    events: {
      "Xem sự kiện hôm nay": {
        category: "🎉 Sự kiện",
        question: "📅 Xem sự kiện",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Bật lớp hiển thị Sự kiện trong bảng Điều khiển Lớp.</li>
                <li><strong>2.</strong> Mở bảng điều khiển bên để xem danh sách các sự kiện đang diễn ra.</li>
                <li><strong>3.</strong> Nhấn vào một sự kiện bất kỳ để xem chi tiết.</li>
              </ol>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                <strong>ℹ️ Thông tin:</strong> Chi tiết bao gồm tên, thời gian, ban tổ chức và mô tả chi tiết.
              </p>
            </div>
          </div>
        ),
      },
      "Lưu sự kiện yêu thích": {
        category: "🎉 Sự kiện",
        question: "❤️ Lưu sự kiện & Địa điểm yêu thích",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Mở cửa sổ chi tiết của sự kiện hoặc địa điểm.</li>
                <li><strong>2.</strong> Nhấn nút Yêu thích. Hệ thống sẽ hiện thông báo "Thành công" ở góc màn hình.</li>
                <li><strong>3.</strong> Để xem lại, hãy vào mục <strong>Hồ sơ &gt; Địa điểm của tôi</strong>.</li>
              </ol>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>✓ Quản lý:</strong> Bạn có thể quản lý, xem lại hoặc xóa các điểm đã lưu.
              </p>
            </div>
          </div>
        ),
      },
      "Xem chi tiết": {
        category: "🎉 Sự kiện",
        question: "Xem chi tiết sự kiện",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Mỗi sự kiện có các thông tin chi tiết như:
            </p>
            <ul className="text-sm text-slate-600 space-y-2 ml-4">
              <li>• <strong>Tên sự kiện:</strong> Tên chính thức của sự kiện</li>
              <li>• <strong>Thời gian:</strong> Ngày giờ bắt đầu và kết thúc</li>
              <li>• <strong>Địa điểm:</strong> Vị trí tổ chức trên bản đồ</li>
              <li>• <strong>Ban tổ chức:</strong> Người/tổ chức chịu trách nhiệm</li>
              <li>• <strong>Mô tả:</strong> Thông tin chi tiết về sự kiện</li>
              <li>• <strong>Ảnh đại diện:</strong> Hình ảnh minh họa</li>
            </ul>
          </div>
        ),
      },
    },
    flood: {
      "Ý nghĩa màu sắc": {
        category: "🌊 Ngập lụt & Giao thông",
        question: "Ý nghĩa màu sắc",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-3">Hệ thống sử dụng các màu sắc chuẩn để cảnh báo mức độ ngập và ùn tắc giao thông:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <div className="text-sm"><strong className="text-green-700">Xanh lá:</strong> An toàn, có thể di chuyển</div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <div className="text-sm"><strong className="text-yellow-700">Vàng:</strong> Cảnh báo, lưu ý di chuyển</div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <div className="text-sm"><strong className="text-orange-700">Cam:</strong> Nguy hiểm, cần tránh</div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <div className="w-6 h-6 bg-red-600 rounded"></div>
                <div className="text-sm"><strong className="text-red-700">Đỏ:</strong> Cấm, không thể di chuyển</div>
              </div>
            </div>
          </div>
        ),
      },
      "Tuyến đường an toàn": {
        category: "🌊 Ngập lụt & Giao thông",
        question: "🚗 Tuyến đường an toàn",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Thuật toán hoạt động</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Khi bạn tìm đường, hệ thống kiểm tra các điểm ngập và điểm kẹt xe.</li>
                <li><strong>2.</strong> Đánh giá mức độ nguy hiểm dựa trên độ sâu ngập và mức độ ùn tắc.</li>
                <li><strong>3.</strong> Tự động chọn tuyến đường an toàn nhất hoặc báo cảnh báo nếu cần.</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Ngưỡng an toàn:</strong> Mức ngập dưới 10cm được coi là có thể đi qua nhưng với cảnh báo. Trên 10cm sẽ tự động tìm đường vòng.
              </p>
            </div>
          </div>
        ),
      },
      "Cảnh báo ngập": {
        category: "🌊 Ngập lụt & Giao thông",
        question: "Cảnh báo ngập",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các loại cảnh báo</h4>
              <div className="space-y-3">
                <div className="border-l-4 border-yellow-500 pl-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">Cảnh báo nhẹ (Dưới 10cm)</p>
                  <p className="text-sm text-slate-600">Tuyến đường có đi qua vùng ngập nhẹ khoảng ...cm, chú ý di chuyển.</p>
                </div>
                <div className="border-l-4 border-red-600 pl-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">Cảnh báo nặng (Trên 10cm)</p>
                  <p className="text-sm text-slate-600">Hệ thống coi đây là đường cấm và tự động tìm đường vòng.</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>⚠️ Trường hợp khẩn cấp:</strong> Nếu mọi ngả đường đều bị phong tỏa, hệ thống sẽ thông báo "Không tìm thấy tuyến đường an toàn".
              </p>
            </div>
          </div>
        ),
      },
    },
    account: {
      "Đổi mật khẩu": {
        category: "👤 Tài khoản",
        question: "🔑 Đổi mật khẩu",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Vào <strong>Hồ sơ &gt; Đổi mật khẩu</strong>.</li>
                <li><strong>2.</strong> Nhập Mật khẩu hiện tại (bỏ qua nếu dùng Google).</li>
                <li><strong>3.</strong> Nhập Mật khẩu mới. Mật khẩu phải có ít nhất 8 ký tự.</li>
                <li><strong>4.</strong> Xác nhận lại mật khẩu và nhấn <strong>Thay đổi</strong>.</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 mb-2">
                <strong>✓ Đánh giá mật khẩu:</strong> Hệ thống có thanh hiển thị đánh giá độ mạnh của mật khẩu theo 4 mức:
              </p>
              <ul className="text-sm text-blue-700 ml-4">
                <li>• <strong className="text-red-600">Yếu</strong> - Màu đỏ</li>
                <li>• <strong className="text-yellow-600">Trung bình</strong> - Màu vàng</li>
                <li>• <strong className="text-blue-600">Tốt</strong> - Màu xanh</li>
                <li>• <strong className="text-green-600">Mạnh</strong> - Màu xanh lá</li>
              </ul>
            </div>
          </div>
        ),
      },
      "Đổi ngôn ngữ": {
        category: "👤 Tài khoản",
        question: "Đổi ngôn ngữ",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Hệ thống hiện hỗ trợ các ngôn ngữ sau:
            </p>
            <ul className="text-sm text-slate-600 space-y-2 ml-4">
              <li>• <strong>Tiếng Việt</strong> - Ngôn ngữ mặc định</li>
              <li>• <strong>English</strong> - Tiếng Anh</li>
              <li>• <strong>中文</strong> - Tiếng Trung</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Hướng dẫn:</strong> Các cài đặt ngôn ngữ có thể được thay đổi trong mục Cài đặt hoặc trực tiếp trên giao diện chính.
              </p>
            </div>
          </div>
        ),
      },
      "Quản lý yêu thích": {
        category: "👤 Tài khoản",
        question: "⭐ Quản lý dữ liệu yêu thích",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-3">
              Khi truy cập trang Hồ sơ, bạn có thể quản lý các loại dữ liệu sau:
            </p>
            <div className="space-y-3">
              <div className="p-3 border border-slate-200 rounded-lg">
                <p className="text-sm font-semibold text-slate-800 mb-1">Địa điểm của tôi</p>
                <p className="text-sm text-slate-600">Chứa các POI/Sự kiện đã lưu. Bạn có thể xem, chỉnh sửa hoặc xóa.</p>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg">
                <p className="text-sm font-semibold text-slate-800 mb-1">Lộ trình đã lưu</p>
                <p className="text-sm text-slate-600">Quản lý các tuyến đường an toàn bạn đã đi qua. Chia sẻ cho người khác hoặc xem lại khoảng cách/thời gian.</p>
              </div>
            </div>
          </div>
        ),
      },
    },
    contact: {
      "Email hỗ trợ": {
        category: "📧 Liên hệ & Báo cáo",
        question: "📧 Email hỗ trợ",
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">📧 Email liên hệ:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-blue-200 flex-1">
                  support@dnpulse.vn
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("support@dnpulse.vn");
                    alert("Đã sao chép email!");
                  }}
                  className="p-2 hover:bg-blue-100 rounded transition"
                  title="Sao chép"
                >
                  <Copy size={16} className="text-blue-600" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-2">⏱️ Thời gian phản hồi:</p>
              <p className="text-sm text-slate-600">Trong vòng 24–48 giờ làm việc.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>✓ Gợi ý:</strong> Hãy cung cấp chi tiết về vấn đề của bạn để đội hỗ trợ có thể giải quyết nhanh chóng hơn.
              </p>
            </div>
          </div>
        ),
      },
      "Báo lỗi": {
        category: "📧 Liên hệ & Báo cáo",
        question: "📝 Báo lỗi & Báo cáo giao thông",
        content: (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Các bước thực hiện</h4>
              <ol className="text-sm text-slate-600 space-y-2">
                <li><strong>1.</strong> Mở tính năng Báo cáo trong ứng dụng.</li>
                <li><strong>2.</strong> Nhập Tiêu đề/Loại sự cố và điền Mô tả chi tiết.</li>
                <li><strong>3.</strong> Tải lên hình ảnh minh chứng (tuân thủ giới hạn dưới 2MB).</li>
                <li><strong>4.</strong> Nhấn <strong>Gửi</strong>. Nút bấm sẽ chuyển sang "Đang xử lý..." để tránh gửi đúp.</li>
              </ol>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 mb-2">
                <strong>✓ Thành công:</strong> Một cửa sổ thông báo (Toast) với dấu check (✔️) nền xanh sẽ hiển thị ở góc trên phải.
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>✖️ Thất bại:</strong> Nếu thiếu thông tin hoặc file quá nặng, hệ thống sẽ báo lỗi với dấu (✖️) nền đỏ.
              </p>
            </div>
          </div>
        ),
      },
    },
  };

  return (
    contents[category]?.[question] || {
      category: "Trợ giúp",
      question: "Không tìm thấy câu trả lời",
      content: <p className="text-sm text-slate-600">Xin lỗi, không tìm thấy câu trả lời cho câu hỏi này.</p>,
    }
  );
};

export default function SupportTab() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<{
    category: string;
    question: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Lọc danh mục theo tìm kiếm
  const filteredCategories = SUPPORT_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0 || cat.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectQuestion = (category: string, question: string) => {
    setSelectedQuestion({ category, question });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Hỗ Trợ</h1>
        <p className="text-sm text-slate-600">
          Câu hỏi thường gặp và hướng dẫn sử dụng DN-Pulse
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Tìm kiếm câu hỏi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Categories */}
        <div className="lg:col-span-1 space-y-2">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === category.id ? null : category.id
                    )
                  }
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-xl">{category.emoji}</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {category.title}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      expandedCategory === category.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedCategory === category.id && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    {category.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          handleSelectQuestion(category.id, item.question)
                        }
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition border-b last:border-b-0 ${
                          selectedQuestion?.question === item.question
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <item.icon size={14} />
                        {item.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                Không tìm thấy câu hỏi phù hợp
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2">
          {selectedQuestion ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 md:p-8 shadow-sm animate-fade-up">
              {(() => {
                const content = getSupportContent(
                  selectedQuestion.category,
                  selectedQuestion.question
                );
                return (
                  <>
                    <div className="mb-6 pb-6 border-b border-slate-200">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                        {content.category}
                      </p>
                      <h2 className="text-xl font-bold text-slate-800">
                        {content.question}
                      </h2>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700">
                      {content.content}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 md:p-8 shadow-sm animate-fade-up space-y-6 md:space-y-8">
              {/* Header section */}
              <div className="text-center pb-6 border-b border-slate-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Compass size={36} className="text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-2.5">
                  Chào mừng đến với DN-Pulse
                </h2>
                <p className="text-sm md:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                  Nền tảng hỗ trợ người dân và khách du lịch khám phá thành phố Đà Nẵng thông minh, thuận tiện và an toàn.
                </p>
              </div>

              {/* Section 1: Intro */}
              <div className="space-y-2">
                <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>📖</span> Giới thiệu dự án
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed text-justify">
                  DN-Pulse là hệ thống hỗ trợ người dân và khách du lịch tiếp cận thông tin về thành phố Đà Nẵng thông qua nền tảng bản đồ số tích hợp. Ứng dụng cung cấp thông tin trực quan, giúp người dùng dễ dàng tìm kiếm địa điểm, theo dõi các sự kiện và nhận cảnh báo ngập lụt theo thời gian thực, góp phần hỗ trợ việc di chuyển và khám phá thành phố một cách thuận tiện, an toàn và hiệu quả.
                </p>
              </div>

              {/* Section 2: Goals */}
              <div className="space-y-3">
                <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>🎯</span> Mục tiêu của dự án
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Hỗ trợ người dân và khách du lịch tra cứu thông tin nhanh chóng.",
                    "Tích hợp nhiều dịch vụ trên một nền tảng duy nhất.",
                    "Nâng cao trải nghiệm khám phá thành phố Đà Nẵng.",
                    "Hỗ trợ di chuyển an toàn thông qua cảnh báo ngập lụt."
                  ].map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 leading-normal">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 3: Target audience */}
              <div className="space-y-3">
                <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>👥</span> Đối tượng sử dụng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { emoji: "🏠", label: "Người dân Đà Nẵng" },
                    { emoji: "🧳", label: "Khách du lịch" },
                    { emoji: "🎉", label: "Người tham gia các sự kiện" },
                    { emoji: "🚗", label: "Người cần tra cứu giao thông và ngập lụt" }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm hover:scale-[1.02] transition-all duration-300 cursor-default"
                    >
                      <span className="text-xl p-2 bg-white rounded-lg shadow-sm border border-slate-100">{item.emoji}</span>
                      <span className="text-sm font-semibold text-slate-700 leading-tight">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: Notification */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-6">
                <Lightbulb size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                  Hãy chọn một chủ đề ở danh sách bên trái để xem các câu hỏi và hướng dẫn chi tiết.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}