const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * Hàm gọi API tìm kiếm địa điểm từ Backend hoặc Mapbox
 */
export async function searchPlaces(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const response = await fetch(
      `${API_BASE}/api/search/places?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error("Lỗi khi tìm kiếm địa điểm");
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Hàm lấy dữ liệu khởi tạo (Danh mục, POI nổi bật, Sự kiện đang diễn ra...)
 * Backend không có route gộp /api/catalog/initial, nên ở đây gọi song song
 * 4 route riêng lẻ mà backend thực tế có rồi gộp kết quả lại.
 */
export async function fetchInitialCatalog(): Promise<any> {
  try {
    const [eventsRes, poisRes, eventCategoriesRes, poiCategoriesRes] = await Promise.all([
      fetch(`${API_BASE}/api/events`),
      fetch(`${API_BASE}/api/pois`),
      fetch(`${API_BASE}/api/event-categories`),
      fetch(`${API_BASE}/api/poi-categories`),
    ]);

    if (!eventsRes.ok || !poisRes.ok || !eventCategoriesRes.ok || !poiCategoriesRes.ok) {
      throw new Error("Lỗi khi tải dữ liệu khởi tạo");
    }

    const [eventsData, poisData, eventCategoriesData, poiCategoriesData] = await Promise.all([
      eventsRes.json(),
      poisRes.json(),
      eventCategoriesRes.json(),
      poiCategoriesRes.json(),
    ]);

    return {
      events: eventsData.data || [],
      pois: poisData.data || [],
      eventCategories: eventCategoriesData.data || [],
      poiCategories: poiCategoriesData.data || [],
    };
  } catch (error) {
    console.error('Fetch initial catalog error:', error);
    // Trả về dữ liệu rỗng để app không bị crash
    return {
      pois: [],
      events: [],
      eventCategories: [],
      poiCategories: []
    };
  }
}

// Gom tất cả vào một object service để file khác dễ import
export const searchService = {
  searchPlaces,
  fetchInitialCatalog
};