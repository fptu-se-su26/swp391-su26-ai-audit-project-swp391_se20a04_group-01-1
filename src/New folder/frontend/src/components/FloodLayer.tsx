import React, { useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import { floodedRoads, floodedRoadsGeoJSON } from '../data/floodData';

// NEW CODE: Chức năng hiển thị đường ngập lụt - Định nghĩa styles cho đường ngập lụt
const floodCasingStyle: any = {
  id: 'flood-casing',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': '#38bdf8', // Màu xanh dương nhạt phát sáng giả lập nước
    'line-width': 10,
    'line-opacity': 0.6
  }
};

const floodCoreStyle: any = {
  id: 'flood-core',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': '#0f3b9c', // Màu xanh dương đậm biểu diễn độ ngập sâu
    'line-width': 6,
    'line-opacity': 0.95
  }
};

export default function FloodLayer() {
  const [hoveredRoadId, setHoveredRoadId] = useState<string | null>(null);

  return (
    <>
      {/* NEW CODE: Chức năng hiển thị đường ngập lụt - Vẽ các đoạn đường ngập lụt bám sát thực tế */}
      <Source id="flood-source" type="geojson" data={floodedRoadsGeoJSON}>
        <Layer {...floodCasingStyle} />
        <Layer {...floodCoreStyle} />
      </Source>

      {/* NEW CODE: Chức năng hiển thị đường ngập lụt - Đặt biển cấm di chuyển và tooltip hiển thị thông tin */}
      {floodedRoads.map((road) => (
        <Marker
          key={road.id}
          longitude={road.markerPosition[0]}
          latitude={road.markerPosition[1]}
          anchor="center"
        >
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setHoveredRoadId(road.id)}
            onMouseLeave={() => setHoveredRoadId(null)}
          >
            {/* Tooltip hiển thị thông tin ngập lụt khi hover */}
            {hoveredRoadId === road.id && (
              <div className="absolute bottom-full mb-2 z-50 w-64 p-3 bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-slate-700/50 flex flex-col gap-1.5 pointer-events-none transition-all duration-200 animate-fade-up">
                <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                  <span className="text-red-500">⚠️</span> {road.name}
                </div>
                <div className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                  💧 Độ sâu ngập: {road.floodDepth}
                </div>
                <p className="text-[9px] text-slate-300 leading-relaxed">
                  {road.description}
                </p>
                <div className="mt-1 text-[9px] font-bold text-red-400 border-t border-slate-800 pt-1 flex items-center gap-1">
                  🚫 KHÔNG DI CHUYỂN QUA ĐÂY
                </div>
              </div>
            )}

            {/* Icon Biển báo cấm (No entry sign) có xung động */}
            <div className="relative group cursor-pointer flex items-center justify-center">
              <div className="w-[26px] h-[26px] rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-150">
                <div className="w-[14px] h-[4px] bg-white rounded-sm"></div>
              </div>
              {/* Hiệu ứng phát xung động cảnh báo */}
              <div className="absolute -inset-1 rounded-full bg-red-500 animate-ping opacity-25 -z-10"></div>
            </div>
          </div>
        </Marker>
      ))}
    </>
  );
}
