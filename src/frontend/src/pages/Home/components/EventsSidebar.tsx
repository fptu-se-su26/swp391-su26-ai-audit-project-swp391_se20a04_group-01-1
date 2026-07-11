import React, { useState, useMemo } from "react";
import {
  Search,
  Calendar,
  MapPin,
  X,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react";
import { EventData, getEventStatus } from "./EventsLayer";

interface CategoryData {
  category_id: number;
  name: string;
  icon: string;
  color_code: string;
}

interface EventsSidebarProps {
  events: EventData[];
  categories: CategoryData[];
  onEventClick: (event: EventData) => void;
  onClose: () => void;
  hasRoute?: boolean;
  variant?: "panel" | "sheet";
}

export default function EventsSidebar({
  events,
  categories,
  onEventClick,
  onClose,
  hasRoute = false,
  variant = "panel",
}: EventsSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Lọc danh sách sự kiện
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // 1. Tìm kiếm theo tên hoặc địa điểm
      const matchesSearch =
        evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (evt.location_name &&
          evt.location_name.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Lọc theo category
      const matchesCategory =
        selectedCategory === null || evt.category_id === selectedCategory;

      // 3. Lọc theo tháng
      let matchesMonth = true;
      if (selectedMonth !== null && evt.start_time) {
        const date = new Date(evt.start_time);
        matchesMonth = date.getMonth() + 1 === selectedMonth;
      }

      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [events, searchTerm, selectedCategory, selectedMonth]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Ở chế độ 'sheet', BottomSheet.tsx đã lo phần khung/bo góc/đổ bóng/chiều cao rồi,
  // EventsSidebar chỉ cần chiếm trọn phần thân bên trong.
  const wrapperClass =
    variant === "sheet"
      ? "w-full h-full flex flex-col"
      : `w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 animate-fade-up pointer-events-auto ${
          hasRoute ? "max-h-[calc(100vh-390px)]" : "max-h-[calc(100vh-140px)]"
        }`;

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Calendar size={18} className="animate-pulse" />
          <span className="font-bold text-sm tracking-wide">
            Khám phá Sự kiện
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 shrink-0 bg-slate-50/50">
        {/* Tìm kiếm */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Danh mục */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Danh mục
            </label>
            <div className="relative">
              <select
                value={selectedCategory === null ? "" : selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full pl-2 pr-6 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none cursor-pointer focus:border-indigo-500 appearance-none"
              >
                <option value="">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Tháng */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Theo tháng
            </label>
            <div className="relative">
              <select
                value={selectedMonth === null ? "" : selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full pl-2 pr-6 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none cursor-pointer focus:border-indigo-500 appearance-none"
              >
                <option value="">Tất cả tháng</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách kết quả */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-none bg-slate-50/20">
        <div className="text-[10px] font-bold text-slate-400 pl-1 pb-1">
          KẾT QUẢ ({filteredEvents.length})
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            Không tìm thấy sự kiện nào phù hợp.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const status = getEventStatus(evt.start_time, evt.end_time);
            const categoryColor = evt.category_color || "#6366F1";

            let statusText = "Sắp diễn ra";
            let statusClass = "bg-blue-50 text-blue-600 border-blue-100";

            if (status === "ongoing") {
              statusText = "Đang diễn ra";
              statusClass =
                "bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse-subtle";
            } else if (status === "ended") {
              statusText = "Đã kết thúc";
              statusClass = "bg-slate-100 text-slate-500 border-slate-200";
            }

            // Định dạng ngày hiển thị ngắn gọn
            const eventDate = new Date(evt.start_time);
            const formattedDate = eventDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            });

            return (
              <button
                key={evt.event_id}
                onClick={() => onEventClick(evt)}
                className={`w-full text-left p-2.5 bg-white rounded-xl border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all flex gap-2.5 group relative ${
                  status === "ended" ? "opacity-70 hover:opacity-100" : ""
                }`}
              >
                {/* Left Thumb */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 relative">
                  {evt.thumbnail_url ? (
                    <img
                      src={evt.thumbnail_url}
                      alt={evt.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-xl">{evt.category_icon || "🎆"}</span>
                  )}

                  {/* Ngày tổ chức đè lên góc dưới hình */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5 font-bold">
                    {formattedDate}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {evt.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold truncate">
                      <MapPin size={9} />
                      <span>{evt.location_name}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusClass}`}
                    >
                      {statusText}
                    </span>
                    <span
                      className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {evt.category_name}
                    </span>
                    {evt.is_featured && (
                      <span className="text-[8px] bg-amber-100 text-amber-700 font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                        ★ Nổi bật
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-slate-300 self-center group-hover:text-indigo-400 transition-colors shrink-0"
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
