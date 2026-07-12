/**
 * Kiểm tra 1 đường cấm sự kiện (event road) có đang bị áp dụng hạn chế tại thời điểm `now` không.
 * Tách từ hooks/useEventRoads.ts để dùng chung cho cả layer (EventRoadLayer) và popup (EventRoadPopup).
 */
export function isRoadRestrictionActive(road: any, now: Date): boolean {
  const start = new Date(road.restriction_start);
  const end = new Date(road.restriction_end);

  if (now < start || now > end) {
    return false;
  }

  if (road.days_of_week) {
    const currentDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
    const days = road.days_of_week.split(",").map((d: string) => parseInt(d.trim()));
    if (!days.includes(currentDay)) {
      return false;
    }
  }

  if (road.start_time_of_day && road.end_time_of_day) {
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const parseTimeToMinutes = (timeStr: string) => {
      const parts = timeStr.split(":");
      return parseInt(parts[0] || "0") * 60 + parseInt(parts[1] || "0");
    };

    const startMin = parseTimeToMinutes(road.start_time_of_day);
    const endMin = parseTimeToMinutes(road.end_time_of_day);

    return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
  }

  return true;
}
