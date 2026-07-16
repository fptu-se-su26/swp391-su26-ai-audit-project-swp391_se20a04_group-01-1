import { useState, useEffect } from "react";
import { trafficAlertAPI } from "../../../services/api";
import { showPremiumToast } from "../../../utils/toastUtils";

export const useTrafficAlertState = () => {
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const [selectedTrafficAlert, setSelectedTrafficAlert] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    type: "CONGESTION",
    title: "",
    description: "",
    location: "",
    latitude: 16.0544,
    longitude: 108.2022,
    severity: "MEDIUM",
  });

  const fetchTrafficAlerts = async () => {
    try {
      const response = await trafficAlertAPI.getTrafficAlerts();
      if (response.data && response.data.success) {
        setTrafficAlerts(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách cảnh báo giao thông:", error);
    }
  };

  const handleSubmitTrafficReport = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const response = await trafficAlertAPI.createTrafficAlert(reportFormData);
      if (response.data && response.data.success) {
        showPremiumToast(
          "Gửi báo cáo sự cố giao thông thành công! Đang chờ phê duyệt.",
          "success",
        );
        setShowReportModal(false);
        fetchTrafficAlerts();
      } else {
        showPremiumToast(
          response.data.message || "Lỗi gửi báo cáo sự cố.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Lỗi gửi báo cáo sự cố:", error);
      showPremiumToast(
        error.response?.data?.message || "Không thể gửi báo cáo lên hệ thống.",
        "error",
      );
    }
  };

  useEffect(() => {
    fetchTrafficAlerts();
  }, []);

  return {
    trafficAlerts,
    setTrafficAlerts,
    selectedTrafficAlert,
    setSelectedTrafficAlert,
    showReportModal,
    setShowReportModal,
    reportFormData,
    setReportFormData,
    fetchTrafficAlerts,
    handleSubmitTrafficReport,
  };
};
