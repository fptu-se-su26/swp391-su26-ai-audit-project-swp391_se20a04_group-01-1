import React from 'react';
import { X, Share2, Copy } from 'lucide-react';
import { showPremiumToast } from '../../../../utils/toastUtils';

interface ShareRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareRouteModal: React.FC<ShareRouteModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
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
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex justify-between text-white">
          <h3 className="font-extrabold text-sm flex gap-2">
            <Share2 className="w-5 h-5 animate-pulse" /> Chia sẻ lộ trình
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex justify-center items-center"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              readOnly
              type="text"
              value={shareUrl}
              className="flex-1 px-3 py-2 text-[10px] bg-slate-50 rounded-xl border outline-none text-slate-600"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                showPremiumToast("Đã sao chép!", "success");
              }}
              className="px-3 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl flex items-center justify-center text-slate-600"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};