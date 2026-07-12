import React from 'react';
import { CloudSun } from 'lucide-react';
import { useUIStore } from '../../../../../store/uiStore';
import { FloodToggle } from './FloodToggle';
import { TrafficToggle } from './TrafficToggle';
import { EventToggle } from './EventToggle';
import { POIToggle } from './POIToggle';
import { LowBandwidthToggle } from './owBandwidthToggle';

/**
 * LayerControl
 * Compose các nút bật/tắt lớp bản đồ: Địa điểm/Sự kiện, Giao thông, Vùng ngập,
 * Thời tiết, Tiết kiệm băng thông. Thứ tự khớp với thiết kế: Layers -> Traffic ->
 * Flood -> Weather -> LowBandwidth -> Event.
 */
export const LayerControl: React.FC = () => {
  const { mapControls, setMapControls, viewMode, showEventsSidebar, setUIState, isWeatherExpanded, isLowBandwidth } = useUIStore();

  const toggleMapControl = (controlName: "flood" | "traffic" | "layers") => {
    setMapControls({ ...mapControls, [controlName]: !mapControls[controlName] });
  };

  // Bấm nút Địa điểm (POIs): toggle chế độ xem POIs
  // Nếu đang bật POI thì tắt hết, ngược lại thì bật chế độ xem POIs lên
  const handleSelectPOIMode = () => {
    if (viewMode === "pois") {
      // Tắt POI mode - chuyển sang events mode nhưng đóng sidebar
      setUIState({ 
        viewMode: "events",
        selectedFilter: null, 
        selectedPOI: null,
        showEventsSidebar: false
      });
    } else {
      // Bật POI mode
      setUIState({
        viewMode: "pois",
        showEventsSidebar: false,
        selectedPOI: null,
        selectedEvent: null,
      });
    }
  };

  // Bấm nút Sự kiện: nếu sidebar sự kiện đang mở thì đóng lại (quay về chế độ POIs mặc định),
  // ngược lại thì bật chế độ xem Sự kiện lên.
  const handleSelectEventsMode = () => {
    if (viewMode === "events" && showEventsSidebar) {
      setUIState({ viewMode: "pois", showEventsSidebar: false, selectedEvent: null });
    } else {
      setUIState({
        viewMode: "events",
        showEventsSidebar: true,
        selectedPOI: null,
        selectedEvent: null,
      });
    }
  };

  const toggleLowBandwidth = () => {
    const nextState = !isLowBandwidth;
    setUIState({ isLowBandwidth: nextState });
    localStorage.setItem("low_bandwidth_mode", nextState.toString());
  };

  return (
    <>
      <POIToggle active={viewMode === 'pois'} onSelect={handleSelectPOIMode} />

      <TrafficToggle active={mapControls.traffic} onToggle={() => toggleMapControl('traffic')} />

      <FloodToggle active={mapControls.flood} onToggle={() => toggleMapControl('flood')} />

      <div className="group relative pointer-events-auto flex justify-end items-center">
        <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
          Thời tiết
        </span>
        <button
          onClick={() => {
            const nextState = !isWeatherExpanded;
            setUIState({ isWeatherExpanded: nextState });
            localStorage.setItem("weather_widget_collapsed", (!nextState).toString());
          }}
          className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${isWeatherExpanded ? 'bg-sky-500 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
        >
          <CloudSun size={18} />
        </button>
      </div>

      <LowBandwidthToggle active={isLowBandwidth} onToggle={toggleLowBandwidth} />

      <EventToggle active={viewMode === 'events' && showEventsSidebar} onSelect={handleSelectEventsMode} />
    </>
  );
};