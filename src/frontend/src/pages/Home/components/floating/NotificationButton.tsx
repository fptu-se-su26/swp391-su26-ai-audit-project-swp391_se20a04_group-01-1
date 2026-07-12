import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationButtonProps {
  hasUnread?: boolean;
  onOpen: () => void;
}

/**
 * NotificationButton
 * Nút nổi mở NotificationCenter. Kết nối với useNotificationController ở tầng Home.tsx.
 */
export const NotificationButton: React.FC<NotificationButtonProps> = ({ hasUnread, onOpen }) => {
  return (
    <div className="group relative flex justify-end items-center pointer-events-auto">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Thông báo
      </span>
      <button
        onClick={onOpen}
        className="relative w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50 transition-all active:scale-95"
      >
        <Bell size={18} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
};
