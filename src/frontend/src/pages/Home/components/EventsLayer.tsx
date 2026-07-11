import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Source, Layer, Marker, useMap } from "react-map-gl/mapbox";
import { Calendar } from "lucide-react";

export interface EventData {
  event_id: number;
  category_id: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  title: string;
  short_description?: string;
  description?: string;
  location_name: string;
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  start_time: string;
  end_time?: string;
  banner_url?: string;
  thumbnail_url?: string;
  status: string;
  is_featured: boolean;
  is_free: boolean;
  ticket_price: number;
  view_count: number;
  favorite_count: number;
}

interface EventsLayerProps {
  events: EventData[];
  onSelectEvent: (event: EventData) => void;
}

export const getEventStatus = (startTime: string, endTime?: string) => {
  const now = new Date();
  const start = new Date(startTime);
  // Nếu không có end_time, mặc định kéo dài 3 tiếng
  const end = endTime
    ? new Date(endTime)
    : new Date(start.getTime() + 3 * 60 * 60 * 1000);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "ongoing";
};

const SOURCE_ID = "events-source";
const CLUSTER_LAYER_ID = "events-clusters";
const CLUSTER_COUNT_LAYER_ID = "events-cluster-count";

export default function EventsLayer({
  events,
  onSelectEvent,
}: EventsLayerProps) {
  const { current: map } = useMap();

  // event_id của các sự kiện HIỆN KHÔNG bị gộp cụm ở mức zoom hiện tại
  // (chỉ những event này mới được vẽ HTML Marker đẹp bên dưới)
  const [unclusteredIds, setUnclusteredIds] = useState<Set<number>>(new Set());

  // ✅ Chuyển đổi events thành GeoJSON để feed vào Source có cluster
  // Chỉ cần toạ độ + event_id, phần hiển thị chi tiết vẫn lấy từ props `events` gốc
  const eventsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: (events || []).map((evt) => ({
        type: "Feature" as const,
        properties: {
          event_id: evt.event_id,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [evt.longitude, evt.latitude],
        },
      })),
    }),
    [events],
  );

  // ✅ Truy vấn lại danh sách điểm KHÔNG bị gộp cụm mỗi khi dữ liệu/cluster thay đổi
  const refreshUnclustered = useCallback(() => {
    if (!map) return;
    // Nếu source chưa sẵn sàng thì bỏ qua, sẽ có lần gọi lại sau qua sự kiện 'data'
    if (!map.getSource(SOURCE_ID)) return;

    try {
      const leaves = map.querySourceFeatures(SOURCE_ID, {
        filter: ["!", ["has", "point_count"]],
      });
      const ids = new Set<number>(
        leaves
          .map((f: any) => f.properties?.event_id)
          .filter((id: any) => id !== undefined && id !== null),
      );
      setUnclusteredIds(ids);
    } catch (e) {
      // querySourceFeatures có thể ném lỗi nếu tile chưa load xong, bỏ qua an toàn
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // 'data' bắn ra mỗi khi source/tile của Mapbox cập nhật (bao gồm cả sau khi cluster tính lại)
    map.on("data", refreshUnclustered);
    // 'moveend' đảm bảo cập nhật lại sau khi pan/zoom xong hẳn
    map.on("moveend", refreshUnclustered);
    // Gọi 1 lần khi bản đồ đã "idle" (style + source load xong) để có dữ liệu ngay lần đầu
    map.once("idle", refreshUnclustered);

    return () => {
      map.off("data", refreshUnclustered);
      map.off("moveend", refreshUnclustered);
    };
  }, [map, refreshUnclustered]);

  // ✅ Bấm vào cụm gộp → zoom vào để tách cụm ra
  const handleClusterClick = useCallback(
    (event: any) => {
      if (!map) return;

      const features = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_LAYER_ID],
      });

      if (features && features.length > 0) {
        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as any;

        if (source && clusterId !== undefined) {
          source.getClusterExpansionZoom(
            clusterId,
            (err: any, zoom: number) => {
              if (err) return;
              const geometry = features[0].geometry as any;
              map.flyTo({
                center: geometry.coordinates,
                zoom: zoom,
                duration: 800,
              });
            },
          );
        }
      }
    },
    [map],
  );

  useEffect(() => {
    if (!map) return;

    map.on("click", CLUSTER_LAYER_ID, handleClusterClick);
    map.on("mouseenter", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.off("click", CLUSTER_LAYER_ID, handleClusterClick);
    };
  }, [map, handleClusterClick]);

  // ✅ Danh sách event đầy đủ thông tin (ảnh, mô tả...) nhưng chỉ giữ lại những event
  // đang KHÔNG bị gộp cụm — để vẽ HTML Marker chi tiết như thiết kế cũ
  const visibleEvents = useMemo(
    () => (events || []).filter((evt) => unclusteredIds.has(evt.event_id)),
    [events, unclusteredIds],
  );

  return (
    <>
      {/* Nguồn dữ liệu GeoJSON có bật cluster, dùng để tính toán gộp cụm */}
      <Source
        id={SOURCE_ID}
        type="geojson"
        data={eventsGeoJSON}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        {/* Vòng tròn cụm gộp */}
        <Layer
          id={CLUSTER_LAYER_ID}
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#a855f7", // < 10 sự kiện
              10,
              "#f59e0b", // 10-30 sự kiện
              30,
              "#ef4444", // > 30 sự kiện
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              10,
              24,
              30,
              32,
            ],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.85,
          }}
        />

        {/* Số lượng sự kiện hiển thị trên cụm */}
        <Layer
          id={CLUSTER_COUNT_LAYER_ID}
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 13,
          }}
          paint={{
            "text-color": "#ffffff",
          }}
        />

        {/*
                  Lưu ý: KHÔNG cần thêm Layer "unclustered-point" dạng circle ở đây,
                  vì phần điểm lẻ đã được vẽ bằng HTML <Marker> chi tiết ở dưới
                  (giữ nguyên UI ảnh/badge như thiết kế cũ).
                */}
      </Source>

      {/* Marker HTML chi tiết — chỉ vẽ cho các sự kiện KHÔNG bị gộp cụm */}
      {visibleEvents.map((evt) => {
        const status = getEventStatus(evt.start_time, evt.end_time);
        const categoryColor = evt.category_color || "#6366F1";

        let markerClass =
          "relative w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110";
        let containerClass =
          "relative flex flex-col items-center cursor-pointer group transition-transform";

        if (status === "ended") {
          containerClass +=
            " opacity-50 grayscale hover:opacity-80 hover:grayscale-0";
        } else if (status === "ongoing") {
          markerClass += " ring-4 ring-emerald-500/50 animate-pulse";
        }

        return (
          <Marker
            key={evt.event_id}
            longitude={evt.longitude}
            latitude={evt.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent?.stopPropagation();
              onSelectEvent(evt);
            }}
          >
            <div className={containerClass}>
              <div
                className={markerClass}
                style={{ backgroundColor: categoryColor }}
              >
                {evt.thumbnail_url ? (
                  <img
                    src={evt.thumbnail_url}
                    alt={evt.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-white text-base">
                    {evt.category_icon || "🎆"}
                  </span>
                )}
              </div>

              <div
                className="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white shadow-sm"
                style={{
                  backgroundColor: categoryColor,
                  borderColor: "white",
                }}
              />

              {status === "ongoing" && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white"></span>
                </span>
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
