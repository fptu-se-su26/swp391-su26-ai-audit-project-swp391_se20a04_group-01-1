import React, { useMemo } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import { Car, AlertTriangle, Construction } from 'lucide-react';

interface TrafficLayerProps {
  trafficAlerts: any[];
  isTrafficLayerActive: boolean;
  onSelectAlert: (alert: any) => void;
}

export const TrafficLayer: React.FC<TrafficLayerProps> = ({ trafficAlerts, isTrafficLayerActive, onSelectAlert }) => {
  const trafficCongestionGeoJSON: any = useMemo(() => {
    if (!isTrafficLayerActive) return null;

    const congestionAlerts = trafficAlerts.filter((alert) => alert.is_active && alert.type === "CONGESTION");
    if (congestionAlerts.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: congestionAlerts.map((alert) => ({
        type: "Feature",
        properties: {
          alert_id: alert.id,
          title: alert.title,
          severity: alert.severity,
          color: alert.severity === "HIGH" ? "#EF4444" : "#F59E0B",
        },
        geometry: { type: "Point", coordinates: [alert.longitude, alert.latitude] },
      })),
    };
  }, [trafficAlerts, isTrafficLayerActive]);

  if (!isTrafficLayerActive) return null;

  return (
    <>
      {trafficCongestionGeoJSON && (
        <Source id="traffic-congestion-source" type="geojson" data={trafficCongestionGeoJSON}>
          <Layer
            id="traffic-congestion-glow-outer"
            type="circle"
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 15, 15, 45, 18, 120],
              "circle-opacity": 0.15,
              "circle-blur": 0.9,
            }}
          />
          <Layer
            id="traffic-congestion-glow-inner"
            type="circle"
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 8, 15, 25, 18, 65],
              "circle-opacity": 0.35,
              "circle-blur": 0.5,
            }}
          />
        </Source>
      )}

      {trafficAlerts.map((alert) => {
        const getAlertColor = () => {
          if (alert.severity === "HIGH") return "bg-red-600 ring-red-500/30";
          if (alert.severity === "MEDIUM") return "bg-orange-500 ring-orange-400/30";
          return "bg-blue-500 ring-blue-400/30";
        };

        const renderAlertIcon = () => {
          if (alert.type === "CONGESTION") return <Car size={13} />;
          if (alert.type === "ACCIDENT") return <AlertTriangle size={13} />;
          if (alert.type === "CONSTRUCTION") return <Construction size={13} />;
          return <AlertTriangle size={13} />;
        };

        return (
          <Marker key={`traffic-alert-${alert.id}`} longitude={alert.longitude} latitude={alert.latitude} anchor="bottom">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectAlert(alert);
              }}
              className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getAlertColor()} ring-4`}
            >
              {renderAlertIcon()}
            </div>
          </Marker>
        );
      })}
    </>
  );
};