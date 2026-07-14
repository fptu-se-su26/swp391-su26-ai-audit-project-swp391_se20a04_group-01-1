import { useState, useEffect, useMemo } from 'react';
import { eventRoadService, EventRoad } from '../../../services/eventRoadService';

export function useEventRoads(selectedEvent: any) {
    const [eventRoads, setEventRoads] = useState<EventRoad[]>([]);

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

    const activeOrSelectedEventRoads = useMemo(() => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins later
        
        return eventRoads.filter(road => {
            const isActiveNow = isRoadRestrictionActive(road, now);
            const isActiveSoon = isRoadRestrictionActive(road, futureTime);
            const isSelectedEventRoad = selectedEvent && road.event_id === selectedEvent.event_id;

            return isActiveNow || isActiveSoon || isSelectedEventRoad;
        });
    }, [eventRoads, selectedEvent]);

    const fetchEventRoads = async () => {
        try {
            const data = await eventRoadService.getEventRoads({ approved_only: true });
            setEventRoads(data);
        } catch (error) {
            console.error("Lỗi tải đường cấm sự kiện từ backend:", error);
        }
    };

    useEffect(() => {
        fetchEventRoads();
    }, []);

    return {
        eventRoads,
        setEventRoads,
        activeOrSelectedEventRoads,
        isRoadRestrictionActive,
        fetchEventRoads
    };
}
