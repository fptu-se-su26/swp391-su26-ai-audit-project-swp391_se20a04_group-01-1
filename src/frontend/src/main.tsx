import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 2. CHỈ THÊM THẺ BỌC NÀY: */}
    <GoogleOAuthProvider clientId="1017812534494-lm8qg8k6t7iv0c5t43he9qdcvcha77a2.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);

// Đăng ký Service Worker phục vụ chế độ Bản đồ Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${base}sw.js`)
      .then((reg) => {
        console.log('[SW] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] Service Worker registration failed:', err);
      });
  });
}
