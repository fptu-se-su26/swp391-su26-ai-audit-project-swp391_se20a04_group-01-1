import React from "react";
import { ConfirmModal } from "./ConfirmModal";
import { ReportTrafficModal } from "./ReportTrafficModal";
import { SaveRouteModal } from "./SaveRouteModal";
import { ShareRouteModal } from "./ShareRouteModal";
import AddPOIModal from "./AddPOIModal";

interface ModalsOrchestratorProps {
  // ConfirmModal props
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  // ReportTrafficModal props
  showReportModal: boolean;
  setShowReportModal: (val: boolean) => void;
  reportFormData: {
    type: string;
    title: string;
    description: string;
    location: string;
    latitude: number;
    longitude: number;
    severity: string;
  };
  setReportFormData: React.Dispatch<
    React.SetStateAction<{
      type: string;
      title: string;
      description: string;
      location: string;
      latitude: number;
      longitude: number;
      severity: string;
    }>
  >;
  handleSubmitTrafficReport: (e: React.FormEvent) => Promise<void>;

  // SaveRouteModal props
  showSaveRouteModal: boolean;
  setShowSaveRouteModal: (val: boolean) => void;
  saveRouteName: string;
  setSaveRouteName: (val: string) => void;
  handleSaveRoute: () => Promise<void>;
  isSavingRoute: boolean;
  isDuplicateSavedRoute?: boolean;

  // ShareRouteModal props
  showShareModal: boolean;
  setShowShareModal: (val: boolean) => void;
  shareUrl: string;

  // AddPOIModal props
  showAddPOIModal: boolean;
  setShowAddPOIModal: (val: boolean) => void;
  pendingPOILocation: { lng: number; lat: number } | null;
  setPendingPOILocation: (val: { lng: number; lat: number } | null) => void;
  setIsAddingPOI: (val: boolean) => void;
}

export const ModalsOrchestrator: React.FC<ModalsOrchestratorProps> = ({
  confirmModal,
  showReportModal,
  setShowReportModal,
  reportFormData,
  setReportFormData,
  handleSubmitTrafficReport,
  showSaveRouteModal,
  setShowSaveRouteModal,
  saveRouteName,
  setSaveRouteName,
  handleSaveRoute,
  isSavingRoute,
  isDuplicateSavedRoute,
  showShareModal,
  setShowShareModal,
  shareUrl,
  showAddPOIModal,
  setShowAddPOIModal,
  pendingPOILocation,
  setPendingPOILocation,
  setIsAddingPOI,
}) => {
  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
      />

      <ReportTrafficModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={reportFormData.title}
        onChangeTitle={(val) =>
          setReportFormData({ ...reportFormData, title: val })
        }
        description={reportFormData.description}
        onChangeDescription={(val) =>
          setReportFormData({ ...reportFormData, description: val })
        }
        location={reportFormData.location}
        onChangeLocation={(val) =>
          setReportFormData({ ...reportFormData, location: val })
        }
        onSubmit={handleSubmitTrafficReport}
      />

      <SaveRouteModal
        isOpen={showSaveRouteModal}
        onClose={() => setShowSaveRouteModal(false)}
        routeName={saveRouteName}
        onChangeRouteName={setSaveRouteName}
        onSubmit={handleSaveRoute}
        isLoading={isSavingRoute}
        isDuplicate={isDuplicateSavedRoute}
      />

      <ShareRouteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
      />

      {showAddPOIModal && pendingPOILocation && (
        <AddPOIModal
          location={pendingPOILocation}
          onClose={() => setShowAddPOIModal(false)}
          onSubmitSuccess={() => {
            setShowAddPOIModal(false);
            setIsAddingPOI(false);
            setPendingPOILocation(null);
          }}
        />
      )}
    </>
  );
};
