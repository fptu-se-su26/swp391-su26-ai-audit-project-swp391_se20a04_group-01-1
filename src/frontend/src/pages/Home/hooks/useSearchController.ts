import { useState, useRef } from 'react';

export function useSearchController(routeController: any) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [activeInputField, setActiveInputField] = useState<'origin' | 'destination' | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const handleSwap = () => {
        if (!routeController.origin && !routeController.destination) return;

        const tempDest = routeController.destination;
        const tempDestQuery = routeController.destinationQuery;
        
        routeController.setDestination(routeController.origin);
        routeController.setDestinationQuery(routeController.originQuery);
        
        routeController.setOrigin(tempDest);
        routeController.setOriginQuery(tempDestQuery);
    };

    const handleSuggestionClick = (item: any, activeField: 'origin' | 'destination' | null) => {
        if (!activeField) return;

        const locationPoint = {
            lng: item.geometry?.coordinates?.[0] || item.lng,
            lat: item.geometry?.coordinates?.[1] || item.lat,
            label: item.place_name || item.text || item.name,
        };

        if (activeField === 'origin') {
            routeController.setOrigin(locationPoint);
            routeController.setOriginQuery(locationPoint.label);
        } else if (activeField === 'destination') {
            routeController.setDestination(locationPoint);
            routeController.setDestinationQuery(locationPoint.label);
        }

        setSuggestions([]);
        setActiveInputField(null);
    };

    return {
        suggestions,
        setSuggestions,
        searchContainerRef,
        activeInputField,
        setActiveInputField,
        handleSwap,
        handleSuggestionClick
    };
}