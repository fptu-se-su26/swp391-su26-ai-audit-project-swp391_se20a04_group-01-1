import React, { useState, useEffect } from "react";
import { motion, PanInfo } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** % chiều cao viewport cho từng mốc dừng, tăng dần. Mặc định 25/50/90. */
  snapPoints?: number[];
  /** Index (trong snapPoints đã sort tăng dần) sẽ mở ra lúc đầu. Mặc định mốc giữa. */
  initialSnapIndex?: number;
  children: React.ReactNode;
}

export default function BottomSheet({
  isOpen,
  onClose,
  snapPoints = [25, 50, 90],
  initialSnapIndex = 1,
  children,
}: BottomSheetProps) {
  const sortedSnaps = [...snapPoints].sort((a, b) => a - b); // tăng dần: [thấp, vừa, cao]
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

  // Reset về mốc mặc định mỗi lần sheet được mở lại từ đầu
  useEffect(() => {
    if (isOpen)
      setSnapIndex(Math.min(initialSnapIndex, sortedSnaps.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const maxSnapVh = sortedSnaps[sortedSnaps.length - 1];
  const containerHeightPx = (maxSnapVh / 100) * viewportH;
  const currentVh = sortedSnaps[snapIndex];
  // Khoảng cách (px) sheet bị đẩy xuống dưới so với lúc mở tối đa -> dùng làm transform y
  const hiddenPx = ((maxSnapVh - currentVh) / 100) * viewportH;

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Vị trí (tính theo %vh) sau khi kéo xong
    const draggedVh = currentVh - (info.offset.y / viewportH) * 100;

    // Kéo xuống thấp hơn nửa mốc thấp nhất -> coi như người dùng muốn đóng hẳn
    if (draggedVh < sortedSnaps[0] / 2) {
      onClose();
      return;
    }

    // Tìm mốc snap gần vị trí thả tay nhất
    let nearestIndex = 0;
    let minDiff = Infinity;
    sortedSnaps.forEach((snap, idx) => {
      const diff = Math.abs(snap - draggedVh);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = idx;
      }
    });

    // Vuốt đủ nhanh (velocity) thì ưu tiên nhảy hẳn 1 mốc theo hướng vuốt, mượt hơn snap theo vị trí
    if (info.velocity.y > 600 && nearestIndex > 0) {
      nearestIndex -= 1;
    } else if (
      info.velocity.y < -600 &&
      nearestIndex < sortedSnaps.length - 1
    ) {
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
      {/* Tay cầm kéo */}
      <div className="shrink-0 pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
      </div>

      {/* Nội dung cuộn được bên trong, không làm sheet bị kéo theo khi cuộn list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </motion.div>
  );
}
