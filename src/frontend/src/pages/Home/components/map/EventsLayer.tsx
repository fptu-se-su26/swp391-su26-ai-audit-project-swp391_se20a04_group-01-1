import React, { useMemo, useEffect } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';

interface EventsLayerProps {
  events: any[];
  onSelectEvent?: (event: any) => void;
}

export default function EventsLayer({ events, onSelectEvent }: EventsLayerProps) {
  const { current: map } = useMap(); // Lấy instance của mapbox

  // 1. Chuẩn bị dữ liệu GeoJSON
  const eventsGeoJSON: any = useMemo(() => {
    if (!events || events.length === 0) return null;
    
    return {
      type: "FeatureCollection",
      features: events.map((evt) => ({
        type: "Feature",
        properties: {
          event_id: evt.event_id,
          title: evt.title,
        },
        geometry: {
          type: "Point",
          coordinates: [evt.longitude, evt.latitude],
        },
      })),
    };
  }, [events]);

  // 2. Bắt sự kiện Click và Hover thông qua map instance
  useEffect(() => {
    if (!map) return;

    const handleEventClick = (e: any) => {
      // Ngăn không cho sự kiện click lan ra ngoài bản đồ (ví dụ: làm mất điểm PendingDestination)
      e.originalEvent?.stopPropagation();

      if (!onSelectEvent) return;
      
      const features = map.queryRenderedFeatures(e.point, { layers: ['events-circle'] });
      if (features && features.length > 0) {
        const props = features[0].properties;
        const clickedEvent = events.find((evt) => evt.event_id === parseInt(props?.event_id));
        if (clickedEvent) {
          onSelectEvent(clickedEvent);
        }
      }
    };

    const handleMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const handleMouseLeave = () => { map.getCanvas().style.cursor = ''; };

    // Đăng ký listener
    map.on('click', 'events-circle', handleEventClick);
    map.on('mouseenter', 'events-circle', handleMouseEnter);
    map.on('mouseleave', 'events-circle', handleMouseLeave);

    // Dọn dẹp listener khi unmount
    return () => {
      map.off('click', 'events-circle', handleEventClick);
      map.off('mouseenter', 'events-circle', handleMouseEnter);
      map.off('mouseleave', 'events-circle', handleMouseLeave);
    };
  }, [map, events, onSelectEvent]);

  if (!eventsGeoJSON) return null;

  return (
    <Source id="events-source" type="geojson" data={eventsGeoJSON}>
      <Layer
        id="events-circle"
        type="circle"
        paint={{
          "circle-radius": 8, // Tăng nhẹ size lên 8 để dễ bấm trên điện thoại
          "circle-color": "#4F46E5", // Đổi sang màu Indigo cho đồng bộ theme
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        }}
      />
    </Source>
  );
}