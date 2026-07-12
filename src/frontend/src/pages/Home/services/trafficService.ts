import { TrafficReportFormData } from "../types/traffic";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * Lấy danh sách cảnh báo giao thông đang hoạt động từ backend.
 * Trước đây useTrafficController.ts chỉ có comment placeholder, chưa từng gọi API này.
 */
export async function fetchTrafficAlerts(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/traffic-alerts`);
  if (!res.ok) {
    throw new Error("Không lấy được danh sách cảnh báo giao thông.");
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Gửi báo cáo giao thông (kẹt xe/tai nạn/thi công) lên backend.
 * Tách từ hooks/useTrafficController.ts - trước đó là điểm nối API còn để dạng comment
 * ("Gọi API POST /report-traffic ở đây"), nay được đưa vào 1 hàm service riêng để hooks gọi tới.
 * Lưu ý: endpoint thật của backend là /api/traffic-alerts (không phải /api/traffic/report),
 * và route này yêu cầu token đăng nhập (authenticateToken).
 */
export async function submitTrafficReport(formData: TrafficReportFormData): Promise<void> {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/api/traffic-alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(formData),
  });
  if (!res.ok) {
    throw new Error("Gửi báo cáo giao thông thất bại.");
  }
}