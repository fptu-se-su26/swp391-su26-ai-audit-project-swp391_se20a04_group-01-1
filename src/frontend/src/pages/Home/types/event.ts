export interface EventData {
  event_id: number;
  title: string;
  description?: string;
  short_description?: string; // Bổ sung dự phòng nếu có dùng
  start_time: string;
  end_time: string;
  location_name?: string;
  address?: string; // Bổ sung dự phòng
  longitude: number;
  latitude: number;
  category_id?: number;
  
  // ---> BỔ SUNG CÁC TRƯỜNG HÌNH ẢNH Ở ĐÂY <---
  image_url?: string;
  banner_url?: string; 
  thumbnail_url?: string;
  
  rating?: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  is_featured?: boolean;
  is_free?: boolean;
  ticket_price?: number;
  view_count?: number;
  favorite_count?: number;
  status?: string;
}

export function getEventStatus(
  startTime: string,
  endTime: string
): "upcoming" | "ongoing" | "ended" {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "ended";
}