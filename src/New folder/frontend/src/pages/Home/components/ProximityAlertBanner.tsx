import React, { useEffect } from "react";
import { ProximityEvent } from "../hooks/useProximityAlerts";

interface Props {
  alert: ProximityEvent | null;
  onDismiss: (id: string) => void;
  onReroute: () => void; // Hàm gọi để tính lại đường đi
}

export const ProximityAlertBanner: React.FC<Props> = ({ alert, onDismiss, onReroute }) => {
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => onDismiss(alert.id), 8000);
    return () => clearTimeout(t);
  }, [alert, onDismiss]);

  if (!alert) return null;

  // Render icon theo loại cảnh báo
  const getIcon = () => {
    if (alert.kind === "flood") return "🌊";
    if (alert.kind === "closure") return "🚫";
    return "⚠️";
  };

  return (
    // pointer-events-none đảm bảo map bên dưới vẫn click được
    <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      {/* pointer-events-auto để nút bấm trên banner hoạt động */}
      <div className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 w-full max-w-md pointer-events-auto overflow-hidden animate-slide-down">
        <div className="p-4 flex items-start gap-3">
          <div className="text-2xl">{getIcon()}</div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900">{alert.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{alert.message}</p>
            {alert.onRoute && (
              <span className="inline-block mt-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                Nằm trên tuyến đường của bạn
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-2 flex justify-end gap-2 border-t">
          <button 
            onClick={() => onDismiss(alert.id)}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            Bỏ qua
          </button>
          {alert.onRoute && (
            <button 
              onClick={() => {
                onReroute();
                onDismiss(alert.id);
              }}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm"
            >
              Xem tuyến khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
};