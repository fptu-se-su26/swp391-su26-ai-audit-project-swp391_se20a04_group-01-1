import React from "react";
import { RouteInfo } from "./RouteInfo";
import { RouteSummary } from "./RouteSummary";
import { NavigationControl } from "./NavigationControl";
import { RouteActionButtons } from "./RouteActionButtons";

interface RoutePanelProps {
  routeData: any;
  origin: any;
  destination: any;
  originQuery: string;
  destinationQuery: string;
  avoidFlood: boolean;
  setAvoidFlood: (val: boolean) => void;
  avoidCongestion: boolean;
  setAvoidCongestion: (val: boolean) => void;
  routeAlertMessage: string | null;
  travelMode: "driving" | "walking" | "cycling";
  onStartNavigation: () => void;
  setShowSaveRouteModal: (val: boolean) => void;
  handleShareRoute: () => void;
  isSharingRoute: boolean;
  favoriteEventIds: Set<number>;
  onToggleEventFavorite: (eventId: number) => Promise<boolean>;
  onClearRoute: () => void;
}

/**
 * RoutePanel
 * Hiển thị chi tiết lộ trình sau khi đã tính toán xong: toggles tránh ngập/kẹt xe,
 * cảnh báo, tóm tắt khoảng cách/thời gian, điều khiển bắt đầu chuyến đi và các
 * hành động lưu/chia sẻ/yêu thích/xóa lộ trình.
 */
export const RoutePanel: React.FC<RoutePanelProps> = ({
  routeData,
  origin,
  destination,
  originQuery,
  destinationQuery,
  avoidFlood,
  setAvoidFlood,
  avoidCongestion,
  setAvoidCongestion,
  routeAlertMessage,
  travelMode,
  onStartNavigation,
  setShowSaveRouteModal,
  handleShareRoute,
  isSharingRoute,
  favoriteEventIds,
  onToggleEventFavorite,
  onClearRoute,
}) => {
  if (!routeData) return null;

  return (
    <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 mt-2">
      <RouteInfo
        avoidFlood={avoidFlood}
        setAvoidFlood={setAvoidFlood}
        avoidCongestion={avoidCongestion}
        setAvoidCongestion={setAvoidCongestion}
        routeAlertMessage={routeAlertMessage}
      />

      <RouteSummary routeData={routeData} />

      <NavigationControl
        origin={origin}
        destination={destination}
        originQuery={originQuery}
        destinationQuery={destinationQuery}
        routeData={routeData}
        travelMode={travelMode}
        onStartNavigation={onStartNavigation}
      />

      <RouteActionButtons
        destination={destination}
        setShowSaveRouteModal={setShowSaveRouteModal}
        handleShareRoute={handleShareRoute}
        isSharingRoute={isSharingRoute}
        favoriteEventIds={favoriteEventIds}
        onToggleEventFavorite={onToggleEventFavorite}
        onClearRoute={onClearRoute}
      />
    </div>
  );
};
