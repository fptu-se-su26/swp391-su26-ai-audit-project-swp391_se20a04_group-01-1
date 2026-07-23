import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-40 md:hidden pointer-events-auto"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              // If dragged down significantly, close it
              if (info.velocity.y > 300 || info.offset.y > 150) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl border-t border-slate-200/80 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-50 md:hidden flex flex-col pointer-events-auto overflow-hidden text-slate-800"
          >
            {/* Drag Handle & Header */}
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0 border-b border-slate-100">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-3 cursor-grab active:cursor-grabbing" />
              <div className="w-full px-5 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 leading-tight truncate pr-4">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
