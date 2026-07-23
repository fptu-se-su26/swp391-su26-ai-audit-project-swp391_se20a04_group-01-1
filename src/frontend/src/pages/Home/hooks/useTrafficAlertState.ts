import { useState, useEffect, useRef } from "react";
import { trafficAlertAPI } from "../../../services/api";
import { showPremiumToast } from "../../../utils/toastUtils";

export const useTrafficAlertState = () => {
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const [selectedTrafficAlert, setSelectedTrafficAlert] = useState<any | null>(
    null,
  );
  const [trafficVoteLoading, setTrafficVoteLoading] = useState(false);
  // Khóa đồng bộ (không phụ thuộc render) để chặn double-click/double-submit
  // ngay lập tức, tránh khoảng hở giữa lúc bấm và lúc React re-render nút disabled.
  const trafficVoteLockRef = useRef(false);
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

  const fetchTrafficAlertVotes = async (alertId: number) => {
    try {
      const response = await trafficAlertAPI.getTrafficAlertVotes(alertId);

      if (response.data?.success) {
        const voteData = response.data.data;

        setTrafficAlerts((previousAlerts) =>
          previousAlerts.map((alert) =>
            Number(alert.id ?? alert.alert_id) === Number(alertId)
              ? {
                  ...alert,
                  ...voteData,
                }
              : alert,
          ),
        );

        setSelectedTrafficAlert((currentAlert: any) => {
          if (!currentAlert) {
            return currentAlert;
          }

          const currentId = currentAlert.id ?? currentAlert.alert_id;

          if (Number(currentId) !== Number(alertId)) {
            return currentAlert;
          }

          return {
            ...currentAlert,
            ...voteData,
          };
        });
      }
    } catch (error) {
      console.error("Lỗi tải thông tin vote cảnh báo giao thông:", error);
    }
  };

  const handleVoteTrafficAlert = async (
    alertId: number,
    voteType: "LIKE" | "DISLIKE",
  ) => {
    if (trafficVoteLoading || trafficVoteLockRef.current) {
      return;
    }
    trafficVoteLockRef.current = true;

    try {
      setTrafficVoteLoading(true);

      const response = await trafficAlertAPI.voteTrafficAlert(
        alertId,
        voteType,
      );

      if (!response.data?.success) {
        showPremiumToast(
          response.data?.message || "Không thể gửi đánh giá.",
          "error",
        );
        return;
      }

      const voteData = response.data.data;

      console.log("KẾT QUẢ VOTE TỪ BACKEND:", {
        alertId,
        clickedVote: voteType,
        voteData,
      });

      setTrafficAlerts((previousAlerts) =>
        previousAlerts.map((alert) => {
          const currentAlertId = alert.id ?? alert.alert_id;

          if (Number(currentAlertId) !== Number(alertId)) {
            return alert;
          }

          return {
            ...alert,
            like_count: voteData.like_count,
            dislike_count: voteData.dislike_count,
            my_vote: voteData.my_vote,
            is_active: voteData.is_active,
            expire_at: voteData.expire_at,
            last_verified_at: voteData.last_verified_at,
          };
        }),
      );

      setSelectedTrafficAlert((currentAlert: any) => {
        if (!currentAlert) {
          return currentAlert;
        }

        const currentAlertId = currentAlert.id ?? currentAlert.alert_id;

        if (Number(currentAlertId) !== Number(alertId)) {
          return currentAlert;
        }

        return {
          ...currentAlert,
          like_count: voteData.like_count,
          dislike_count: voteData.dislike_count,
          my_vote: voteData.my_vote,
          is_active: voteData.is_active,
          expire_at: voteData.expire_at,
          last_verified_at: voteData.last_verified_at,
        };
      });
      showPremiumToast(
        voteType === "LIKE"
          ? "Bạn đã xác nhận cảnh báo này vẫn còn đúng."
          : "Bạn đã báo cảnh báo này không còn chính xác.",
        "success",
      );

      if (voteData?.is_active === false) {
        setSelectedTrafficAlert(null);
        await fetchTrafficAlerts();
      }
    } catch (error: any) {
      console.error("Lỗi vote cảnh báo giao thông:", error);

      showPremiumToast(
        error.response?.data?.message ||
          "Không thể đánh giá cảnh báo giao thông.",
        "error",
      );
    } finally {
      trafficVoteLockRef.current = false;
      setTrafficVoteLoading(false);
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
    trafficVoteLoading,
    fetchTrafficAlertVotes,
    handleVoteTrafficAlert,
  };
};
