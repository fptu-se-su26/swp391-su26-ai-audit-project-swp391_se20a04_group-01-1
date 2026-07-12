import { useCallback } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { useUIStore } from "../../../store/uiStore";

/**
 * useMapController
 * Chứa toàn bộ logic tương tác với bản đồ (click, move, hover)
 * được tách ra khỏi MapCanvas.tsx để component map chỉ còn nhiệm vụ render.
 */
export function useMapController(mapRef: React.RefObject<MapRef>, routeController: any) {
  const uiState = useUIStore();
  const isLowBandwidth = uiState.isLowBandwidth;

  const handleMapClick = useCallback(
    (event: any) => {
      const { lng, lat } = event.lngLat;

      if (mapRef.current && uiState.mapControls.flood) {
        const features = mapRef.current.queryRenderedFeatures(event.point, {
          layers: ["flood-zones-fill"],
        });

        if (features && features.length > 0) {
          const feature = features[0];
          const props = feature.properties || {};
          uiState.setUIState({
            selectedFloodZone: { lng, lat, properties: props },
          });

          const depthCm = Number(props.depthCm || 0);
          const label = `${props.name || "Vùng ngập"} - ngập ${depthCm}cm`;

          if (depthCm <= 10) {
            uiState.showCustomConfirm(
              "Định tuyến tới vùng ngập nhẹ",
              `Khu vực này đang ngập nhẹ khoảng ${depthCm}cm. Bạn có muốn tìm đường đi tới đây không?`,
              () => {
                routeController.setDestination({ lng, lat, label });
                routeController.setDestinationQuery(label);
                if (routeController.userLocation) {
                  routeController.setOrigin({ lng: routeController.userLocation.lng, lat: routeController.userLocation.lat, label: "Vị trí của bạn" });
                  routeController.setOriginQuery("Vị trí của bạn");
                }
              },
              () => {
                routeController.setDestination(null);
                routeController.setRouteData(null);
              }
            );
          } else {
            uiState.showCustomConfirm(
              "Định tuyến tới vùng ngập sâu",
              `Khu vực này ngập sâu ${depthCm}cm, nguy hiểm. Bạn có chắc chắn muốn đi không?`,
              () => {
                routeController.setConfirmedFloodZoneIds((prev: any) => [...prev, String(props.id)]);
                routeController.setDestination({ lng, lat, label });
                routeController.setDestinationQuery(label);
                if (routeController.userLocation) {
                  routeController.setOrigin({ lng: routeController.userLocation.lng, lat: routeController.userLocation.lat, label: "Vị trí của bạn" });
                  routeController.setOriginQuery("Vị trí của bạn");
                }
              },
              () => {
                routeController.setDestination(null);
                routeController.setRouteData(null);
              }
            );
          }
          return;
        }
      }
      uiState.setUIState({ pendingDestination: { lng, lat } });
    },
    [mapRef, uiState, routeController]
  );

  const handleMapMove = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;

    if (uiState.selectedFloodZone && !bounds.contains([uiState.selectedFloodZone.lng, uiState.selectedFloodZone.lat])) {
      uiState.setUIState({ selectedFloodZone: null });
    }
    if (uiState.pendingDestination && !bounds.contains([uiState.pendingDestination.lng, uiState.pendingDestination.lat])) {
      uiState.setUIState({ pendingDestination: null });
    }
  }, [mapRef, uiState]);

  const handleMapMouseMove = useCallback(
    (event: any) => {
      if (!uiState.mapControls.flood) return;
      const features = mapRef.current?.queryRenderedFeatures(event.point, { layers: ["flood-zones-fill"] });
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = features && features.length > 0 ? "pointer" : "";
      }
    },
    [mapRef, uiState.mapControls.flood]
  );

  return {
    isLowBandwidth,
    handleMapClick,
    handleMapMove,
    handleMapMouseMove,
  };
}