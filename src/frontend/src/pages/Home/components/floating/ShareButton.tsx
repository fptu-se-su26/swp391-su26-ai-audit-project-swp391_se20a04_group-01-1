import React from 'react';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  isSharingLocation: boolean;
  onToggleShare: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  isSharingLocation,
  onToggleShare,
}) => {
  return (
    <div className="group relative flex justify-end items-center pointer-events-auto">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        {isSharingLocation ? "Đang chia sẻ vị trí" : "Chia sẻ vị trí trực tiếp"}
      </span>
      <button
        onClick={onToggleShare}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${
          isSharingLocation
            ? 'bg-red-500 text-white border-red-600 animate-pulse'
            : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
        }`}
      >
        <Share2 size={18} />
      </button>
    </div>
  );
};
