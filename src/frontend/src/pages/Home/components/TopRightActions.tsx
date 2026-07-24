import React from "react";
import { Bell, Settings, User } from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { AppNotification } from "../../../store/notificationStore";
import { EventData } from "./EventsLayer";

interface TopRightActionsProps {
  userRole: string;
  userProfile: {
    avatar_url?: string;
    username?: string;
  } | null;
  unreadCount: number;
  showNotificationModal: boolean;
  setShowNotificationModal: (val: boolean) => void;
  navigate: (path: string) => void;
  floodZones: any[];
  trafficAlerts: any[];
  events: EventData[];
  setMapControls: React.Dispatch<React.SetStateAction<any>>;
  mapRef: React.RefObject<any>;
  setSelectedFloodZone: (val: any) => void;
  setSelectedTrafficAlert: (val: any) => void;
  setSelectedPOI: (val: any) => void;
  setSelectedEvent: (val: EventData | null) => void;
  setSelectedRoadPopup: (val: any) => void;
  setViewMode: (val: "pois" | "events") => void;
  setShowEventsSidebar: (val: boolean) => void;
  handleEventClick: (event: EventData) => Promise<void>;
}

export const TopRightActions: React.FC<TopRightActionsProps> = ({
  userRole,
  userProfile,
  unreadCount,
  showNotificationModal,
  setShowNotificationModal,
  navigate,
  floodZones,
  trafficAlerts,
  events,
  setMapControls,
  mapRef,
  setSelectedFloodZone,
  setSelectedTrafficAlert,
  setSelectedPOI,
  setSelectedEvent,
  setSelectedRoadPopup,
  setViewMode,
  setShowEventsSidebar,
  handleEventClick,
}) => {
  return (
    <div className="flex flex-row items-center gap-2 shrink-0 pointer-events-auto self-start z-[300]">
      <div className="relative z-[300]">
        <button
          onClick={() => setShowNotificationModal(!showNotificationModal)}
          className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all relative"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <NotificationCenter
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onFlyToZone={(notif: AppNotification) => {
            setShowNotificationModal(false);
            if (!notif) return;

            const match = notif.message?.match(/\[zone_id:(\d+)\]/);
            if (match) {
              const zoneId = parseInt(match[1]);
              const zone = floodZones.find(
                (z) => z.id === zoneId || z.zone_id === zoneId,
              );
              if (
                zone &&
                Array.isArray(zone.center) &&
                zone.center.length === 2
              ) {
                setMapControls((prev: any) => ({ ...prev, flood: true }));
                mapRef.current?.flyTo({
                  center: [zone.center[0], zone.center[1]],
                  zoom: 15,
                  duration: 1500,
                });
                setSelectedFloodZone({
                  lng: zone.center[0],
                  lat: zone.center[1],
                  properties: {
                    id: zone.id,
                    name: zone.name,
                    depthCm: zone.depthCm,
                    risk_level: zone.risk_level,
                    description: zone.description,
                  },
                });
                return;
              }
            }

            if (notif.alert_id) {
              const alert = trafficAlerts.find(
                (a) => a.id === notif.alert_id || a.alert_id === notif.alert_id,
              );
              if (alert) {
                setMapControls((prev: any) => ({ ...prev, traffic: true }));
                mapRef.current?.flyTo({
                  center: [alert.longitude, alert.latitude],
                  zoom: 16,
                  duration: 1500,
                });
                setSelectedTrafficAlert(alert);
                setSelectedPOI(null);
                setSelectedEvent(null);
                setSelectedRoadPopup(null);
              }
            }
          }}
          onOpenEvent={async (eventId) => {
            setViewMode("events");
            setShowEventsSidebar(true);

            const found = events.find((e) => e.event_id === eventId);

            if (found) {
              await handleEventClick(found);
            }

            setShowNotificationModal(false);
          }}
        />
      </div>

      {userRole === "admin" ? (
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="w-[42px] h-[42px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all"
        >
          <Settings size={18} />
        </button>
      ) : (
        <button
          onClick={() => navigate("?tab=profile")}
          className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 overflow-hidden text-slate-600 hover:text-blue-600 transition-all"
        >
          {userProfile?.avatar_url ? (
            <img
              src={
                userProfile.avatar_url.startsWith("http")
                  ? userProfile.avatar_url
                  : `${
                      import.meta.env.VITE_API_URL || "http://localhost:5001"
                    }${userProfile.avatar_url}`
              }
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} />
          )}
        </button>
      )}
    </div>
  );
};
