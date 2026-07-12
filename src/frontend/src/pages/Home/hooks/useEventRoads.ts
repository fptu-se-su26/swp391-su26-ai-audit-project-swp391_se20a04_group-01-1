import { useState, useEffect, useMemo } from 'react';
import { eventRoadService, EventRoad } from '../../../services/eventRoadService';
import { isRoadRestrictionActive } from '../utils/layerUtils';

export function useEventRoads(selectedEvent: any) {
    const [eventRoads, setEventRoads] = useState<EventRoad[]>([]);

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
