import React from 'react';
import { useUIStore } from '../../../../../store/uiStore';

// THÊM NGOẶC NHỌN {} CHO CÁC NAMED IMPORTS
import { FloodPopup } from './FloodPopup';
import { TrafficPopup } from './TrafficPopup';
import { EventRoadPopup } from './EventRoadPopup';
import { PendingDestinationPopup } from './PendingDestinationPopup';

interface MapPopupsProps {
  routeController: any;
  isRoadRestrictionActive: any;
}

export const MapPopups: React.FC<MapPopupsProps> = ({ 
  routeController, 
  isRoadRestrictionActive 
}) => {
  const uiState = useUIStore();

  return (
    <>
      {/* 1. Popup Vùng ngập lụt */}
      {uiState.selectedFloodZone && (
        <FloodPopup 
          floodZone={uiState.selectedFloodZone} 
          onClose={() => uiState.setUIState({ selectedFloodZone: null })} 
        />
      )}

      {/* 2. Popup Cảnh báo Giao thông (Kẹt xe, tai nạn...) */}
      {uiState.selectedTrafficAlert && (
        <TrafficPopup 
          alert={uiState.selectedTrafficAlert} 
          onClose={() => uiState.setUIState({ selectedTrafficAlert: null })} 
        />
      )}

      {/* 3. Popup Cấm đường / Sự kiện giao thông */}
      {uiState.selectedRoadPopup && (
        <EventRoadPopup 
          road={uiState.selectedRoadPopup} 
          isRoadRestrictionActive={isRoadRestrictionActive}
          onClose={() => uiState.setUIState({ selectedRoadPopup: null })} 
        />
      )}

      {/* 4. Popup Điểm đến đang chờ */}
      {uiState.pendingDestination && (
        <PendingDestinationPopup 
          pendingDestination={uiState.pendingDestination}  
          routeController={routeController}
          onClose={() => uiState.setUIState({ pendingDestination: null })} 
        />
      )}
    </>
  );
};