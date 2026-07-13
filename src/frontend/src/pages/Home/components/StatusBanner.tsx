import React from "react";

interface StatusBannerProps {
  isOffline: boolean;
  isLowBandwidth: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  isOffline,
  isLowBandwidth,
}) => {
  if (isOffline) {
    return (
      <div
        style={{
          position: "absolute",
          top: "84px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          backgroundColor: "rgba(254, 243, 199, 0.95)",
          border: "1px solid #f59e0b",
          color: "#d97706",
          padding: "8px 24px",
          borderRadius: "30px",
          fontSize: "12px",
          fontWeight: "bold",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backdropFilter: "blur(4px)",
        }}
        className="font-sans"
      >
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
        ⚠️ Mất mạng — Đang ở chế độ Ngoại tuyến khẩn cấp
      </div>
    );
  }

  if (isLowBandwidth) {
    return (
      <div
        style={{
          position: "absolute",
          top: "84px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          backgroundColor: "rgba(239, 246, 255, 0.95)",
          border: "1px solid #3b82f6",
          color: "#1d4ed8",
          padding: "8px 24px",
          borderRadius: "30px",
          fontSize: "12px",
          fontWeight: "bold",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backdropFilter: "blur(4px)",
        }}
        className="font-sans"
      >
        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
        ⚡ Đang kích hoạt chế độ Tiết kiệm băng thông (Low-Bandwidth)
      </div>
    );
  }

  return null;
};
