/**
 * Bật/tắt trạng thái yêu thích cho 1 sự kiện.
 * Tách từ hooks/useFavoriteController.ts. Hiện dự án chưa có endpoint yêu thích sự kiện
 * (chỉ mới có store/favoritePoiStore cho POI), nên hàm này giữ dạng đầu nối (stub) sẵn sàng
 * để nối vào API thật khi backend bổ sung.
 */
export async function toggleFavoriteEvent(eventId: number, isFavorite: boolean): Promise<boolean> {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");

  const res = await fetch(`${apiUrl}/api/events/${eventId}/favorite`, {
    method: isFavorite ? "DELETE" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error("Không thể cập nhật trạng thái yêu thích sự kiện.");
  }
  return !isFavorite;
}
