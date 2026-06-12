import apiClient from './api';
import { FloodedRoad } from '../data/floodData';
import { mockFloodRoads } from '../data/mockFloodData';

// NEW CODE: Flood zone feature
import { FloodZone, floodZones } from '../data/floodZones';

// NEW CODE: Flood feature - Lớp dịch vụ quản lý lấy dữ liệu ngập lụt
export const floodService = {
  // Lấy danh sách đường ngập lụt cũ (Giữ lại để tương thích ngược)
  getFloodedRoads: async (): Promise<FloodedRoad[]> => {
    try {
      console.log('[FloodService] Đang tải dữ liệu ngập lụt từ database...');
      const response = await apiClient.get('/floods');
      if (response.data && response.data.success && response.data.data.length > 0) {
        // Tag dữ liệu là do Admin báo cáo từ DB
        return response.data.data.map((road: any) => ({
          ...road,
          isAdminReported: true,
          isMock: false
        }));
      }
      throw new Error('Không có dữ liệu trong Database hoặc phản hồi không đúng.');
    } catch (error: any) {
      console.warn(
        `[FloodService] Lỗi kết nối database API (${error.message}). Chuyển sang dữ liệu mô phỏng dự phòng.`
      );
      // Trả về dữ liệu mô phỏng được đánh dấu rõ ràng
      return mockFloodRoads.map((road) => ({
        ...road,
        isMock: true,
        isAdminReported: false
      }));
    }
  },

  // NEW CODE: Flood zone feature - Lấy danh sách vùng ngập lụt (Database hoặc Mock data dự phòng)
  getFloodZones: async (): Promise<FloodZone[]> => {
    try {
      console.log('[FloodService] Đang tải dữ liệu vùng ngập từ database...');
      const response = await apiClient.get('/flood-zones');
      if (response.data && response.data.success && response.data.data.length > 0) {
        return response.data.data.map((zone: any) => ({
          ...zone,
          isAdminReported: true,
          isMock: false
        }));
      }
      throw new Error('Không có dữ liệu trong Database hoặc phản hồi không đúng.');
    } catch (error: any) {
      console.warn(
        `[FloodService] Lỗi kết nối database API (${error.message}). Chuyển sang dữ liệu vùng ngập mô phỏng.`
      );
      return floodZones.map((zone) => ({
        ...zone,
        isMock: true,
        isAdminReported: false
      }));
    }
  },

  // Admin thêm tuyến đường ngập lụt vào database
  addFloodedRoad: async (road: FloodedRoad): Promise<any> => {
    return apiClient.post('/floods', road);
  },

  // Admin xóa tuyến đường ngập lụt khỏi database
  deleteFloodedRoad: async (id: string): Promise<any> => {
    return apiClient.delete(`/floods/${id}`);
  }
};

