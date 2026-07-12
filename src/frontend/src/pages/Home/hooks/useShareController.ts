import { useState } from 'react';
import { showPremiumToast } from '../../../utils/toastUtils';
import { useUIStore } from '../../../store/uiStore';
import { createRouteShareLink } from '../services/shareService';

export function useShareController(routeController: any) {
    const [isSharingRoute, setIsSharingRoute] = useState(false);
    const [isSharingLocation, setIsSharingLocation] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const uiState = useUIStore();

    const handleShareRoute = async () => {
        if (!routeController.routeData) {
            showPremiumToast("Chưa có lộ trình nào để chia sẻ!", "warning");
            return;
        }

        setIsSharingRoute(true);
        try {
            const url = await createRouteShareLink(routeController.routeData);
            setShareUrl(url);
            uiState.setUIState({ showShareModal: true });
        } catch (error) {
            showPremiumToast("Không thể tạo link chia sẻ, vui lòng thử lại.", "error");
        } finally {
            setIsSharingRoute(false);
        }
    };

    const handleToggleShareLocation = () => {
        setIsSharingLocation(!isSharingLocation);
        if (!isSharingLocation) {
            showPremiumToast("Đã bật chia sẻ vị trí của bạn!", "success");
        } else {
            showPremiumToast("Đã tắt chia sẻ vị trí.", "success");
        }
    };

    return {
        isSharingRoute,
        isSharingLocation,
        shareUrl,
        handleShareRoute,
        handleToggleShareLocation
    };
}
