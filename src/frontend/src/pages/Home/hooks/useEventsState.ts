import { useState, useEffect } from "react";
import { eventAPI } from "../../../services/api";
import { EventData } from "../components/EventsLayer";

export const useEventsState = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [favoriteEventIds, setFavoriteEventIds] = useState<Set<number>>(new Set());
  const [showEventsSidebar, setShowEventsSidebar] = useState(true);

  const fetchUserFavoriteEventIds = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const favsRes = await eventAPI.getFavoriteEventIds();
      if (favsRes.data && favsRes.data.data) {
        setFavoriteEventIds(new Set(favsRes.data.data));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách sự kiện yêu thích:", error);
    }
  };

  const fetchEventsAndCategories = async () => {
    try {
      const eventsRes = await eventAPI.getAllEvents("approved");
      if (eventsRes.data && eventsRes.data.data) {
        setEvents(eventsRes.data.data);
      }

      const catsRes = await eventAPI.getEventCategories();
      if (catsRes.data && catsRes.data.data) {
        setEventCategories(catsRes.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải sự kiện/danh mục:", error);
    }
  };

  const handleFavoriteEventToggle = async (eventObj: EventData) => {
    try {
      const res = await eventAPI.toggleFavorite(eventObj.event_id);
      const { isFavorite, favoriteCount } = res.data;

      setFavoriteEventIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(eventObj.event_id);
        } else {
          next.delete(eventObj.event_id);
        }
        return next;
      });

      setEvents((prev) =>
        prev.map((e) => {
          if (e.event_id === eventObj.event_id) {
            return { ...e, favorite_count: favoriteCount };
          }
          return e;
        }),
      );

      if (selectedEvent && selectedEvent.event_id === eventObj.event_id) {
        setSelectedEvent((prev) =>
          prev ? { ...prev, favorite_count: favoriteCount } : null,
        );
      }
    } catch (error) {
      console.error("Lỗi toggle yêu thích sự kiện:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchEventsAndCategories();
    fetchUserFavoriteEventIds();
  }, []);

  return {
    events,
    setEvents,
    eventCategories,
    setEventCategories,
    selectedEvent,
    setSelectedEvent,
    favoriteEventIds,
    setFavoriteEventIds,
    showEventsSidebar,
    setShowEventsSidebar,
    fetchUserFavoriteEventIds,
    fetchEventsAndCategories,
    handleFavoriteEventToggle,
  };
};
