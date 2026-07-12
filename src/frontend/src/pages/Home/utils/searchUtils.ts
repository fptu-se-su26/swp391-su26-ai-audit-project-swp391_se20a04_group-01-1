/**
 * Tạo nhãn hiển thị mặc định cho 1 tọa độ khi người dùng chọn 1 điểm bất kỳ trên bản đồ
 * (không phải kết quả tìm kiếm / suggestion). Tách từ logic lặp lại trong
 * hooks/useMapController.ts và components/map/popups/PendingDestinationPopup.tsx.
 */
export function formatCoordinateLabel(lng: number, lat: number): string {
  return `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
}

/**
 * Lọc danh sách gợi ý tìm kiếm theo từ khóa (không phân biệt hoa/thường, bỏ dấu cách thừa).
 */
export function filterSuggestions<T extends { name: string }>(
  items: T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return items.filter((item) => item.name.toLowerCase().includes(normalized));
}
