import React, { useMemo, useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';

type FloodZone = {
  id: string;
  zone_id?: number;
  name: string;
  district?: string;
  risk_level?: string;
  center: [number, number];
  radius: number;
  depthCm: number;
  level: 'low' | 'medium' | 'high';
  color?: string;
  description?: string;
  typical_flood_months?: string;
};

type FloodZoneLayerProps = {
  floodZones: FloodZone[];
};

const FLOOD_DEPTH_LEVELS = {
  low: {
    hexColor: '#eab308',
    label: 'Ngập nhẹ - vẫn có thể di chuyển'
  },
  medium: {
    hexColor: '#f97316',
    label: 'Ngập trung bình - cần né'
  },
  high: {
    hexColor: '#ef4444',
    label: 'Ngập nặng - nguy hiểm, không nên di chuyển'
  }
};

function getCirclePolygon(
  center: [number, number],
  radiusInMeters: number,
  points = 64
): [number, number][] {
  const [lng, lat] = center;
  const R = 6371000;
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

    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(dByR) * Math.cos(latRad),
        Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
      );

    coordinates.push([
      (newLngRad * 180) / Math.PI,
      (newLatRad * 180) / Math.PI
    ]);
  }

  coordinates.push(coordinates[0]);
  return coordinates;
}

const fillStyle: any = {
  id: 'flood-zones-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.35
  }
};

const lineStyle: any = {
  id: 'flood-zones-line',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2.5,
    'line-opacity': 0.7
  }
};

export default function FloodZoneLayer({ floodZones }: FloodZoneLayerProps) {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const floodZonesGeoJSON: any = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: floodZones
        .filter((zone) => Array.isArray(zone.center) && zone.center.length === 2 && zone.radius)
        .map((zone) => {
          const depthInfo = FLOOD_DEPTH_LEVELS[zone.level] || FLOOD_DEPTH_LEVELS.low;

          return {
            type: 'Feature',
            properties: {
              id: zone.id,
              zone_id: zone.zone_id,
              name: zone.name,
              district: zone.district,
              risk_level:
                zone.risk_level ||
                (zone.level === 'high' ? 'High' : zone.level === 'medium' ? 'Medium' : 'Low'),
              depthCm: zone.depthCm,
              level: zone.level,
              color: depthInfo.hexColor,
              description: zone.description,
              typical_flood_months: zone.typical_flood_months
            },
            geometry: {
              type: 'Polygon',
              coordinates: [getCirclePolygon(zone.center, zone.radius)]
            }
          };
        })
    };
  }, [floodZones]);

  if (!floodZones || floodZones.length === 0) {
    return null;
  }

  return (
    <>
      <Source id="flood-zones-source" type="geojson" data={floodZonesGeoJSON}>
        <Layer {...fillStyle} />
        <Layer {...lineStyle} />
      </Source>

      {floodZones.map((zone) => {
        const depthInfo = FLOOD_DEPTH_LEVELS[zone.level] || FLOOD_DEPTH_LEVELS.low;
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
              {hoveredZoneId === zone.id && (
                <div className="absolute bottom-full mb-2.5 z-50 w-64 p-3 bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-slate-700/50 flex flex-col gap-1.5 pointer-events-none transition-all duration-200 animate-fade-up">
                  <div className="font-bold text-[11px] text-white flex items-center gap-1.5 border-b border-slate-800 pb-1">
                    <span style={{ color: hexColor }}>⚠️</span> {zone.name}
                  </div>

                  <div className="text-[10px] text-slate-300 flex flex-col gap-1 mt-0.5">
                    <div>
                      📏 Độ sâu:{' '}
                      <span className="font-semibold text-white">
                        {zone.depthCm} cm
                      </span>
                    </div>

                    <div>
                      💧 Mức độ:{' '}
                      <span className="font-semibold" style={{ color: hexColor }}>
                        {zone.level === 'low'
                          ? 'Ngập nhẹ'
                          : zone.level === 'medium'
                            ? 'Ngập trung bình'
                            : 'Ngập nặng'}
                      </span>
                    </div>

                    <div
                      className="font-bold mt-0.5"
                      style={{ color: zone.depthCm <= 10 ? '#10b981' : hexColor }}
                    >
                      🚦 Trạng thái:{' '}
                      {zone.depthCm <= 10
                        ? 'Vẫn có thể di chuyển'
                        : 'Cần né tuyến đường này'}
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 leading-relaxed mt-1 border-t border-slate-800/60 pt-1">
                    {zone.description}
                  </p>
                </div>
              )}

              <div className="relative group cursor-pointer flex items-center justify-center">
                <div
                  className="w-[26px] h-[26px] rounded-full border-2 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-150"
                  style={{ backgroundColor: hexColor }}
                >
                  <span className="text-[11px] font-bold text-white">⚠️</span>
                </div>

                <div
                  className="absolute -inset-1 rounded-full animate-ping opacity-30 -z-10"
                  style={{ backgroundColor: hexColor }}
                />
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
}