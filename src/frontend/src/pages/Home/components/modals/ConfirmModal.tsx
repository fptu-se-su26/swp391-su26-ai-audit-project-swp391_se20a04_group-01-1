import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto">
      <div 
        style={{ animation: "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
        className="bg-white rounded-2xl w-[320px] shadow-2xl p-5 text-center font-sans mx-4"
      >
        <h3 className="font-extrabold text-[15px] text-slate-800 mb-2">{title}</h3>
        <p className="text-[12px] text-slate-500 mb-6 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl text-[12px] hover:bg-slate-200 transition-colors active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-[12px] hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/30 active:scale-95"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};