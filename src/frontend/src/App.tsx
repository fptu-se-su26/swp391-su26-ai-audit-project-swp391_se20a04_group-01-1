import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen/SplashScreen';
import MapIntroducePage from './pages/MapIntroducePage/MapIntroducePage';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import ProfilePage from './pages/Profile/ProfilePage';
import Register from './pages/Login/Register';
import VerifyOTP from './pages/Login/VerifyOTP';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage/LandingPage';
import ForgotPassword from './pages/Login/ForgotPassword';
import Verify2FA from './pages/Auth/Verify2FA'; 
import TrackRoutePage from './pages/TrackRoute/TrackRoutePage';
import { Toaster } from 'react-hot-toast';
import { OfflineIndicator } from './pages/Home/components/OfflineIndicator';

export default function App() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    return (
        <Router basename={import.meta.env.BASE_URL}>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <Routes>
                <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <MapIntroducePage />} />
                <Route path="/splash" element={<SplashScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />

                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* 2. THÊM ĐOẠN ROUTE NÀY VÀO ĐÂY */}
                <Route path="/verify-2fa" element={<Verify2FA />} />
                
                <Route path="/track/:shareToken" element={<TrackRoutePage />} />

                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />

                <Route path="/profile" element={
    <ProtectedRoute>
        {userRole === 'admin' ? (
            <Navigate to="/admin/dashboard?tab=settings" replace />
        ) : (
            <ProfilePage />
        )}
    </ProtectedRoute>
} />

                {/* {/* 5. Trang Dashboard của Admin (Được bảo vệ bằng ProtectedRoute) */}
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
            
            {/* ← THÊM COMPONENT NÀY */}
            <OfflineIndicator />
        </Router>
    );
}
