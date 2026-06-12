import React, { useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import { floodZones, floodZonesGeoJSON, FLOOD_DEPTH_LEVELS } from '../data/floodZones';

// NEW CODE: Flood zone feature - Thiết lập styles cho vùng ngập (Polygon) trên Mapbox
const fillStyle: any = {
  id: 'flood-zones-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'], // Lấy trực tiếp mã màu hex trong thuộc tính feature
    'fill-opacity': 0.35 // Độ trong suốt hợp lý để vẫn nhìn thấy bản đồ bên dưới
  }
};

const lineStyle: any = {
  id: 'flood-zones-line',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2.5, // Có viền rõ ràng giúp nhận biết phạm vi
    'line-opacity': 0.7
  }
};

export default function FloodZoneLayer() {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  return (
    <>
      {/* NEW CODE: Flood zone feature - Vẽ các đa giác vùng ngập trên bản đồ */}
      <Source id="flood-zones-source" type="geojson" data={floodZonesGeoJSON}>
        <Layer {...fillStyle} />
        <Layer {...lineStyle} />
      </Source>

      {/* NEW CODE: Flood zone feature - Đặt marker cảnh báo ở trung tâm các vùng ngập */}
      {floodZones.map((zone) => {
        // NEW CODE: Flood depth routing rule - Lấy thông tin màu sắc và nhãn theo cấp độ mới
        const depthInfo = FLOOD_DEPTH_LEVELS[zone.level];
        const hexColor = depthInfo.hexColor;

        return (
          <Marker
            key={zone.id}
            longitude={zone.center[0]}
            latitude={zone.center[1]}
            anchor="center"
          >
            <div
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredZoneId(zone.id)}
              onMouseLeave={() => setHoveredZoneId(null)}
            >
              {/* NEW CODE: Flood depth routing rule - Tooltip hiển thị độ sâu, mức độ và trạng thái cấm đường */}
              {hoveredZoneId === zone.id && (
                <div className="absolute bottom-full mb-2.5 z-50 w-64 p-3 bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-slate-700/50 flex flex-col gap-1.5 pointer-events-none transition-all duration-200 animate-fade-up">
                  <div className="font-bold text-[11px] text-white flex items-center gap-1.5 border-b border-slate-850 pb-1">
                    <span style={{ color: hexColor }}>⚠️</span> {zone.name}
                  </div>
                  <div className="text-[10px] text-slate-300 flex flex-col gap-1 mt-0.5">
                    <div>📏 Độ sâu: <span className="font-semibold text-white">{zone.depthCm} cm</span></div>
                    <div>💧 Mức độ: <span className="font-semibold" style={{ color: hexColor }}>{zone.level === 'low' ? 'Ngập nhẹ' : zone.level === 'medium' ? 'Ngập trung bình' : 'Ngập nặng'}</span></div>
                    <div className="font-bold mt-0.5" style={{ color: zone.depthCm <= 10 ? '#10b981' : hexColor }}>
                      🚦 Trạng thái: {zone.depthCm <= 10 ? "Vẫn có thể di chuyển" : "Cần né tuyến đường này"}
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed mt-1 border-t border-slate-800/60 pt-1">
                    {zone.description}
                  </p>
                </div>
              )}

              {/* Icon cảnh báo có xung động phát sáng tương thích màu sắc */}
              <div className="relative group cursor-pointer flex items-center justify-center">
                <div 
                  className="w-[26px] h-[26px] rounded-full border-2 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-150"
                  style={{ backgroundColor: hexColor }}
                >
                  <span className="text-[11px] font-bold text-white">⚠️</span>
                </div>
                {/* Hiệu ứng ping nhấp nháy phát xung theo màu sắc vùng ngập */}
                <div 
                  className="absolute -inset-1 rounded-full animate-ping opacity-30 -z-10"
                  style={{ backgroundColor: hexColor }}
                ></div>
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
