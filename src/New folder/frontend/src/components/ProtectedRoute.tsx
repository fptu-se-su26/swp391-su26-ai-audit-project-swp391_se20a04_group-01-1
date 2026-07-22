import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token) {
        // Chưa đăng nhập -> Đẩy về trang đăng nhập kèm query string hiện tại
        const search = window.location.search;
        return <Navigate to={`/login${search}`} replace />;
    }

    if (requiredRole && userRole !== requiredRole) {
        // Đăng nhập rồi nhưng không đúng quyền hạn (ví dụ: cần quyền admin nhưng userRole là user)
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
