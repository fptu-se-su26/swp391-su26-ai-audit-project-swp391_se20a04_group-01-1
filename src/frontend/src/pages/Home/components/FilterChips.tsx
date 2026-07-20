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
    ? "relative flex md:hidden items-center w-full pointer-events-auto"
    : "relative hidden md:flex items-center max-w-[750px] lg:max-w-[950px] xl:max-w-[1150px] w-full pointer-events-auto shrink-0 self-start mt-0.5";

  return (
    <div className={wrapperClass}>
      {/* Left Chevron */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all z-20"
          title="Cuộn sang trái"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap w-full scroll-smooth py-1 px-1 scrollbar-hiden"
      >
        {filterCategories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onFilterClick(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 h-[42px] rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${isSelected
                ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                : "bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 hover:text-blue-600"
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

      {/* Right Chevron */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all z-20"
          title="Cuộn sang phải"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};
