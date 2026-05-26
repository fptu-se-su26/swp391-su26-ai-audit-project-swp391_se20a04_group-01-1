import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen/SplashScreen';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import ProfilePage from './pages/Profile/ProfilePage';
import AdminDashboard from './pages/Admin/AdminDashboard'; // ✅ ĐÚNG
import ProtectedRoute from './pages/components/ProtectedRoute';

export default function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <SplashScreen />} />
                <Route path="/login" element={<Login />} />
                
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

                <Route path="/admin/dashboard" element={
                    <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}