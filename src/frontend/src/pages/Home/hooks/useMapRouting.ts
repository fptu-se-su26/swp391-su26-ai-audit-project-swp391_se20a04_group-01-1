import { useState, useEffect, useRef } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import { EventRoad } from '../../../services/eventRoadService';
import { findSafeRoute as findSafeRouteZone } from '../../../utils/floodZoneRouteUtils';
import { findSafeTrafficRoute } from '../../../utils/trafficRouteUtils';
import { findSafeEventRoute } from '../../../utils/eventRouteUtils';
import { showPremiumToast } from '../../../utils/toastUtils';

export interface RouteData {
    totalDistanceKm: number;
    totalTimeMin: number;
    coordinates: [number, number][];
}

export interface LocationPoint {
    lng: number;
    lat: number;
    label: string;
    poi_id?: number;
}

export function useMapRouting(
    mapRef: React.RefObject<MapRef | null>,
    options: {
        floodZones: any[];
        trafficAlerts: any[];
        activeEventRoads: EventRoad[];
        avoidFlood: boolean;
        avoidCongestion: boolean;
        confirmedFloodZoneIds: string[];
    }
) {
    const [origin, setOrigin] = useState<LocationPoint | null>(null);
    const [destination, setDestination] = useState<LocationPoint | null>(null);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
    const [routeData, setRouteData] = useState<RouteData | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [routeAlertMessage, setRouteAlertMessage] = useState<string | null>(null);
    const isLoadedRouteRef = useRef(false);

    // Fetch and process map route
    useEffect(() => {
        if (!origin || !destination) return;
        if (isLoadedRouteRef.current) {
            isLoadedRouteRef.current = false;
            return;
        }

        const getShortestRoute = async () => {
            setLoadingRoute(true);
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`
                );
                const data = await response.json();
                
                if (response.ok && data.routes && data.routes.length > 0) {
                    let selectedRoute = data.routes[0];
                    let alertMsg: string | null = null;

                    if (options.avoidFlood) {
                        const result = await findSafeRouteZone(
                            data.routes,
                            options.floodZones,
                            origin,
                            destination,
                            travelMode,
                            mapboxToken,
                            options.confirmedFloodZoneIds
                        );
                        selectedRoute = result.selectedRoute;
                        alertMsg = result.alertMsg;
                    }

                    if (options.avoidCongestion && selectedRoute) {
                        const result = await findSafeTrafficRoute(
                            [selectedRoute, ...data.routes.filter((r: any) => r !== selectedRoute)],
                            options.trafficAlerts,
                            origin,
                            destination,
                            travelMode,
                            mapboxToken
                        );
                        selectedRoute = result.selectedRoute;
                        if (result.alertMsg) {
                            alertMsg = alertMsg ? `${alertMsg}\n${result.alertMsg}` : result.alertMsg;
                        }
                    }

                    if (options.activeEventRoads.length > 0 && selectedRoute) {
                        const result = await findSafeEventRoute(
                            [selectedRoute, ...data.routes.filter((r: any) => r !== selectedRoute)],
                            options.activeEventRoads,
                            origin,
                            destination,
                            travelMode,
                            mapboxToken
                        );
                        selectedRoute = result.selectedRoute;
                        if (result.alertMsg) {
                            alertMsg = alertMsg ? `${alertMsg}\n${result.alertMsg}` : result.alertMsg;
                        }
                    }

                    setRouteAlertMessage(alertMsg);

                    if (selectedRoute) {
                        setRouteData({
                            totalDistanceKm: parseFloat((selectedRoute.distance / 1000).toFixed(2)),
                            totalTimeMin: Math.round(selectedRoute.duration / 60),
                            coordinates: selectedRoute.geometry.coordinates
                        });

                        // Căn chỉnh camera hiển thị đầy đủ tuyến đường đi
                        const coords = selectedRoute.geometry.coordinates;
                        if (coords.length > 0) {
                            let minLng = coords[0][0], maxLng = coords[0][0];
                            let minLat = coords[0][1], maxLat = coords[0][1];
                            for (const c of coords) {
                                if (c[0] < minLng) minLng = c[0];
                                if (c[0] > maxLng) maxLng = c[0];
                                if (c[1] < minLat) minLat = c[1];
                                if (c[1] > maxLat) maxLat = c[1];
                            }

                            mapRef.current?.fitBounds(
                                [[minLng, minLat], [maxLng, maxLat]],
                                { padding: 80, duration: 1500 }
                            );
                        }
                    } else {
                        setRouteData(null);
                    }
                } else {
                    showPremiumToast('Không tìm thấy đường đi thích hợp cho phương tiện này!', 'error');
                    setRouteData(null);
                    setRouteAlertMessage(null);
                }
            } catch (err) {
                console.error("Lỗi kết nối API đường đi Mapbox:", err);
                setRouteData(null);
                setRouteAlertMessage(null);
            } finally {
                setLoadingRoute(false);
            }
        };

        getShortestRoute();
    }, [
        origin, 
        destination, 
        travelMode, 
        options.avoidFlood, 
        options.avoidCongestion, 
        options.confirmedFloodZoneIds, 
        options.floodZones, 
        options.activeEventRoads, 
        options.trafficAlerts,
        mapRef
    ]);

    const applyRouteToState = (route: any) => {
        if (!route) return;
        const coords = route.geometry?.coordinates || JSON.parse(route.route_data || '[]');
        setRouteData({
            totalDistanceKm: route.distance 
                ? parseFloat((route.distance / 1000).toFixed(2))
                : parseFloat((route.distance_meters / 1000).toFixed(2)),
            totalTimeMin: route.duration 
                ? Math.round(route.duration / 60) 
                : Math.round(route.duration_seconds / 60),
            coordinates: coords
        });
        isLoadedRouteRef.current = true;
    };

    return {
        origin, setOrigin,
        originQuery, setOriginQuery,
        destination, setDestination,
        destinationQuery, setDestinationQuery,
        travelMode, setTravelMode,
        routeData, setRouteData,
        loadingRoute, setLoadingRoute,
        routeAlertMessage, setRouteAlertMessage,
        isLoadedRouteRef,
        applyRouteToState
    };
}