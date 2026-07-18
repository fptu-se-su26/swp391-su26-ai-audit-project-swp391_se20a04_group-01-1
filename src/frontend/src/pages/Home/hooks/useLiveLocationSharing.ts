import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { showPremiumToast } from "../../../utils/toastUtils";

export const useLiveLocationSharing = () => {
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [liveShareToken, setLiveShareToken] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const shareWatchId = useRef<number | null>(null);

  // Cleanup socket connection and watchPosition on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (shareWatchId.current !== null) {
        navigator.geolocation.clearWatch(shareWatchId.current);
      }
    };
  }, []);

  // Watch position and emit updates when sharing is active
  useEffect(() => {
    if (!isSharingLocation || !liveShareToken) {
      if (shareWatchId.current !== null) {
        navigator.geolocation.clearWatch(shareWatchId.current);
        shareWatchId.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      showPremiumToast("Thiết bị không hỗ trợ định vị GPS.", "error");
      setIsSharingLocation(false);
      return;
    }

    shareWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("update-location", {
            shareToken: liveShareToken,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
          });
        }
      },
      (err) => console.error("❌ [Share GPS] Lỗi định vị:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (shareWatchId.current !== null) {
        navigator.geolocation.clearWatch(shareWatchId.current);
        shareWatchId.current = null;
      }
    };
  }, [isSharingLocation, liveShareToken]);

  const handleToggleShareLocation = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast(
        "Vui lòng đăng nhập để sử dụng tính năng chia sẻ vị trí.",
        "error"
      );
      return;
    }

    if (isSharingLocation) {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:5001";
        const res = await fetch(`${apiUrl}/api/location/stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ share_token: liveShareToken }),
        });
        const data = await res.json();
        if (data.success) {
          setIsSharingLocation(false);
          setLiveShareToken(null);
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          showPremiumToast("Đã dừng chia sẻ vị trí trực tiếp.", "success");
        } else {
          showPremiumToast(data.message || "Lỗi dừng chia sẻ.", "error");
        }
      } catch (err) {
        showPremiumToast("Lỗi kết nối máy chủ.", "error");
      }
    } else {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:5001";
        const res = await fetch(`${apiUrl}/api/location/share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success && data.share_token) {
          const shareToken = data.share_token;
          setLiveShareToken(shareToken);
          socketRef.current = io(apiUrl);
          socketRef.current.on("connect", () => {
            socketRef.current.emit("join-session", { shareToken });
          });
          setIsSharingLocation(true);
          const shareLink = `${window.location.origin}/track/${shareToken}`;
          navigator.clipboard.writeText(shareLink);
          showPremiumToast(
            `Đã bật chia sẻ vị trí trực tiếp! Link theo dõi đã được sao chép: ${shareLink}`,
            "success",
            6000
          );
        } else {
          showPremiumToast(
            data.message || "Lỗi khởi tạo chia sẻ vị trí.",
            "error"
          );
        }
      } catch (err) {
        showPremiumToast("Lỗi kết nối máy chủ.", "error");
      }
    }
  };

  return {
    isSharingLocation,
    liveShareToken,
    handleToggleShareLocation,
  };
};
