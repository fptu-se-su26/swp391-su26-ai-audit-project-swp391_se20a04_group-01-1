import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen/SplashScreen';
import Login from './pages/Login/Login';
import Register from './pages/Login/Register';
import Dashboard from './pages/Home/Home'; // Trang chính sau khi đăng nhập thành công
import AdminDashboard from './pages/Admin/AdminAddEvent';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage/LandingPage';

export default function App() {
    return (
        <Router>
            <Routes>
                {/* 1. Khởi động ứng dụng luôn hiển thị Màn hình chờ (Splash Screen) */}
                <Route path="/" element={<SplashScreen />} />

                {/* 2. Các trang tài khoản công khai */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* 3. Trang giới thiệu Landing Page (Xem riêng tại đường dẫn /landing nếu cần) */}
                <Route path="/landing" element={<LandingPage />} />

                {/* 4. Trang Dashboard của User (Được bảo vệ bằng ProtectedRoute) */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* 5. Trang Dashboard của Admin (Được bảo vệ bằng ProtectedRoute) */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Bắt lỗi đường dẫn linh tinh, tự động đẩy về màn hình chờ ban đầu */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}