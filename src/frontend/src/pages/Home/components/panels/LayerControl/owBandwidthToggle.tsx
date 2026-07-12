import React from 'react';
import { WifiOff } from 'lucide-react';

interface LowBandwidthToggleProps {
  active: boolean;
  onToggle: () => void;
}

/**
 * LowBandwidthToggle
 * Bật/tắt chế độ tiết kiệm băng thông (bản đồ dùng style nhẹ hơn, giảm dữ liệu tải).
 * Tách từ tính năng isLowBandwidth trong Home.tsx bản cũ - trước đây có state nhưng
 * chưa có nút bấm nào trong bản đã tách file.
 */
export const LowBandwidthToggle: React.FC<LowBandwidthToggleProps> = ({ active, onToggle }) => {
  return (
    <div className="group relative pointer-events-auto flex justify-end items-center">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Tiết kiệm băng thông
      </span>
      <button
        onClick={onToggle}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${active ? 'bg-slate-600 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
      >
        <WifiOff size={18} />
      </button>
    </div>
  );
};