import { useRef, useCallback, useState } from "react";
import { useVoiceGuidance } from "./useVoiceGuidance";
// Nhập hàm từ file utils bên ngoài
import { getDistance, isNearRoute } from "../../../utils/floodZoneRouteUtils";

export type ProximityEvent = {
  id: string;
  kind: "flood" | "traffic" | "closure";
  title: string;
  message: string;
  distance: number;
  onRoute: boolean; 
};

// Đơn vị: mét
const RADIUS = { flood: 100, traffic: 400, closure: 650 };
const COOLDOWN_MS = 4 * 60 * 1000; // 4 phút

export function useProximityAlerts() {
  const { speak } = useVoiceGuidance();
  const lastFiredAt = useRef<number>(0);
  const seenIds = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<ProximityEvent[]>([]);

  const evaluate = useCallback((
    userLoc: { lat: number; lng: number },
    activeRouteCoords: [number, number][] | null,
    floodZones: any[], 
    trafficAlerts: any[], 
    closedRoads: any[]
  ) => {
    const now = Date.now();
    const candidates: ProximityEvent[] = [];

    const check = (list: any[], kind: ProximityEvent["kind"], idKey: string) => {
      for (const item of list) {
        const dLat = item.latitude ?? item.center?.[1];
        const dLng = item.longitude ?? item.center?.[0];
        if (dLat == null || dLng == null) continue;

        const distance = getDistance(userLoc.lng, userLoc.lat, dLng, dLat);
        const onRoute = activeRouteCoords
          ? isNearRoute(activeRouteCoords, dLng, dLat, RADIUS[kind])
          : false;

        if (onRoute || distance <= RADIUS[kind]) {
          candidates.push({
            id: `${kind}-${item[idKey]}`,
            kind,
            title: item.title ?? item.zone_name,
            message: item.description ?? "",
            distance,
            onRoute,
          });
        }
      }
    };

    check(floodZones, "flood", "zone_id");
    check(trafficAlerts, "traffic", "alert_id");
    check(closedRoads, "closure", "road_id");

    const fresh = candidates.filter(c => !seenIds.current.has(c.id));
    if (fresh.length === 0) return;

    if (now - lastFiredAt.current < COOLDOWN_MS) return;

    fresh.forEach(c => seenIds.current.add(c.id));
    lastFiredAt.current = now;

    if (fresh.length > 1) {
      setQueue([{
        id: `grouped-${now}`,
        kind: fresh[0].kind,
        title: `⚠️ ${fresh.length} cảnh báo phía trước`,
        message: fresh.map(f => f.title).join(", "),
        distance: Math.min(...fresh.map(f => f.distance)),
        onRoute: fresh.some(f => f.onRoute),
      }]);
      speak(`Chú ý, có ${fresh.length} điểm cảnh báo phía trước, vui lòng chú ý quan sát.`);
    } else {
      setQueue([fresh[0]]);
      speak(buildSpeechText(fresh[0]));
    }
  }, [speak]);

  const dismiss = useCallback((id: string) => {
    setQueue(q => q.filter(e => e.id !== id));
  }, []);

  return { queue, evaluate, dismiss };
}

function buildSpeechText(e: ProximityEvent) {
  if (e.kind === "flood") return `Cảnh báo: vùng ngập ${e.title} phía trước, vui lòng chú ý quan sát.`;
  if (e.kind === "closure") return `Cảnh báo: đoạn đường ${e.title} đang bị cấm phía trước.`;
  return `Lưu ý: ${e.title} phía trước.`;
}