import apiClient from './api';

export interface EventRoad {
  road_id: number;
  event_id: number;
  event_title?: string;
  event_status?: string;
  road_name: string;
  restriction_type: 'CLOSED' | 'LIMITED' | 'ONE_WAY' | 'NO_PARKING';
  restriction_start: string;
  restriction_end: string;
  polyline_encoded?: string | null;
  geojson_coords?: [number, number][] | null;
  description?: string | null;
  created_at: string;
  bypass_coords?: [number, number][] | null;
  days_of_week?: string | null;
  start_time_of_day?: string | null;
  end_time_of_day?: string | null;
}

export const eventRoadService = {
  // Lấy danh sách tất cả các đường cấm/hạn chế do sự kiện
  getEventRoads: async (params?: { event_id?: number; active_only?: boolean; approved_only?: boolean }): Promise<EventRoad[]> => {
    const response = await apiClient.get('/event-roads', { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  },

  // Admin thêm mới một cung đường cấm/hạn chế
  createEventRoad: async (data: Omit<EventRoad, 'road_id' | 'created_at'>): Promise<any> => {
    const response = await apiClient.post('/event-roads', data);
    return response.data;
  },

  // Admin cập nhật cung đường cấm/hạn chế
  updateEventRoad: async (id: number, data: Partial<EventRoad>): Promise<any> => {
    const response = await apiClient.put(`/event-roads/${id}`, data);
    return response.data;
  },

  // Admin xóa cung đường cấm/hạn chế
  deleteEventRoad: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/event-roads/${id}`);
    return response.data;
  }
};
