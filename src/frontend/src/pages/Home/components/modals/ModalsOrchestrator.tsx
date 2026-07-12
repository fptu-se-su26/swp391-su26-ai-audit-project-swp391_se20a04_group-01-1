import React from 'react';
import { useUIStore } from '../../../../store/uiStore';
import { ReportTrafficModal } from './ReportTrafficModal';
import { SaveRouteModal } from './SaveRouteModal';
import { ShareRouteModal } from './ShareRouteModal';
import { ConfirmModal } from './ConfirmModal';

interface ModalsOrchestratorProps {
  // Report Traffic
  reportFormData: any;
  setReportFormData: (data: any) => void;
  handleSubmitTrafficReport: (e: React.FormEvent) => void;
  
  // Save Route
  saveRouteName: string;
  setSaveRouteName: (name: string) => void;
  handleSaveRoute: () => void;
  isSavingRoute: boolean;
  
  // Share Route
  shareUrl: string;
}

export const ModalsOrchestrator: React.FC<ModalsOrchestratorProps> = ({
  reportFormData, setReportFormData, handleSubmitTrafficReport,
  saveRouteName, setSaveRouteName, handleSaveRoute, isSavingRoute,
  shareUrl
}) => {
  const uiState = useUIStore();

  return (
    <>
      <ReportTrafficModal 
        isOpen={uiState.showReportModal} 
        onClose={() => uiState.setUIState({ showReportModal: false })} 
        reportFormData={reportFormData}
        setReportFormData={setReportFormData}
        onSubmit={handleSubmitTrafficReport}
      />

      <SaveRouteModal 
        isOpen={uiState.showSaveRouteModal} 
        onClose={() => uiState.setUIState({ showSaveRouteModal: false })} 
        saveRouteName={saveRouteName}
        setSaveRouteName={setSaveRouteName}
        onSave={handleSaveRoute}
        isSavingRoute={isSavingRoute}
      />

      <ShareRouteModal 
        isOpen={uiState.showShareModal} 
        onClose={() => uiState.setUIState({ showShareModal: false })} 
        shareUrl={shareUrl}
      />

      <ConfirmModal 
        isOpen={uiState.confirmModal.isOpen} 
        title={uiState.confirmModal.title} 
        message={uiState.confirmModal.message} 
        onConfirm={uiState.confirmModal.onConfirm} 
        onCancel={uiState.confirmModal.onCancel} 
      />
    </>
  );
};