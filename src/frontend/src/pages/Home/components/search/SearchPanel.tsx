import React, { useEffect } from "react";
import { SearchInputs } from "./SearchInputs";
import { SuggestionList } from "./SuggestionList";
import { TravelModeSelector } from "./TravelModeSelector";
import { searchPlaces } from "../../services/searchService";

export const SearchPanel: React.FC<any> = (props) => {
  // Thêm effect để fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (props.originQuery.length > 2 && props.activeInputField === 'origin') {
        try {
          const results = await searchPlaces(props.originQuery);
          props.setSuggestions(results);
        } catch (error) { console.error('Lỗi:', error); }
      } else if (props.destinationQuery.length > 2 && props.activeInputField === 'destination') {
        try {
          const results = await searchPlaces(props.destinationQuery);
          props.setSuggestions(results);
        } catch (error) { console.error('Lỗi:', error); }
      } else {
        props.setSuggestions([]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300); // Debounce
    return () => clearTimeout(timer);
  }, [props.originQuery, props.destinationQuery, props.activeInputField]);

  if (props.viewMode !== "pois" && !props.destination) return null;

  return (
    <div ref={props.searchContainerRef} className="relative flex flex-col gap-2">
      <SearchInputs {...props} />
      {props.showSuggestions && (
        <SuggestionList
          suggestions={props.suggestions}
          onSelectSuggestion={props.handleSelectSuggestion}
        />
      )}
      <TravelModeSelector
        routeData={props.routeData}
        travelMode={props.travelMode}
        setTravelMode={props.setTravelMode}
      />
    </div>
  );
};