import React from "react";
import { X, AlertTriangle } from "lucide-react";

interface ReportTrafficModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onChangeTitle: (val: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  location: string;
  onChangeLocation: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ReportTrafficModal: React.FC<ReportTrafficModalProps> = ({
  isOpen,
  onClose,
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  location,
  onChangeLocation,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ animation: "fadeIn 250ms ease-out forwards" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
    >
      <div
        style={{
          animation: "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden mx-4"
      >
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between text-white">
          <h3 className="font-extrabold text-sm flex items-center gap-2 tracking-wide uppercase">
            <AlertTriangle className="w-5 h-5 animate-pulse" /> Báo cáo sự cố
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 font-sans text-left">
          <input
            required
            type="text"
            placeholder="Mô tả sự cố..."
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
          <textarea
            rows={2}
            placeholder="Chi tiết..."
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none outline-none"
          />
          <input
            required
            type="text"
            value={location}
            onChange={(e) => onChangeLocation(e.target.value)}
            className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all shadow-md shadow-orange-500/10"
            >
              Gửi báo cáo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
