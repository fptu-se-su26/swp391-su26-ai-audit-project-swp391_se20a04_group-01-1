import React, { useState, useEffect } from "react";
import { motion, PanInfo } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[];
  initialSnapIndex?: number;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  snapPoints = [25, 50, 90],
  initialSnapIndex = 1,
  children,
}) => {
  const sortedSnaps = [...snapPoints].sort((a, b) => a - b);
  const [snapIndex, setSnapIndex] = useState(
    Math.min(initialSnapIndex, sortedSnaps.length - 1),
  );
  const [viewportH, setViewportH] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  useEffect(() => {
    const handleResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const containerHeightPx = viewportH;
  const currentSnapVh = sortedSnaps[snapIndex];
  const hiddenPx = containerHeightPx - (containerHeightPx * currentSnapVh) / 100;

  useEffect(() => {
    if (!isOpen) {
      setSnapIndex(0); 
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const endY = info.point.y;
    const draggedVh = 100 - (endY / containerHeightPx) * 100;

    if (draggedVh < sortedSnaps[0] - 10 || (info.velocity.y > 800 && snapIndex === 0)) {
      onClose();
      return;
    }

    let nearestIndex = 0;
    let minDiff = Infinity;
    sortedSnaps.forEach((snap, idx) => {
      const diff = Math.abs(snap - draggedVh);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = idx;
      }
    });

    if (info.velocity.y > 600 && nearestIndex > 0) {
      nearestIndex -= 1;
    } else if (info.velocity.y < -600 && nearestIndex < sortedSnaps.length - 1) {
      nearestIndex += 1;
    }

    setSnapIndex(nearestIndex);
  };

  return (
    <motion.div
      className="fixed left-0 right-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-2xl flex flex-col"
      style={{ height: containerHeightPx, touchAction: "none" }}
      initial={{ y: containerHeightPx }}
      animate={{ y: hiddenPx }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: containerHeightPx }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full flex justify-center items-center h-8 shrink-0 cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 overscroll-contain">
        {children}
      </div>
    </motion.div>
  );
};