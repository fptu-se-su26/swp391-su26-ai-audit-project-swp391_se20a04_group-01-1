import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { handleImageError } from './utils/formatters';

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
    view_count: number;
    favorite_count: number;
}

interface EventsLayerProps {
    events: EventData[];
    onSelectEvent: (event: EventData) => void;
}

export const getEventStatus = (startTime: string, endTime?: string) => {
    const now = new Date();
    const start = new Date(startTime);
    // Nếu không có end_time, mặc định kéo dài 3 tiếng
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'ongoing';
};

export default function EventsLayer({ events, onSelectEvent }: EventsLayerProps) {
    return (
        <>
            {events.map((evt) => {
                const status = getEventStatus(evt.start_time, evt.end_time);
                const categoryColor = evt.category_color || '#6366F1';

                let markerClass = "relative w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110";
                let containerClass = "relative flex flex-col items-center cursor-pointer group transition-transform";

                if (status === 'ended') {
                    containerClass += " opacity-50 grayscale hover:opacity-80 hover:grayscale-0";
                } else if (status === 'ongoing') {
                    markerClass += " ring-4 ring-emerald-500/50 animate-pulse";
                }

                return (
                    <Marker
                        key={evt.event_id}
                        longitude={evt.longitude}
                        latitude={evt.latitude}
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent?.stopPropagation();
                            onSelectEvent(evt);
                        }}
                    >
                        <div className={containerClass}>
                            <div
                                className={markerClass}
                                style={{ backgroundColor: categoryColor }}
                            >
                                {evt.thumbnail_url ? (
                                    <img
                                        src={evt.thumbnail_url}
                                        alt={evt.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-white text-base">{evt.category_icon || '🎆'}</span>
                                )}
                            </div>

                            <div
                                className="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white shadow-sm"
                                style={{
                                    backgroundColor: categoryColor,
                                    borderColor: 'white'
                                }}
                            />

                            {status === 'ongoing' && (
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