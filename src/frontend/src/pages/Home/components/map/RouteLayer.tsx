import React from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';

interface RouteLayerProps {
  routeData: any;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ routeData }) => {
  if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) return null;

  const geojsonData: any = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: routeData.coordinates,
    },
  };

  const routeLayerStyle: any = {
    id: "route-line",
    type: "line",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#2563eb",
      "line-width": 6,
      "line-opacity": 0.85,
    },
  };

  return (
    <Source id="route-source" type="geojson" data={geojsonData}>
      <Layer {...routeLayerStyle} />
    </Source>
  );
};