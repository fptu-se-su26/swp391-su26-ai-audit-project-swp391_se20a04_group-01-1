import React from "react";
import Map, { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useUIStore } from "../../../../store/uiStore";
import { useMapController } from "../../hooks/useMapController";

import { MapControls } from "./MapControls";
import { UserMarkers } from "./UserMarkers";
import { RouteLayer } from "./RouteLayer";
import { FloodLayer } from "./FloodLayer";
import { TrafficLayer } from "./TrafficLayer";
import { EventRoadLayer } from "./EventRoadLayer";
import { MapPopups } from "./popups";

import POILayer from "./POILayer";
import EventsLayer from "./EventsLayer";
interface MapCanvasProps {
  mapRef: React.RefObject<MapRef>;
  routeController: any;
  trafficController: any;
  homeController: any;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  mapRef,
  routeController,
  trafficController,
  homeController,
}) => {
  const uiState = useUIStore();
  const { isLowBandwidth, handleMapClick, handleMapMove, handleMapMouseMove } =
    useMapController(mapRef, routeController);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 108.2022, latitude: 16.0544, zoom: 13 }}
      onClick={handleMapClick}
      onMove={handleMapMove}
      onMouseMove={handleMapMouseMove}
      interactiveLayerIds={["flood-zones-fill"]}
      style={{ width: "100%", height: "100%" }}
      mapStyle={isLowBandwidth ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/streets-v12"}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
    >
      <MapControls />

      <UserMarkers
        userLocation={routeController.userLocation}
        origin={routeController.origin}
        destination={routeController.destination}
        pendingDestination={uiState.pendingDestination}
      />

      <RouteLayer routeData={routeController.routeData} />

      <FloodLayer floodZones={routeController.floodZones} isFloodLayerActive={uiState.mapControls.flood} />

      <TrafficLayer
        trafficAlerts={trafficController.trafficAlerts}
        isTrafficLayerActive={uiState.mapControls.traffic}
        onSelectAlert={(alert) => uiState.setUIState({ selectedTrafficAlert: alert, selectedPOI: null, selectedEvent: null, selectedRoadPopup: null })}
      />

      <EventRoadLayer
        activeOrSelectedEventRoads={routeController.activeOrSelectedEventRoads}
        events={homeController.events}
        isRoadRestrictionActive={routeController.isRoadRestrictionActive}
        selectedRoadPopup={uiState.selectedRoadPopup}
        onSelectRoad={(road) => uiState.setUIState({ selectedRoadPopup: road })}
        onSelectEvent={(evt) => { uiState.setUIState({ selectedEvent: evt, showSavedRoutesSidebar: false, selectedPOI: null }); mapRef.current?.flyTo({ center: [evt.longitude, evt.latitude], zoom: 15 }); }}
        setViewMode={(mode) => uiState.setUIState({ viewMode: mode })}
      />

      {uiState.viewMode === "pois" ? (
        <POILayer
          pois={homeController.pois}
          selectedFilter={uiState.selectedFilter}
          onDirectionsClick={(poi: any) => {
            routeController.setDestination({ lng: poi.longitude, lat: poi.latitude, label: poi.name, poi_id: poi.poi_id });
            routeController.setDestinationQuery(poi.name);
            if (routeController.userLocation) {
              routeController.setOrigin({ lng: routeController.userLocation.lng, lat: routeController.userLocation.lat, label: "Vị trí của bạn" });
              routeController.setOriginQuery("Vị trí của bạn");
            }
          }}
          selectedPOI={uiState.selectedPOI}
          onSelectPOI={(poi: any) => { uiState.setUIState({ selectedPOI: poi }); mapRef.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 16 }); }}
        />
      ) : (
        <EventsLayer
          events={homeController.events}
          onSelectEvent={(evt: any) => { uiState.setUIState({ selectedEvent: evt, showSavedRoutesSidebar: false, selectedPOI: null }); mapRef.current?.flyTo({ center: [evt.longitude, evt.latitude], zoom: 15 }); }}
        />
      )}

      <MapPopups routeController={routeController} isRoadRestrictionActive={routeController.isRoadRestrictionActive} />
    </Map>
  );
};
