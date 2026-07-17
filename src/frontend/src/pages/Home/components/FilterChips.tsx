import React from "react";
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
];

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedFilter,
  onFilterClick,
  isMobile = false,
}) => {
  const containerClass = isMobile
    ? "flex md:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto w-full"
    : "hidden md:flex items-center justify-start gap-2 overflow-x-auto flex-nowrap flex-1 self-start pointer-events-auto scrollbar-none pb-2";

  return (
    <div className={containerClass}>
      {filterCategories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedFilter === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onFilterClick(cat.id)}
            className={`flex items-center gap-1.5 px-3.5 h-[42px] rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${
              isSelected
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
  );
};
