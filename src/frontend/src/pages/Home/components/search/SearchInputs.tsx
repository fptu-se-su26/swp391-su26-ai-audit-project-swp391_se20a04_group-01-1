import React from 'react';
import { Search } from 'lucide-react';
import { LocationPoint } from '../../hooks/useMapRouting';
import { SearchActions } from './SearchActions';

interface SearchInputsProps {
  destination: LocationPoint | null;
  originQuery: string;
  destinationQuery: string;
  setOriginQuery: (val: string) => void;
  setDestinationQuery: (val: string) => void;
  setActiveInputField: (field: "origin" | "destination" | null) => void;
  setShowSuggestions: (val: boolean) => void;
  handleSwapLocations: () => void;
  hasSuggestions: boolean;
}

export const SearchInputs: React.FC<SearchInputsProps> = ({
  destination,
  originQuery,
  destinationQuery,
  setOriginQuery,
  setDestinationQuery,
  setActiveInputField,
  setShowSuggestions,
  handleSwapLocations,
  hasSuggestions,
}) => {
  if (!destination) {
    return (
      <div className="w-80 h-[42px] bg-white rounded-full shadow-md border border-slate-200/60 flex items-center px-4">
        <Search className="text-blue-500 mr-2 shrink-0" size={18} />
        <input
          type="text"
          placeholder="Tìm kiếm địa điểm tại Đà Nẵng..."
          value={destinationQuery}
          onChange={(e) => {
            setDestinationQuery(e.target.value);
            setActiveInputField("destination");
          }}
          onFocus={() => {
            setActiveInputField("destination");
            if (hasSuggestions) setShowSuggestions(true);
          }}
          className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder-slate-400"
        />
      </div>
    );
  }

  return (
    <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col gap-3 relative z-20">
      <div className="absolute left-[26px] top-[34px] bottom-[34px] w-[2px] border-l-2 border-dashed border-slate-200"></div>

      <div className="flex items-center gap-3 relative">
        <span className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white z-10 flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        </span>
        <input
          type="text"
          placeholder="Chọn điểm đi (Mặc định: Vị trí của bạn)"
          value={originQuery}
          onChange={(e) => {
            setOriginQuery(e.target.value);
            setActiveInputField("origin");
          }}
          onFocus={() => {
            setActiveInputField("origin");
            if (hasSuggestions) setShowSuggestions(true);
          }}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
        />
      </div>

      <div className="flex items-center gap-3 relative">
        <span className="text-red-500 z-10 text-sm font-bold shrink-0">📍</span>
        <input
          type="text"
          placeholder="Chọn điểm đến..."
          value={destinationQuery}
          onChange={(e) => {
            setDestinationQuery(e.target.value);
            setActiveInputField("destination");
          }}
          onFocus={() => {
            setActiveInputField("destination");
            if (hasSuggestions) setShowSuggestions(true);
          }}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
        />
      </div>

      <SearchActions onSwapLocations={handleSwapLocations} />
    </div>
  );
};
