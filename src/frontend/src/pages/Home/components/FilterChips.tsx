import React, { useRef, useState, useEffect } from "react";
import {
  Compass,
  Utensils,
  Hotel,
  Coffee,
  Fuel,
  Hospital,
  Gamepad2,
  Landmark,
  DollarSign,
  Pill,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface FilterChipsProps {
  selectedFilter: string | null;
  onFilterClick: (id: string) => void;
  isMobile?: boolean;
}

const filterCategories = [
  { id: "attractions", label: "Điểm tham quan", icon: Compass },
  { id: "restaurants", label: "Nhà hàng", icon: Utensils },
  { id: "hotels", label: "Khách sạn", icon: Hotel },
  { id: "cafe", label: "Quán cà phê", icon: Coffee },
  { id: "gas_station", label: "Trạm xăng", icon: Fuel },
  { id: "hospital", label: "Bệnh viện", icon: Hospital },
  { id: "entertainment", label: "Giải trí", icon: Gamepad2 },
  { id: "museums", label: "Bảo tàng", icon: Landmark },
  { id: "atm", label: "ATM", icon: DollarSign },
  { id: "pharmacy", label: "Nhà thuốc", icon: Pill },
  { id: "shopping", label: "Khu mua sắm", icon: ShoppingBag },
];

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedFilter,
  onFilterClick,
  isMobile = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [selectedFilter]);

  const handleScroll = () => {
    checkScroll();
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const wrapperClass = isMobile
    ? "relative flex md:hidden items-center w-full min-w-0 pointer-events-auto overflow-hidden rounded-full"
    : "relative hidden md:flex flex-1 min-w-0 items-center pointer-events-auto self-start mt-0.5 overflow-hidden";
  return (
    <div className={wrapperClass}>
      {showLeftArrow && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-white via-white/95 to-transparent"
          aria-hidden="true"
        />
      )}

      {showLeftArrow && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg active:scale-95"
          aria-label="Xem các danh mục phía trước"
        >
          <ChevronLeft size={17} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`relative z-0 flex items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-none flex-nowrap w-full min-w-0 scroll-smooth ${
          isMobile ? "pl-4 pr-14 scroll-px-4" : "px-1 pr-12"
        }`}
      >
        {filterCategories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedFilter === cat.id;

          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => onFilterClick(cat.id)}
              className={`flex h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[11px] font-bold shadow-md transition-all ${
                isSelected
                  ? "border-blue-700 bg-blue-600 text-white"
                  : "border-slate-200/60 bg-white text-slate-700"
              }`}
            >
              <Icon
                size={13}
                className={isSelected ? "text-white" : "text-slate-500"}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {showRightArrow && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-l from-white via-white/95 via-50% to-transparent"
          aria-hidden="true"
        />
      )}

      {showRightArrow && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg active:scale-95"
          aria-label="Xem thêm danh mục địa điểm"
        >
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
};
