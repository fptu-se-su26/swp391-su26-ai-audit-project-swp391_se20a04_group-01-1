import React from "react";
import { Bookmark, X, CloudRain } from "lucide-react";
import { SavedRoute } from "../../../services/savedRouteService";

interface SavedRoutesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  savedRoutes: SavedRoute[];
  onSelectRoute: (route: SavedRoute) => void;
  onDeleteRoute: (routeId: number, e: React.MouseEvent) => void;
}

export const SavedRoutesSidebar: React.FC<SavedRoutesSidebarProps> = ({
  isOpen,
  onClose,
  savedRoutes,
  onSelectRoute,
  onDeleteRoute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-20 top-24 z-20 pointer-events-none animate-fade-in max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:z-40 max-md:w-full max-md:p-0">
      <div className="w-80 max-md:w-full max-md:h-[50vh] max-md:max-h-[50vh] max-md:rounded-t-3xl max-md:rounded-b-none max-md:border-t max-md:border-slate-200/80 max-md:shadow-[0_-8px_30px_rgba(0,0,0,0.12)] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 font-sans text-left flex flex-col max-h-[380px] shrink-0 pointer-events-auto overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
            <Bookmark className="w-5 h-5 text-rose-500 fill-current" /> Lộ trình đã lưu
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none space-y-2.5">
          {savedRoutes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Bookmark size={32} className="text-slate-200 stroke-1" />
              <p className="text-[11px] font-semibold">Chưa có lộ trình nào được lưu</p>
            </div>
          ) : (
            savedRoutes.map((route) => {
              const isFloodRoute = route.is_emergency;
              return (
                <div
                  key={route.route_id}
                  onClick={() => onSelectRoute(route)}
                  className="p-3 bg-slate-50 hover:bg-rose-50/20 border border-slate-100 hover:border-rose-100 rounded-xl cursor-pointer transition-all flex flex-col gap-2 relative group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-xs text-slate-800 line-clamp-1 pr-6 hover:text-rose-600 transition-colors">
                      {route.route_name || "Lộ trình không tên"}
                    </div>
                    <button
                      onClick={(e) => onDeleteRoute(route.route_id, e)}
                      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 w-5 h-5 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="line-clamp-1">
                        <b>Đi từ:</b> {route.origin_name || "Vị trí xuất phát"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      <span className="line-clamp-1">
                        <b>Đến:</b> {route.destination_name || "Điểm đến"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 mt-1 text-[9px] font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                        {route.profile === "driving"
                          ? "Ô tô/Xe máy"
                          : route.profile === "walking"
                            ? "Đi bộ"
                            : "Xe đạp"}
                      </span>
                      {isFloodRoute && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 flex items-center gap-0.5">
                          <CloudRain size={8} /> Tránh ngập
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">
                      {(route.distance_meters / 1000).toFixed(1)} km · {Math.round(route.duration_seconds / 60)} phút
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
