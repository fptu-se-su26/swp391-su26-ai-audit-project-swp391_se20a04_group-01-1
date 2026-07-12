import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import { getCirclePolygon } from '../../utils/mapUtils';

interface FloodLayerProps {
  floodZones: any[];
  isFloodLayerActive: boolean;
}

export const FloodLayer: React.FC<FloodLayerProps> = ({ floodZones, isFloodLayerActive }) => {
  const floodGeoJSON: any = useMemo(() => {
    if (!floodZones || floodZones.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: floodZones
        .filter((zone) => Array.isArray(zone.center) && zone.center.length === 2 && zone.radius)
        .map((zone) => ({
          type: "Feature",
          properties: {
            id: zone.id,
            zone_id: zone.zone_id,
            name: zone.name,
            district: zone.district,
            risk_level: zone.risk_level,
            depthCm: zone.depthCm,
            level: zone.level,
            description: zone.description,
            typical_flood_months: zone.typical_flood_months,
            color: zone.level === "high" ? "#ef4444" : zone.level === "medium" ? "#f97316" : "#eab308",
          },
          geometry: {
            type: "Polygon",
            coordinates: [getCirclePolygon(zone.center, zone.radius)],
          },
        })),
    };
  }, [floodZones]);

  if (!isFloodLayerActive || !floodGeoJSON) return null;

  return (
    <Source id="flood-zones-source" type="geojson" data={floodGeoJSON}>
      <Layer
        id="flood-zones-fill"
        type="fill"
        paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.45 }}
      />
      <Layer
        id="flood-zones-outline"
        type="line"
        paint={{ "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.9 }}
      />
    </Source>
  );
};