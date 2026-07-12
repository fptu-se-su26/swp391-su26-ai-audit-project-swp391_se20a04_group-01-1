import React, { useMemo } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import { RouteOff } from 'lucide-react';

interface EventRoadLayerProps {
  activeOrSelectedEventRoads: any[];
  events: any[];
  isRoadRestrictionActive: (road: any, date: Date) => boolean;
  selectedRoadPopup: any;
  onSelectRoad: (road: any) => void;
  onSelectEvent: (event: any) => void;
  setViewMode: (mode: "pois" | "events") => void;
}

export const EventRoadLayer: React.FC<EventRoadLayerProps> = ({
  activeOrSelectedEventRoads, events, isRoadRestrictionActive, selectedRoadPopup, onSelectRoad, onSelectEvent, setViewMode
}) => {
  const eventRoadsGeoJSON: any = useMemo(() => {
    if (activeOrSelectedEventRoads.length === 0) return null;
    const now = new Date();
    
    return {
      type: "FeatureCollection",
      features: activeOrSelectedEventRoads
        .filter((road) => road.geojson_coords && road.geojson_coords.length > 0)
        .map((road) => ({
          type: "Feature",
          properties: {
            road_id: road.road_id,
            road_name: road.road_name,
            restriction_type: road.restriction_type,
            isActive: isRoadRestrictionActive(road, now),
            isSelected: selectedRoadPopup && selectedRoadPopup.road_id === road.road_id,
          },
          geometry: { type: "LineString", coordinates: road.geojson_coords },
        })),
    };
  }, [activeOrSelectedEventRoads, selectedRoadPopup]);

  return (
    <>
      {eventRoadsGeoJSON && (
        <Source id="event-roads-source" type="geojson" data={eventRoadsGeoJSON}>
          <Layer
            id="event-roads-casing"
            type="line"
            paint={{
              "line-color": "#000000",
              "line-width": ["case", ["get", "isSelected"], 14.5, ["case", ["get", "isActive"], 11.5, 7.5]],
              "line-opacity": ["case", ["get", "isSelected"], 0.55, ["case", ["get", "isActive"], 0.4, 0.25]],
            }}
          />
          <Layer
            id="event-roads-line-dashed"
            type="line"
            filter={["==", ["get", "restriction_type"], "CLOSED"]}
            paint={{
              "line-color": "#EF4444",
              "line-width": ["case", ["get", "isSelected"], 10.5, ["case", ["get", "isActive"], 8.0, 5.0]],
              "line-opacity": ["case", ["get", "isSelected"], 1.0, ["case", ["get", "isActive"], 0.95, 0.55]],
              "line-dasharray": [3, 2],
            }}
          />
          <Layer
            id="event-roads-line-solid"
            type="line"
            filter={["!=", ["get", "restriction_type"], "CLOSED"]}
            paint={{
              "line-color": ["match", ["get", "restriction_type"], "LIMITED", "#F59E0B", "ONE_WAY", "#3B82F6", "#EF4444"],
              "line-width": ["case", ["get", "isSelected"], 10.5, ["case", ["get", "isActive"], 8.0, 5.0]],
              "line-opacity": ["case", ["get", "isSelected"], 1.0, ["case", ["get", "isActive"], 0.95, 0.55]],
            }}
          />
        </Source>
      )}

      {activeOrSelectedEventRoads.map((road) => {
        if (!road.geojson_coords || road.geojson_coords.length === 0) return null;
        const startCoord = road.geojson_coords[0];
        const now = new Date();
        const isActive = isRoadRestrictionActive(road, now);
        const isSelected = selectedRoadPopup && selectedRoadPopup.road_id === road.road_id;
        const relatedEvent = events.find((e) => e.event_id === road.event_id);

        const getMarkerColor = () => {
          if (isSelected) return "bg-red-500 scale-110 ring-4 ring-red-500/30 z-30";
          if (!isActive) return "bg-slate-400";
          if (road.restriction_type === "LIMITED") return "bg-amber-500";
          if (road.restriction_type === "ONE_WAY") return "bg-blue-600";
          return "bg-red-600";
        };

        if (relatedEvent) {
          const categoryColor = relatedEvent.category_color || "#ef4444";
          return (
            <Marker key={`marker-road-${road.road_id}`} longitude={startCoord[0]} latitude={startCoord[1]} anchor="bottom">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("events");
                  onSelectEvent(relatedEvent);
                }}
                className={`relative flex items-center justify-center border-2 border-white rounded-full shadow-2xl cursor-pointer transform hover:scale-115 transition-all z-20 w-9 h-9`}
                style={{ backgroundColor: categoryColor }}
              >
                {relatedEvent.thumbnail_url ? (
                  <img
                    src={relatedEvent.thumbnail_url}
                    alt={relatedEvent.title}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-white text-sm">{relatedEvent.category_icon || "🎆"}</span>
                )}
                <div className={`absolute -bottom-1 -right-1 border border-white text-white w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md ${getMarkerColor()} p-0.5`}>
                  <RouteOff size={9} />
                </div>
              </div>
            </Marker>
          );
        }

        return (
          <Marker key={`marker-road-${road.road_id}`} longitude={startCoord[0]} latitude={startCoord[1]} anchor="bottom">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoad(road);
              }}
              className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getMarkerColor()} ${isActive ? "animate-pulse" : ""}`}
            >
              <RouteOff size={13} />
            </div>
          </Marker>
        );
      })}
    </>
  );
};