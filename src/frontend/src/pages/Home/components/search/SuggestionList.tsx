import React from 'react';

interface SuggestionListProps {
  suggestions: any[];
  onSelectSuggestion: (item: any) => void;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  onSelectSuggestion,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[60]">
      {suggestions.map((item: any) => (
        <button
          key={item.poi_id || item.id}
          onClick={() => onSelectSuggestion(item)}
          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-start gap-2 text-[11px] font-medium text-slate-700 border-b border-slate-50 last:border-b-0"
        >
          <span className="text-slate-400 mt-0.5">📍</span>
          <div>
            <div className="font-bold text-slate-800 line-clamp-1">
              {item.name || item.text_vi || item.text}
            </div>
            <div className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">
              {item.place_name || item.place_name_vi}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};