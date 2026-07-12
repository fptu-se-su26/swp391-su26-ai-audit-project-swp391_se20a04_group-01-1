import React from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * FavoriteButton
 * Nút nổi mở nhanh danh sách địa điểm/lộ trình yêu thích đã lưu.
 * Kết nối với useFavoriteController ở tầng Home.tsx.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isOpen, onToggle }) => {
  return (
    <div className="group relative flex justify-end items-center pointer-events-auto">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Địa điểm yêu thích
      </span>
      <button
        onClick={onToggle}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${
          isOpen
            ? 'bg-rose-500 text-white border-rose-600'
            : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
        }`}
      >
        <Heart size={18} className={isOpen ? 'fill-current' : ''} />
      </button>
    </div>
  );
};
