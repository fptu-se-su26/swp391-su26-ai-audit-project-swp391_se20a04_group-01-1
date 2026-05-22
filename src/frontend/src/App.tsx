import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ĐÃ SỬA ĐƯỜNG DẪN IMPORT CHUẨN THEO ẢNH CÂY THƯ MỤC CỦA BẠN
import Login from './pages/Login/Login';
import Register from './pages/Login/Register';
import ForgotPassword from './pages/Login/ForgotPassword';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen w-full bg-gray-100 font-sans">
        <Routes>
          {/* Điều hướng mặc định: Mở web lên sẽ tự động chuyển vào trang Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Các tuyến đường chính */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>
    </Router>
  );
}