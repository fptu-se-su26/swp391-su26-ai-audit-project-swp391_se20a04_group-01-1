import { useState, useEffect } from "react";
import { poiAPI } from "../../../services/api";
import { POIData } from "../components/POIPopup";

export const usePOIState = () => {
  const [pois, setPois] = useState<POIData[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [pendingPOILocation, setPendingPOILocation] = useState<{ lng: number; lat: number } | null>(null);
  const [showAddPOIModal, setShowAddPOIModal] = useState(false);

  const fetchPOIs = async () => {
    try {
      const response = await poiAPI.getAllPOIs();
      if (response.data && response.data.data) {
        setPois(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải POIs:", error);
    }
  };

  useEffect(() => {
    fetchPOIs();
  }, []);

  return {
    pois,
    setPois,
    selectedPOI,
    setSelectedPOI,
    selectedFilter,
    setSelectedFilter,
    isAddingPOI,
    setIsAddingPOI,
    pendingPOILocation,
    setPendingPOILocation,
    showAddPOIModal,
    setShowAddPOIModal,
    fetchPOIs,
  };
};
