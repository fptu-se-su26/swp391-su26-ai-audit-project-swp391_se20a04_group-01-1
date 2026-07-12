import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // ❌ Nếu không có token → redirect login kèm query string hiện tại
    if (!token) {
        const search = window.location.search;
        return <Navigate to={`/login${search}`} replace />;
    }

    //  Nếu yêu cầu role cụ thể mà role không khớp → redirect dashboard
    if (requiredRole && userRole !== requiredRole) {
        console.log('Role check failed:', { required: requiredRole, actual: userRole });
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}