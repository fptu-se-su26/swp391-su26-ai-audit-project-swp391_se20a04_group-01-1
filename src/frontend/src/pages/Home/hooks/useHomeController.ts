import { useState } from 'react';
import { POIData } from '../types/poi';
import { EventData } from "../types/event";
import { fetchInitialCatalog } from '../services/searchService';

export function useHomeController() {
    const [pois, setPois] = useState<POIData[]>([]);
    const [events, setEvents] = useState<EventData[]>([]);
    const [eventCategories, setEventCategories] = useState<any[]>([]);

    const fetchInitialData = async () => {
        try {
            const { pois, events, eventCategories } = await fetchInitialCatalog();
            setPois(pois);
            setEvents(events);
            setEventCategories(eventCategories);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu ban đầu:", error);
        }
    };

    return {
        fetchInitialData,
        pois,
        events,
        eventCategories
    };
}
