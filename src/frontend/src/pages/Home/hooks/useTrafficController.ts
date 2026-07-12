import { useState, useEffect } from 'react';
import { showPremiumToast } from '../../../utils/toastUtils';
import { TrafficAlert, TrafficReportFormData } from '../types/traffic';
import { submitTrafficReport, fetchTrafficAlerts } from '../services/trafficService';

export function useTrafficController() {
    const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
    const [reportFormData, setReportFormData] = useState<TrafficReportFormData>({ title: '', description: '', location: '' });

    useEffect(() => {
        // Lấy dữ liệu kẹt xe/tai nạn từ Backend (GET /api/traffic-alerts)
        (async () => {
            try {
                const alerts = await fetchTrafficAlerts();
                setTrafficAlerts(alerts);
            } catch (error) {
                console.error("Lỗi khi lấy cảnh báo giao thông:", error);
            }
        })();
    }, []);

    const handleSubmitTrafficReport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reportFormData.title || !reportFormData.location) {
            showPremiumToast("Vui lòng điền đủ thông tin bắt buộc!", "error");
            return;
        }

        try {
            await submitTrafficReport(reportFormData);
            showPremiumToast("Đã gửi báo cáo giao thông thành công. Cảm ơn bạn!", "success");
            setReportFormData({ title: '', description: '', location: '' });
        } catch (error) {
            showPremiumToast("Gửi báo cáo thất bại, vui lòng thử lại.", "error");
        }
    };

    return {
        trafficAlerts,
        reportFormData,
        setReportFormData,
        handleSubmitTrafficReport
    };
}