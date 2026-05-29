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
