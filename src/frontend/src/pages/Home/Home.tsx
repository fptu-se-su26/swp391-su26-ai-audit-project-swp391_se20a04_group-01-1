import React, { useRef, useEffect, useMemo } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Settings,
  User,
  Compass,
  Utensils,
  Hotel,
  Gamepad2,
  Landmark,
  DollarSign,
} from "lucide-react";
import ProfilePage from "../Profile/ProfilePage";

// Store & Hooks
import { useUIStore } from "../../store/uiStore"; 
import { useHomeController } from "./hooks/useHomeController";
import { useRouteController } from "./hooks/useRouteController";
import { useTrafficController } from "./hooks/useTrafficController";
import { useSearchController } from "./hooks/useSearchController";
import { useShareController } from "./hooks/useShareController";
import { useFavoriteController } from "./hooks/useFavoriteController";
import { useNotificationController } from "./hooks/useNotificationController";
import { useNavigationController } from "./hooks/useNavigationController";

// Services (Đường dẫn đúng)
import { deleteSavedRoute } from "./services/savedRouteService";

// Components (Đường dẫn chuẩn)
import { Toolbar } from "./components/Toolbar"; 
import { MapCanvas } from "./components/map/MapCanvas";
import { SearchPanel } from "./components/search/SearchPanel"; 
import { WeatherPanel } from "./components/panels/WeatherPanel";
import { LayerControl } from "./components/panels/LayerControl"; 
import { RoutePanel } from "./components/panels/RoutePanel";
import { FloatingButtons } from "./components/floating/FloatingButtons";
import { SavedRoutesSidebar } from "./components/panels/SavedRoutesSidebar";
import EventsSidebar from "./components/panels/EventsSidebar"; // Bỏ ngoặc nhọn để fix lỗi 2614
import EventDetailSidebar from "./components/panels/EventDetailSidebar";
import POIFeaturedSidebar from "./components/panels/POIFeaturedSidebar";
import NotificationCenter from "./components/notification/NotificationCenter";
import { AlertBanner } from "./components/notification/AlertBanner";
import { ReportTrafficModal } from "./components/modals/ReportTrafficModal";
import { SaveRouteModal } from "./components/modals/SaveRouteModal";
import { ShareRouteModal } from "./components/modals/ShareRouteModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { AIChatbot } from "./components/floating/AIChatbot";
export default function Home() {
  const mapRef = useRef<MapRef>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tab = queryParams.get("tab");
  const userRole = localStorage.getItem("userRole");

  // 1. UI State
  const uiState = useUIStore();

  // 2. Controllers
  const homeController = useHomeController();
  const routeController = useRouteController(mapRef);
  const trafficController = useTrafficController();
  const searchController = useSearchController(routeController);
  const shareController = useShareController(routeController);
  const favoriteController = useFavoriteController();
  const notificationController = useNotificationController();

  //  FIX: useNavigationController (và useVoiceGuidance bên trong nó) đã được
  // viết đầy đủ nhưng CHƯA TỪNG được gọi ở đâu trong toàn bộ ứng dụng, nên
  // hàm speak() không bao giờ chạy => không có tiếng nói khi dẫn đường.
  // userLocation ở đây được cập nhật liên tục (watchPosition) khi isNavigating = true.
  useNavigationController(
    routeController.isNavigating,
    routeController.userLocation,
    routeController.routeData?.steps || [],
  );

  // 3. Effects
  useEffect(() => {
    homeController.fetchInitialData();
  }, []);

  // 4. Các hàm xử lý chung (KHAI BÁO TRƯỚC RETURN)
  const filterCategories = [
    { id: "attractions", label: "Điểm tham quan", icon: Compass },
    { id: "restaurants", label: "Nhà hàng", icon: Utensils },
    { id: "hotels", label: "Khách sạn", icon: Hotel },
    { id: "entertainment", label: "Giải trí", icon: Gamepad2 },
    { id: "museums", label: "Bảo tàng", icon: Landmark },
    { id: "atm", label: "ATM", icon: DollarSign },
  ];

  const handleFilterClick = (filterId: string) => {
    if (uiState.selectedFilter === filterId) {
      uiState.setUIState({ selectedFilter: null });
    } else {
      uiState.setUIState({ selectedFilter: filterId });
      routeController.setDestination(null);
      routeController.setDestinationQuery("");
      routeController.setRouteData(null);
      routeController.setOrigin(null);
      routeController.setOriginQuery("");
    }
  };

  const handleDirectionsClick = (poi: any) => {
    routeController.setDestination({
      lng: poi.longitude,
      lat: poi.latitude,
      label: poi.name || poi.title,
      poi_id: poi.poi_id,
    });
    routeController.setDestinationQuery(poi.name || poi.title);

    // Chỉ lấy GPS nếu user CHƯA chọn điểm xuất phát
    if (!routeController.origin && routeController.userLocation) {
      routeController.setOrigin({
        lng: routeController.userLocation.lng,
        lat: routeController.userLocation.lat,
        label: "Vị trí của bạn",
      });
      routeController.setOriginQuery("Vị trí của bạn");
    }
  };

  return (
    <div className="w-full h-screen relative bg-slate-100 overflow-hidden font-sans select-none">
      <Toolbar />

      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
        <MapCanvas
          mapRef={mapRef}
          routeController={routeController}
          trafficController={trafficController}
          homeController={homeController}
        />
      </div>

      {/* OVERLAY PANELS TRÁI */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between gap-4 pointer-events-none">
        <div className="relative pointer-events-auto shrink-0 flex flex-col gap-2 max-h-[calc(100vh-80px)]">
          {!routeController.isNavigating && (
            <>
              <SearchPanel
                viewMode={uiState.viewMode}
                destination={routeController.destination}
                origin={routeController.origin}
                originQuery={routeController.originQuery}
                destinationQuery={routeController.destinationQuery}
                activeInputField={uiState.activeInputField}
                showSuggestions={uiState.showSuggestions}
                suggestions={searchController.suggestions}
                setSuggestions={searchController.setSuggestions}
                hasSuggestions={searchController.suggestions.length > 0}
                routeData={routeController.routeData}
                travelMode={routeController.travelMode}
                searchContainerRef={searchController.searchContainerRef}
                setDestinationQuery={routeController.setDestinationQuery}
                setOriginQuery={routeController.setOriginQuery}
                setActiveInputField={(val: any) => uiState.setUIState({ activeInputField: val })}
                setShowSuggestions={(val: boolean) => uiState.setUIState({ showSuggestions: val })}
                handleSwapLocations={searchController.handleSwap}
                handleSelectSuggestion={(item: any) => {
                  searchController.handleSuggestionClick(item, uiState.activeInputField);
                  uiState.setUIState({ activeInputField: null, showSuggestions: false });
                }}
                setTravelMode={routeController.setTravelMode}
              />

              <RoutePanel
                routeData={routeController.routeData}
                origin={routeController.origin}
                destination={routeController.destination}
                originQuery={routeController.originQuery}
                destinationQuery={routeController.destinationQuery}
                avoidFlood={routeController.avoidFlood}
                setAvoidFlood={routeController.setAvoidFlood}
                avoidCongestion={routeController.avoidCongestion}
                setAvoidCongestion={routeController.setAvoidCongestion}
                routeAlertMessage={routeController.routeAlertMessage}
                travelMode={routeController.travelMode}
                onStartNavigation={routeController.handleStartNavigation}
                setShowSaveRouteModal={(val: boolean) => uiState.setUIState({ showSaveRouteModal: val })}
                handleShareRoute={shareController.handleShareRoute}
                isSharingRoute={shareController.isSharingRoute}
                favoriteEventIds={favoriteController.favoriteEventIds}
                onToggleEventFavorite={favoriteController.handleFavoriteEventToggle}
                onClearRoute={() => {
                  routeController.setRouteData(null);
                  routeController.setDestination(null);
                  routeController.setOrigin(null);
                  routeController.setOriginQuery("");
                  routeController.setDestinationQuery("");
                  routeController.setRouteAlertMessage(null);
                }}
              />

              {/* Danh sách địa điểm nổi bật */}
              {uiState.viewMode === "pois" && uiState.selectedFilter !== null && (
                <POIFeaturedSidebar
                  pois={homeController.pois}
                  selectedFilter={uiState.selectedFilter}
                  onPOIClick={(poi) => uiState.setUIState({ selectedPOI: poi })}
                  onDirectionsClick={handleDirectionsClick}
                />
              )}

              {/* Danh sách sự kiện */}
              {uiState.viewMode === "events" && !routeController.destination && uiState.showEventsSidebar && (
                <EventsSidebar
                  events={homeController.events || []}
                  categories={homeController.eventCategories || []}
                  onEventClick={(event) => uiState.setUIState({ selectedEvent: event })}
                  onClose={() => uiState.setUIState({ showEventsSidebar: false })}
                />
              )}
            </>
          )}
        </div>
        
        {/* Các nút Filters */}
        {!routeController.isNavigating && uiState.viewMode === "pois" ? (
          <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto max-w-[calc(100vw-540px)]">
            {filterCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = uiState.selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleFilterClick(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                      : "bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 hover:text-blue-600"
                  }`}
                >
                  <Icon size={13} className={isSelected ? "text-white" : "text-slate-500"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Thông báo & Tài khoản */}
        {!routeController.isNavigating && (
          <div className="flex items-center gap-3 shrink-0 pointer-events-auto relative">
            <button
              onClick={() =>
                notificationController.isNotificationCenterOpen
                  ? notificationController.closeNotifications()
                  : notificationController.openNotifications()
              }
              className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all relative"
            >
              <Bell size={18} />
              {notificationController.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white px-0.5">
                  {notificationController.unreadCount > 99 ? "99+" : notificationController.unreadCount}
                </span>
              )}
            </button>

            {userRole === "admin" ? (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="w-[42px] h-[42px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all"
              >
                <Settings size={18} />
              </button>
            ) : (
              <button
                onClick={() => navigate("?tab=profile")}
                className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 overflow-hidden text-slate-600 hover:text-blue-600 transition-all"
              >
                <User size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* AIChatbot khôi phục lại */}
      {!routeController.isNavigating && (
        <AIChatbot 
          origin={routeController.origin}
          setOrigin={routeController.setOrigin}
          setOriginQuery={routeController.setOriginQuery}
          destination={routeController.destination}
          setDestination={routeController.setDestination}
          setDestinationQuery={routeController.setDestinationQuery}
          travelMode={routeController.travelMode}
          setTravelMode={routeController.setTravelMode}
          avoidFlood={routeController.avoidFlood}
          setAvoidFlood={routeController.setAvoidFlood}
          avoidCongestion={routeController.avoidCongestion}
          setAvoidCongestion={routeController.setAvoidCongestion}
          mapRef={mapRef}
          userLocation={routeController.userLocation}
        />
      )}

      {/* CỘT NÚT BÊN PHẢI: GPS + các toggle lớp bản đồ, gộp 1 cột để tránh chồng icon */}
      {!routeController.isNavigating && (
        <div className="absolute right-6 top-[120px] z-20 flex flex-col gap-3 items-end pointer-events-none">
          <FloatingButtons routeController={routeController} />
          <LayerControl />
        </div>
      )}

      {!routeController.isNavigating && uiState.showSavedRoutesSidebar && (
        <SavedRoutesSidebar
          savedRoutes={routeController.savedRoutes}
          onSelectRoute={(route) => {
            if (route.route_data) {
              const coords = JSON.parse(route.route_data);
              routeController.setRouteData({
                totalDistanceKm: route.distance_meters / 1000,
                totalTimeMin: Math.round(route.duration_seconds / 60),
                coordinates: coords,
              });
              routeController.setOrigin({ lng: route.origin_lng, lat: route.origin_lat, label: route.origin_name });
              routeController.setDestination({ lng: route.destination_lng, lat: route.destination_lat, label: route.destination_name });
              uiState.setUIState({ showSavedRoutesSidebar: false });
            }
          }}
          onDeleteRoute={(id, e) => {
            e.stopPropagation();
            deleteSavedRoute(id).then(() => {
              const updatedRoutes = routeController.savedRoutes.filter((r: any) => r.route_id !== id);
              routeController.setSavedRoutes(updatedRoutes);
            }).catch(console.error);
          }}
        />
      )}

      {!routeController.isNavigating && uiState.selectedEvent && (
        <EventDetailSidebar
          event={uiState.selectedEvent}
          isFavorite={favoriteController.favoriteEventIds.has(uiState.selectedEvent.event_id)}
          onFavoriteToggle={async () => { 
  await favoriteController.handleFavoriteEventToggle(uiState.selectedEvent.event_id); 
}}
          onDirectionsClick={() => handleDirectionsClick(uiState.selectedEvent)}
          onClose={() => uiState.setUIState({ selectedEvent: null })}
        />
      )}

      {/* NÚT DỪNG DẪN ĐƯỜNG CHÍNH GIỮA */}
      {routeController.isNavigating && (
        <button
          onClick={routeController.handleStopNavigation}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-7 py-3 rounded-full font-bold shadow-xl z-50">
          🛑 Dừng dẫn đường
        </button>
      )}

      {/* THỜI TIẾT, MODALS & NOTIFICATIONS */}
      <WeatherPanel />

      <ReportTrafficModal
        isOpen={uiState.showReportModal}
        onClose={() => uiState.setUIState({ showReportModal: false })}
        reportFormData={trafficController.reportFormData}
        setReportFormData={trafficController.setReportFormData}
        onSubmit={trafficController.handleSubmitTrafficReport}
      />

      <SaveRouteModal
        isOpen={uiState.showSaveRouteModal}
        onClose={() => uiState.setUIState({ showSaveRouteModal: false })}
        saveRouteName={routeController.saveRouteName}
        setSaveRouteName={routeController.setSaveRouteName}
        onSave={routeController.handleSaveRoute}
        isSavingRoute={routeController.isSavingRoute}
      />

      <ShareRouteModal
        isOpen={uiState.showShareModal}
        onClose={() => uiState.setUIState({ showShareModal: false })}
        shareUrl={shareController.shareUrl}
      />

      <ConfirmModal
        isOpen={uiState.confirmModal.isOpen}
        title={uiState.confirmModal.title}
        message={uiState.confirmModal.message}
        onConfirm={uiState.confirmModal.onConfirm}
        onCancel={uiState.confirmModal.onCancel}
      />

      <NotificationCenter
        isOpen={notificationController.isNotificationCenterOpen}
        onClose={notificationController.closeNotifications}
      />
      
      <AlertBanner
        isOpen={notificationController.isAlertBannerOpen}
        countdown={notificationController.unreadCount || 10}
        alerts={notificationController.alerts || []}
        onClose={notificationController.closeAlertBanner}
      />

      {tab === "profile" && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <ProfilePage
            isOverlay={true}
            onClose={() => navigate("/dashboard")}
            isSharingLocation={shareController.isSharingLocation}
            onToggleShareLocation={async () => shareController.handleToggleShareLocation()}
          />
        </div>
      )}
    </div>
  );
}