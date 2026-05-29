import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen/SplashScreen';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import ProfilePage from './pages/Profile/ProfilePage';
import Register from './pages/Login/Register';
import AdminDashboard from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage/LandingPage';
import ForgotPassword from './pages/Login/ForgotPassword';


export default function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <SplashScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/forgot-password" element={<ForgotPassword />} />


                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />

                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />

                {/*     {/* 5. Trang Dashboard của Admin (Được bảo vệ bằng ProtectedRoute) */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Bắt lỗi đường dẫn linh tinh, tự động đẩy về màn hình chờ ban đầu */}
=======
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}
