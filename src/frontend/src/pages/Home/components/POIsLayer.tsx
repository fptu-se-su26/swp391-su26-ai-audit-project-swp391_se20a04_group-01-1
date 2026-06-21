import React, { useMemo, useCallback } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';
import POIPopup, { POIData } from './POIPopup';
import { getCategoryNameByFilter } from './constants/poiCategories';

interface POIsLayerProps {
    pois: POIData[];
    selectedFilter: string | null;
    onDirectionsClick: (poi: POIData) => void;
    selectedPOI: POIData | null;
    onSelectPOI: (poi: POIData | null) => void;
}

export default function POIsLayer({
    pois,
    selectedFilter,
    onDirectionsClick,
    selectedPOI,
    onSelectPOI
}: POIsLayerProps) {
    const { current: map } = useMap();

    // ✅ Chuyển đổi dữ liệu POIs thành GeoJSON FeatureCollection
    const poisGeoJSON = useMemo(() => {
        let filteredPois = pois || [];

        // Lọc theo category khi user chọn filter
        if (selectedFilter) {
            const categoryName = getCategoryNameByFilter(selectedFilter);
            if (categoryName) {
                filteredPois = filteredPois.filter(poi => poi.category_name === categoryName);
            }
        }

        return {
            type: 'FeatureCollection' as const,
            features: filteredPois.map(poi => ({
                type: 'Feature' as const,
                properties: {
                    poi_id: poi.poi_id,
                    name: poi.name,
                    address: poi.address || '',
                    description: poi.description || '',
                    image_url: poi.image_url || '',
                    website_url: poi.website_url || '',
                    phone_number: poi.phone_number || '',
                    rating: poi.rating || 0,
                    is_featured: poi.is_featured ? 1 : 0,
                    category_name: poi.category_name,
                    category_icon: poi.category_icon,
                    category_color: poi.category_color,
                    color: poi.category_color || '#6366F1'
                },
                geometry: {
                    type: 'Point' as const,
                    coordinates: [poi.longitude, poi.latitude]
                }
            }))
        };
    }, [pois, selectedFilter]);

    // ✅ Xử lý click vào cluster → zoom vào
    const handleClusterClick = useCallback((event: any) => {
        if (!map) return;

        const features = map.queryRenderedFeatures(event.point, {
            layers: ['poi-clusters']
        });

        if (features && features.length > 0) {
            const clusterId = features[0].properties?.cluster_id;
            const source = map.getSource('pois-source') as any;

            if (source && clusterId !== undefined) {
                source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                    if (err) return;
                    const geometry = features[0].geometry as any;
                    map.flyTo({
                        center: geometry.coordinates,
                        zoom: zoom,
                        duration: 800
                    });
                });
            }
        }
    }, [map]);

    // ✅ Xử lý click vào điểm đơn lẻ → mở Popup
    const handlePointClick = useCallback((event: any) => {
        if (!map) return;

        const features = map.queryRenderedFeatures(event.point, {
            layers: ['poi-unclustered-point']
        });

        if (features && features.length > 0) {
            const props = features[0].properties;
            if (!props) return;

            event.originalEvent?.stopPropagation();

            const geometry = features[0].geometry as any;

            onSelectPOI({
                poi_id: props.poi_id,
                name: props.name,
                latitude: geometry.coordinates[1],
                longitude: geometry.coordinates[0],
                address: props.address || null,
                description: props.description || null,
                image_url: props.image_url || null,
                website_url: props.website_url || null,
                phone_number: props.phone_number || null,
                rating: props.rating ? Number(props.rating) : null,
                is_featured: props.is_featured === 1 || props.is_featured === true,
                category_name: props.category_name,
                category_icon: props.category_icon,
                category_color: props.category_color || props.color
            });
        }
    }, [map, onSelectPOI]);

    // ✅ Đăng ký sự kiện click trên map
    React.useEffect(() => {
        if (!map) return;

        map.on('click', 'poi-clusters', handleClusterClick);
        map.on('click', 'poi-unclustered-point', handlePointClick);

        map.on('mouseenter', 'poi-clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'poi-clusters', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'poi-unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'poi-unclustered-point', () => {
            map.getCanvas().style.cursor = '';
        });

        return () => {
            map.off('click', 'poi-clusters', handleClusterClick);
            map.off('click', 'poi-unclustered-point', handlePointClick);
            map.off('mouseenter', 'poi-clusters', () => { });
            map.off('mouseleave', 'poi-clusters', () => { });
            map.off('mouseenter', 'poi-unclustered-point', () => { });
            map.off('mouseleave', 'poi-unclustered-point', () => { });
        };
    }, [map, handleClusterClick, handlePointClick]);

    return (
        <>
            <Source
                id="pois-source"
                type="geojson"
                data={poisGeoJSON}
                cluster={true}
                clusterMaxZoom={14}
                clusterRadius={50}
            >
                <Layer
                    id="poi-clusters"
                    type="circle"
                    filter={['has', 'point_count']}
                    paint={{
                        'circle-color': [
                            'step', ['get', 'point_count'],
                            '#51bbd6',
                            10, '#f1f075',
                            30, '#f28cb1'
                        ],
                        'circle-radius': [
                            'step', ['get', 'point_count'],
                            18,
                            10, 24,
                            30, 32
                        ],
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.85
                    }}
                />

                <Layer
                    id="poi-cluster-count"
                    type="symbol"
                    filter={['has', 'point_count']}
                    layout={{
                        'text-field': '{point_count_abbreviated}',
                        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
                        'text-size': 13
                    }}
                    paint={{
                        'text-color': '#1e293b'
                    }}
                />

                <Layer
                    id="poi-unclustered-point"
                    type="circle"
                    filter={['!', ['has', 'point_count']]}
                    paint={{
                        'circle-color': ['get', 'color'],
                        'circle-radius': 8,
                        'circle-stroke-width': 2.5,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.9
                    }}
                />

                <Layer
                    id="poi-featured-glow"
                    type="circle"
                    filter={['all',
                        ['!', ['has', 'point_count']],
                        ['==', ['get', 'is_featured'], 1]
                    ]}
                    paint={{
                        'circle-color': 'transparent',
                        'circle-radius': 14,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#fbbf24',
                        'circle-stroke-opacity': 0.7
                    }}
                />
            </Source>

            {selectedPOI && (
                <POIPopup
                    poi={selectedPOI}
                    onClose={() => onSelectPOI(null)}
                    onDirectionsClick={onDirectionsClick}
                />
            )}
        </>
    );
}