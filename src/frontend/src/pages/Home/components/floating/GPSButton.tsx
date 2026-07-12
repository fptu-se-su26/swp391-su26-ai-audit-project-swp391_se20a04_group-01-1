import React from 'react';
import { Navigation } from 'lucide-react';

interface GPSButtonProps {
  onGetCurrentLocation: () => void;
}

export const GPSButton: React.FC<GPSButtonProps> = ({ onGetCurrentLocation }) => {
  return (
    <div className="group relative flex justify-end items-center pointer-events-auto">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Vị trí của tôi
      </span>
      <button
        onClick={onGetCurrentLocation}
        className="w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50 transition-all active:scale-95"
      >
        <Navigation size={18} />
      </button>
    </div>
  );
};