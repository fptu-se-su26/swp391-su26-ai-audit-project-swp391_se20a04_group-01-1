import React from "react";
import { Marker } from "react-map-gl/mapbox";
import { Calendar } from "lucide-react";

const BASE_API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) return null;

  const trimmedUrl = url.trim();

  if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://") ||
    trimmedUrl.startsWith("blob:") ||
    trimmedUrl.startsWith("data:")
  ) {
    return trimmedUrl;
  }

  const normalizedPath = trimmedUrl.startsWith("/")
    ? trimmedUrl
    : `/${trimmedUrl}`;

  return `${BASE_API}${normalizedPath}`;
};

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
  favorite_count: number;
  view_count?: number;
}

interface MarkerImageProps {
  src: string | null;
  title: string;
  fallbackIcon?: string;
}

function MarkerImage({ src, title, fallbackIcon = "🎆" }: MarkerImageProps) {
  const [imageError, setImageError] = React.useState(false);

  if (!src || imageError) {
    return (
      <span className="flex w-full h-full items-center justify-center text-white text-base">
        {fallbackIcon}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  );
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

export default function EventsLayer({
  events,
  onSelectEvent,
}: EventsLayerProps) {
  return (
    <>
      {events.map((evt) => {
        const lat = Number(evt.latitude);
        const lng = Number(evt.longitude);

        // Kiểm tra an toàn tọa độ Mapbox: Lng [-180, 180], Lat [-90, 90]
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn(`[EventsLayer] Bỏ qua sự kiện ID ${evt.event_id} có tọa độ không hợp lệ: [${evt.latitude}, ${evt.longitude}]`);
          return null;
        }

        const status = getEventStatus(evt.start_time, evt.end_time);
        const categoryColor = evt.category_color || "#6366F1";

        const markerImage =
          resolveImageUrl(evt.thumbnail_url) || resolveImageUrl(evt.banner_url);

        // Cài đặt lớp CSS theo trạng thái thời gian diễn ra
        let markerClass =
          "relative w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110";
        let containerClass =
          "relative flex flex-col items-center cursor-pointer group transition-transform";

        if (status === "ended") {
          // Mờ đi và đổi màu xám nếu đã kết thúc
          containerClass +=
            " opacity-50 grayscale hover:opacity-80 hover:grayscale-0";
        } else if (status === "ongoing") {
          // Đang diễn ra: Thêm vòng sáng nhấp nháy phát sáng
          markerClass += " ring-4 ring-emerald-500/50 animate-pulse";
        }

        return (
          <Marker
            key={evt.event_id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent?.stopPropagation();
              onSelectEvent(evt);
            }}
          >
            <div className={containerClass}>
              {/* Bong bóng Marker */}
              <div
                className={markerClass}
                style={{ backgroundColor: categoryColor }}
              >
                <MarkerImage
                  src={markerImage}
                  title={evt.title}
                  fallbackIcon={evt.category_icon || "🎆"}
                />
              </div>

              {/* Mũi tên chỉ xuống dưới chân bong bóng */}
              <div
                className="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white shadow-sm"
                style={{
                  backgroundColor: categoryColor,
                  borderColor: "white",
                }}
              />

              {/* Badge đang diễn ra nhấp nháy nhỏ phía trên góc phải marker */}
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
