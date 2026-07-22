import { useState, useEffect, useMemo } from 'react';
import { eventRoadService, EventRoad } from '../../../services/eventRoadService';

export function useEventRoads(selectedEvent: any) {
    const [eventRoads, setEventRoads] = useState<EventRoad[]>([]);
    // Đường cấm đang active (backend đã lọc theo GETDATE())
    const [activeEventRoads, setActiveEventRoads] = useState<EventRoad[]>([]);
    // Tick mỗi phút để refetch và re-evaluate
    const [tick, setTick] = useState(0);

    const isRoadRestrictionActive = (road: EventRoad, now: Date) => {
        const start = new Date(road.restriction_start);
        const end = new Date(road.restriction_end);
        
        if (now < start || now > end) {
            return false;
        }

        if (road.days_of_week) {
            const currentDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
            const days = road.days_of_week.split(',').map(d => parseInt(d.trim()));
            if (!days.includes(currentDay)) {
                return false;
            }
        }

        if (road.start_time_of_day && road.end_time_of_day) {
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            const parseTimeToMinutes = (timeStr: string) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
            };

            const startMin = parseTimeToMinutes(road.start_time_of_day);
            const endMin = parseTimeToMinutes(road.end_time_of_day);

            return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
        }

        return true;
    };

    // Re-fetch active roads mỗi 60 giây
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Đường cấm hiển thị = active roads (từ backend) + roads của sự kiện đang chọn
    const activeOrSelectedEventRoads = useMemo(() => {
        if (!selectedEvent) {
            return activeEventRoads;
        }
        // Thêm roads của sự kiện được chọn vào list
        const selectedRoads = eventRoads.filter(r => r.event_id === selectedEvent.event_id);
        const merged = [...activeEventRoads];
        selectedRoads.forEach(r => {
            if (!merged.find(a => a.road_id === r.road_id)) {
                merged.push(r);
            }
        });
        return merged;
    }, [activeEventRoads, eventRoads, selectedEvent]);

    const fetchEventRoads = async () => {
        try {
            // Lấy TẤT CẢ đường cấm đã được duyệt (để dùng khi user chọn sự kiện)
            const allData = await eventRoadService.getEventRoads({ approved_only: true });
            setEventRoads(allData);

            // Lấy các đường cấm đang ACTIVE theo server time (tránh lỗi timezone)
            const activeData = await eventRoadService.getEventRoads({ approved_only: true, active_only: true });
            setActiveEventRoads(activeData);
        } catch (error) {
            console.error("Lỗi tải đường cấm sự kiện từ backend:", error);
        }
    };

    useEffect(() => {
        fetchEventRoads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);

    return {
        eventRoads,
        setEventRoads,
        activeOrSelectedEventRoads,
        activeEventRoads,
        isRoadRestrictionActive,
        fetchEventRoads
    };
}
