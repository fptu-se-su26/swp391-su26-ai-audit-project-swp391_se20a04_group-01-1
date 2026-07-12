import React from 'react';
import { X, Bookmark } from 'lucide-react';

interface SaveRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  saveRouteName: string;
  setSaveRouteName: (name: string) => void;
  onSave: () => void;
  isSavingRoute: boolean;
}

export const SaveRouteModal: React.FC<SaveRouteModalProps> = ({
  isOpen,
  onClose,
  saveRouteName,
  setSaveRouteName,
  onSave,
  isSavingRoute,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ backgroundColor: "rgba(15, 23, 42, 0.4)" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
    >
      <div
        style={{
          animation: "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mx-4 text-left"
      >
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4 flex justify-between text-white">
          <h3 className="font-extrabold text-sm flex gap-2">
            <Bookmark className="w-5 h-5 fill-current animate-pulse" /> Lưu lộ trình
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex justify-center items-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <input
            required
            type="text"
            placeholder="Tên lộ trình"
            value={saveRouteName}
            onChange={(e) => setSaveRouteName(e.target.value)}
            className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={onSave}
              disabled={isSavingRoute}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingRoute ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};