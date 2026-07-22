import { FeatureCollection } from 'geojson';

// NEW CODE: Flood zone feature - Cấu trúc dữ liệu vùng ngập lụt
export interface FloodZone {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  radius: number; // Bán kính vùng ngập tính bằng mét
  depthCm: number; // NEW CODE: Độ sâu ngập tính bằng cm
  level: 'low' | 'medium' | 'high'; // NEW CODE: Cấp độ ngập
  depthValue: number; // Giữ lại độ sâu dạng mét để tương thích ngược
  depthLevel: 'low' | 'medium' | 'high'; // Giữ lại để tương thích ngược
  color: 'red' | 'orange' | 'yellow'; // Giữ lại để tương thích ngược
  description: string;
  bypassPosition?: [number, number] | [number, number][]; // Điểm tránh ngập dự phòng
  bypassOptions?: [number, number][][]; // Các lộ trình/điểm tránh ngập dự phòng
}

// NEW CODE: Flood depth levels - Phân loại màu sắc và nhãn hiển thị theo độ sâu ngập (cm)
export const FLOOD_DEPTH_LEVELS = {
  low: {
    min: 0,
    max: 10,
    color: "yellow",
    hexColor: "#eab308", // Vàng ngập nông
    label: "Ngập nhẹ - vẫn có thể di chuyển"
  },
  medium: {
    min: 11,
    max: 30,
    color: "orange",
    hexColor: "#f97316", // Cam cần né tránh
    label: "Ngập trung bình - cần né"
  },
  high: {
    min: 31,
    max: Infinity,
    color: "red",
    hexColor: "#ef4444", // Đỏ cấm di chuyển
    label: "Ngập nặng - nguy hiểm, không nên di chuyển"
  }
};

// NEW CODE: Flood zone feature - Hàm sinh tọa độ Polygon hình tròn xấp xỉ trên bản đồ cầu địa lý
export function getCirclePolygon(center: [number, number], radiusInMeters: number, points = 64): [number, number][] {
  const [lng, lat] = center;
  const R = 6371000; // Bán kính Trái Đất tính bằng mét
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const dByR = radiusInMeters / R;
  
  const coordinates: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(angle)
    );
    const newLngRad = lngRad + Math.atan2(
      Math.sin(angle) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    const newLat = (newLatRad * 180) / Math.PI;
    const newLng = (newLngRad * 180) / Math.PI;
    coordinates.push([newLng, newLat]);
  }
  // Thêm điểm đầu tiên vào cuối để khép kín đa giác (Polygon)
  coordinates.push(coordinates[0]);
  return coordinates;
}

// NEW CODE: Flood zone feature - Danh sách các vùng ngập lụt MÔ PHỎNG (Mock Data) tại Đà Nẵng
export const floodZones: FloodZone[] = [
  {
    id: "flood-zone-1",
    name: "Vùng ngập Đường Nguyễn Văn Linh (Hàm Nghi - Nguyễn Tri Phương)",
    center: [108.216412, 16.060639], // [lng, lat]
    radius: 280,
    depthCm: 80, // > 30cm -> Ngập nặng (Màu Đỏ, phải né)
    level: "high",
    depthValue: 0.8,
    depthLevel: "high",
    color: "red",
    description: "Ngập sâu 80 cm. Các phương tiện gầm thấp và xe máy tuyệt đối tránh di chuyển qua khu vực này.",
    bypassPosition: [108.2085, 16.063],
    bypassOptions: [
      [[108.2085, 16.063]], // Hướng Nguyễn Tri Phương
      [[108.2200, 16.0450], [108.2210, 16.0660]] // Hướng Tránh lên Hùng Vương
    ]
  },
  {
    id: "flood-zone-2",
    name: "Khu vực ngập hồ Thạc Gián (Đường Hàm Nghi)",
    center: [108.21439, 16.064535], // [lng, lat]
    radius: 260,
    depthCm: 55, // > 30cm -> Ngập nặng (Màu Đỏ, phải né)
    level: "high",
    depthValue: 0.55,
    depthLevel: "high",
    color: "red",
    description: "Nước hồ dâng cao tràn bờ gây ngập sâu 55 cm. Cấm các phương tiện lưu thông.",
    bypassPosition: [108.2085, 16.063],
    bypassOptions: [
      [[108.2085, 16.063]], // Tránh qua Nguyễn Tri Phương
      [[108.2200, 16.0450], [108.2210, 16.0660]]
    ]
  },
  {
    id: "flood-zone-3",
    name: "Khu vực ngập Đường Lê Duẩn (Ông Ích Khiêm - Hoàng Hoa Thám)",
    center: [108.216929, 16.07092], // [lng, lat]
    radius: 180,
    depthCm: 25, // 11cm - 30cm -> Ngập trung bình (Màu Cam, phải né)
    level: "medium",
    depthValue: 0.25,
    depthLevel: "medium",
    color: "orange",
    description: "Ngập trung bình 25 cm tại các vùng trũng thấp. Các phương tiện di chuyển chậm, chú ý quan sát.",
    bypassPosition: [108.216, 16.063],
    bypassOptions: [
      [[108.2160, 16.0720]], // Tránh đi lên phía Hải Phòng
      [[108.2150, 16.0660]]  // Tránh xuống Hùng Vương
    ]
  },
  {
    id: "flood-zone-4",
    name: "Vùng ngập chân cầu Tiên Sơn (Đường 2 Tháng 9)",
    center: [108.224186, 16.032611], // [lng, lat]
    radius: 220,
    depthCm: 15, // 11cm - 30cm -> Ngập trung bình (Màu Cam, phải né)
    level: "medium",
    depthValue: 0.15,
    depthLevel: "medium",
    color: "orange",
    description: "Nước dâng cục bộ 15 cm do ảnh hưởng triều cường sông Hàn. Tránh di chuyển giờ cao điểm triều dâng.",
    bypassPosition: [
      [108.2178, 16.045], 
      [108.2178, 16.0285]
    ],
    bypassOptions: [
      [[108.2178, 16.045], [108.2178, 16.0285]], // Lộ trình tránh qua đường Núi Thành
      [[108.2195, 16.039]] // NEW CODE: Shortest safe flood route - Lộ trình tránh qua Bệnh viện Mắt / Núi Thành (vùng ngập nhẹ)
    ]
  },
  {
    id: "flood-zone-5",
    name: "Khu vực ngập nhẹ nút giao Đường Núi Thành",
    center: [108.2195, 16.039], // [lng, lat]
    radius: 150,
    depthCm: 8, // <= 10cm -> Ngập nhẹ (Màu Vàng, KHÔNG cần né)
    level: "low",
    depthValue: 0.08,
    depthLevel: "low",
    color: "yellow",
    description: "Ngập nhẹ 8 cm. Các phương tiện có thể di chuyển qua bình thường.",
    bypassPosition: [108.224, 16.039],
    bypassOptions: [
      [[108.224, 16.039]] // Tránh qua đường 2 tháng 9
    ]
  }
];

// NEW CODE: Flood zone feature - Chuyển đổi sang dạng GeoJSON để vẽ Polygon trên Mapbox
export const floodZonesGeoJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: floodZones.map(zone => {
    const hexColor = FLOOD_DEPTH_LEVELS[zone.level].hexColor;
    return {
      type: 'Feature',
      properties: {
        id: zone.id,
        name: zone.name,
        depthCm: zone.depthCm,
        level: zone.level,
        color: hexColor,
        description: zone.description,
        radius: zone.radius
      },
      geometry: {
        type: 'Polygon',
        coordinates: [getCirclePolygon(zone.center, zone.radius)]
      }
    };
  })
};
