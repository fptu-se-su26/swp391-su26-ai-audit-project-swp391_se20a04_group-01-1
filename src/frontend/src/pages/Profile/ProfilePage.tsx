import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';
import {
    Navigation, LogOut, User, Mail, Shield, Calendar, Clock,
    Settings, Heart, HelpCircle, Edit2, Lock, Bell, History,
    Bookmark, MapPin, Trash2, ArrowRight, CheckCircle2, Star
} from 'lucide-react';
import { savedRouteService, SavedRoute } from '../../services/savedRouteService';
import { usePreferenceStore } from '../../store/preferenceStore';
import { useFavoritePoiStore } from '../../store/favoritePoiStore';
import { showPremiumToast } from '../../utils/toastUtils';

interface UserData {
    user_id: number;
    username: string;
    email: string;
    role: string;
    created_at?: string;
    last_login_at?: string;
    has_password?: boolean;
    avatar_url?: string;
}

interface ProfilePageProps {
    isOverlay?: boolean;
    onClose?: () => void;
}

export default function ProfilePage({ isOverlay = false, onClose }: ProfilePageProps) {
    const navigate = useNavigate();
    
    const handleGoBack = () => {
        if (isOverlay && onClose) {
            onClose();
        } else {
            navigate('/dashboard');
        }
    };
    const [isChecking, setIsChecking] = useState(true);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [error, setError] = useState('');
    const [activeMenu, setActiveMenu] = useState<'profile' | 'saved_routes' | 'events' | 'favorites' | 'settings' | 'help'>('profile');

    // Zustand stores hooks
    const { preferences, fetchPreferences, updatePreference, isLoading: isLoadingPrefs, error: prefError } = usePreferenceStore();
    const { favoriteDetails, fetchFavoriteDetails, isLoading: isLoadingFavorites, toggleFavorite } = useFavoritePoiStore();

    const [testNotifLoading, setTestNotifLoading] = useState(false);
    const [testNotifMsg, setTestNotifMsg] = useState('');

    const sendTestNotification = async () => {
        setTestNotifLoading(true);
        setTestNotifMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/user/notifications/test', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            setTestNotifMsg(data.success ? '✅ Đã gửi! Mở chuông 🔔 để xem thông báo.' : '❌ ' + data.message);
        } catch {
            setTestNotifMsg('❌ Không thể kết nối server.');
        } finally {
            setTestNotifLoading(false);
        }
    };
    
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);

    // ============ NEW STATE VARIABLES FOR SAVED ROUTES ============
    const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [routeToDelete, setRouteToDelete] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fetchSavedRoutes = async () => {
        setIsLoadingRoutes(true);
        try {
            const routes = await savedRouteService.getSavedRoutes();
            setSavedRoutes(routes);
        } catch (err) {
            console.error('Error fetching saved routes:', err);
        } finally {
            setIsLoadingRoutes(false);
        }
    };

    useEffect(() => {
        if (activeMenu === 'saved_routes') {
            fetchSavedRoutes();
        } else if (activeMenu === 'favorites') {
            fetchFavoriteDetails();
        } else if (activeMenu === 'settings') {
            fetchPreferences();
        }
    }, [activeMenu, fetchPreferences, fetchFavoriteDetails]);

    const triggerDeleteConfirm = (id: number) => {
        setRouteToDelete(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteRoute = async () => {
        if (routeToDelete === null) return;
        try {
            await savedRouteService.deleteRoute(routeToDelete);
            fetchSavedRoutes();
        } catch (err) {
            console.error('Error deleting route:', err);
        } finally {
            setShowDeleteConfirm(false);
            setRouteToDelete(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        window.location.href = `${import.meta.env.BASE_URL}login`;
    };

    const fetchProfile = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            handleLogout();
            return;
        }

        fetch('http://localhost:5001/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        })
            .then(res => {
                if (res.status === 401) {
                    handleLogout();
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data?.data) {
                    setUserData(data.data);
                }
                setIsChecking(false);
            })
            .catch(err => {
                console.error('Error fetching profile:', err);
                setError('Không thể tải thông tin người dùng');
                setIsChecking(false);
            });
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    if (isChecking) {
        return (
            <div style={{ padding: '100px 50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '18px', color: '#666' }}>⏳ Đang tải dữ liệu...</div>
            </div>
        );
    }

    // ============ SIDEBAR MENU ============
    const menuItems = [
        { id: 'profile', label: 'Hồ Sơ', icon: User },
        { id: 'saved_routes', label: 'Lộ Trình Đã Lưu', icon: Bookmark },
        { id: 'events', label: 'Lịch Sử Di Chuyển', icon: History },
        { id: 'favorites', label: 'Địa Điểm Yêu Thích', icon: Heart },
        { id: 'settings', label: 'Cài Đặt', icon: Settings },
        { id: 'help', label: 'Hỗ Trợ', icon: HelpCircle },
    ];

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ============ NAVBAR ============ */}
            <nav style={{
                backgroundColor: '#2563EB',
                padding: '12px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={handleGoBack}>
                    <Navigation size={24} />
                    <span>DaNang EventMap</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '13px', transition: 'all 0.3s ease'
                    }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; }}
                    >
                        <Bell size={16} />
                    </button>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 12px',
                        borderRadius: '20px', cursor: 'pointer'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.3)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', overflow: 'hidden'
                        }}>
                            {userData?.avatar_url ? (
                                <img src={userData.avatar_url.startsWith('http') ? userData.avatar_url : `http://localhost:5001${userData.avatar_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                "👤"
                            )}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{userData?.username || 'User'}</span>
                    </div>
                </div>
            </nav>

            {/* ============ MAIN CONTENT ============ */}
            <div style={{ display: 'flex', flex: 1 }}>
                {/* ============ SIDEBAR ============ */}
                <div style={{
                    width: '260px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb',
                    padding: '16px 12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', overflowY: 'auto'
                }}>
                    {menuItems.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = activeMenu === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id as any)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', marginBottom: '4px',
                                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                    border: 'none', borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                                    borderRadius: '4px', color: isActive ? '#2563EB' : '#6b7280',
                                    fontSize: '13px', fontWeight: isActive ? '600' : '500',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <IconComponent size={16} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ============ MAIN CONTENT AREA ============ */}
                <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                    {error && (
                        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                            ❌ {error}
                        </div>
                    )}

                    {/* ============ PROFILE TAB ============ */}
                    {activeMenu === 'profile' && userData && (
                        <div>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                                        Chào mừng, {userData.username}!
                                    </h1>
                                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                        Quản lý thông tin tài khoản của bạn
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowEditProfile(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                                        backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
                                >
                                    <Edit2 size={14} />
                                    Chỉnh sửa
                                </button>
                            </div>

                            {/* Thông Tin Cá Nhân */}
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                                    Thông Tin Cá Nhân
                                </h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#6b7280', fontSize: '11px', fontWeight: 'bold' }}>
                                            <User size={12} style={{ color: '#2563EB' }} />
                                            USERNAME
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{userData.username}</p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#6b7280', fontSize: '11px', fontWeight: 'bold' }}>
                                            <Mail size={12} style={{ color: '#2563EB' }} />
                                            EMAIL
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', wordBreak: 'break-all' }}>{userData.email}</p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#6b7280', fontSize: '11px', fontWeight: 'bold' }}>
                                            <Shield size={12} style={{ color: '#f59e0b' }} />
                                            VAI TRÒ
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                                            {userData.role === 'admin' ? '👑 Admin' : '👤 User'}
                                        </p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#6b7280', fontSize: '11px', fontWeight: 'bold' }}>
                                            <Calendar size={12} style={{ color: '#22c55e' }} />
                                            NGÀY THAM GIA
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                            {(userData as any)?.created_at || 'N/A'}
                                        </p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#fce7f3', borderRadius: '8px', border: '1px solid #fbcfe8', gridColumn: '1 / -1' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#6b7280', fontSize: '11px', fontWeight: 'bold' }}>
                                            <Clock size={12} style={{ color: '#ec4899' }} />
                                            LẦN ĐĂNG NHẬP CUỐI
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                            {(userData as any)?.last_login_at || 'Chưa đăng nhập'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bảo Mật */}
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Lock size={16} style={{ color: '#2563EB' }} />
                                    Bảo Mật
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '3px' }}>Mật khẩu</p>
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {userData?.has_password === false ? 'Chưa thiết lập mật khẩu' : '••••••••'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowChangePassword(true)}
                                        style={{
                                            padding: '6px 12px', backgroundColor: 'white', color: '#2563EB',
                                            border: '1px solid #2563EB', borderRadius: '6px', cursor: 'pointer',
                                            fontSize: '12px', fontWeight: '600', transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                    >
                                        {userData?.has_password === false ? 'Tạo mật khẩu' : 'Đổi mật khẩu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ============ SAVED ROUTES TAB ============ */}
                    {activeMenu === 'saved_routes' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Lộ Trình Đã Lưu</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Quản lý và xem lại các lộ trình bạn đã lưu trữ</p>
                            
                            {isLoadingRoutes ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>⏳ Đang tải lộ trình...</div>
                                </div>
                            ) : savedRoutes.length === 0 ? (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                    <Bookmark size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>Chưa có lộ trình nào được lưu.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {savedRoutes.map((route) => {
                                        return (
                                            <div 
                                                key={route.route_id} 
                                                style={{ 
                                                    backgroundColor: 'white', 
                                                    borderRadius: '12px', 
                                                    padding: '16px', 
                                                    border: '1px solid #e5e7eb', 
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '16px'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                                                            {route.route_name || 'Lộ trình không tên'}
                                                        </h3>
                                                        {route.is_emergency && (
                                                            <span style={{ fontSize: '10px', backgroundColor: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #fee2e2' }}>
                                                                Tránh ngập lụt
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                                                            <span><b>Bắt đầu:</b> {route.origin_name || 'Vị trí xuất phát'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                                                            <span><b>Điểm đến:</b> {route.destination_name || 'Điểm đến'}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>
                                                        <span>PHƯƠNG TIỆN: <span style={{ color: '#4b5563' }}>{route.profile === 'driving' ? '🚗 Lái xe' : route.profile === 'walking' ? '🚶 Đi bộ' : '🚴 Xe đạp'}</span></span>
                                                        <span>KHOẢNG CÁCH: <span style={{ color: '#4b5563' }}>{(route.distance_meters / 1000).toFixed(2)} km</span></span>
                                                        <span>THỜI GIAN: <span style={{ color: '#4b5563' }}>{Math.round(route.duration_seconds / 60)} phút</span></span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => navigate(`/dashboard?routeId=${route.route_id}`)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            backgroundColor: '#2563EB', color: 'white', border: 'none',
                                                            padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
                                                            fontSize: '12px', fontWeight: '600', transition: 'all 0.3s ease'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
                                                    >
                                                        <span>Xem trên bản đồ</span>
                                                        <ArrowRight size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => triggerDeleteConfirm(route.route_id)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: 'white', color: '#ef4444', border: '1px solid #fee2e2',
                                                            width: '34px', height: '34px', borderRadius: '6px', cursor: 'pointer',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                        title="Xóa lộ trình"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ============ HISTORY TAB ============ */}
                    {activeMenu === 'events' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Lịch Sử Di Chuyển</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Xem lại những địa điểm bạn đã ghé thăm</p>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                <History size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Chưa có lịch sử di chuyển. Hãy bắt đầu khám phá Đà Nẵng!</p>
                            </div>
                        </div>
                    )}

                    {/* ============ FAVORITES TAB ============ */}
                    {activeMenu === 'favorites' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Địa Điểm Yêu Thích</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Quản lý các địa điểm du lịch, ẩm thực, giải trí mà bạn đã lưu</p>
                            
                            {isLoadingFavorites ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải danh sách địa điểm yêu thích...</div>
                            ) : favoriteDetails.length === 0 ? (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                    <Heart size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>Chưa có địa điểm yêu thích nào. Hãy lưu các địa điểm thú vị trên bản đồ!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                    {favoriteDetails.map(poi => (
                                        <div 
                                            key={poi.poi_id} 
                                            style={{ 
                                                backgroundColor: 'white', 
                                                borderRadius: '16px', 
                                                overflow: 'hidden', 
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
                                                border: '1px solid #e5e7eb',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            {/* Image */}
                                            <div style={{ height: '140px', overflow: 'hidden', position: 'relative', backgroundColor: '#f3f4f6' }}>
                                                <img 
                                                    src={poi.image_url ? (poi.image_url.startsWith('http') ? poi.image_url : `http://localhost:5001${poi.image_url}`) : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'} 
                                                    alt={poi.name} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';
                                                    }}
                                                />
                                                {/* Category tag */}
                                                <span 
                                                    style={{ 
                                                        position: 'absolute', 
                                                        top: '12px', 
                                                        left: '12px', 
                                                        fontSize: '10px', 
                                                        fontWeight: 'bold', 
                                                        color: 'white', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '9999px',
                                                        backgroundColor: poi.category_color || '#6366f1'
                                                    }}
                                                >
                                                    {poi.category_name}
                                                </span>
                                            </div>
                                            
                                            {/* Body */}
                                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: 0, lineHeight: '1.4' }}>
                                                    {poi.name}
                                                </h3>
                                                
                                                {/* Rating */}
                                                {poi.rating && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>
                                                        <Star size={11} className="fill-amber-400 text-amber-400" /> {poi.rating.toFixed(1)}
                                                    </div>
                                                )}
                                                
                                                {poi.address && (
                                                    <div style={{ display: 'flex', alignItems: 'start', gap: '6px', fontSize: '11px', color: '#4b5563' }}>
                                                        <MapPin size={12} style={{ color: '#9ca3af', marginTop: '2px', flexShrink: 0 }} />
                                                        <span>{poi.address}</span>
                                                    </div>
                                                )}
                                                
                                                {/* Actions */}
                                                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => {
                                                            navigate(`/dashboard?poiId=${poi.poi_id}`);
                                                        }}
                                                        style={{ 
                                                            flex: 1, 
                                                            padding: '8px', 
                                                            backgroundColor: '#2563eb', 
                                                            color: 'white', 
                                                            border: 'none', 
                                                            borderRadius: '8px', 
                                                            fontSize: '11px', 
                                                            fontWeight: 'bold', 
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Navigation size={12} style={{ transform: 'rotate(45deg)' }} /> Chỉ đường
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            try {
                                                                await toggleFavorite(poi.poi_id);
                                                                showPremiumToast('Đã xóa khỏi danh sách yêu thích!', 'success');
                                                            } catch (err) {
                                                                showPremiumToast('Không thể bỏ lưu địa điểm.', 'error');
                                                            }
                                                        }}
                                                        style={{ 
                                                            padding: '8px 12px', 
                                                            backgroundColor: '#fef2f2', 
                                                            color: '#dc2626', 
                                                            border: '1px solid #fecaca', 
                                                            borderRadius: '8px', 
                                                            fontSize: '11px', 
                                                            fontWeight: 'bold', 
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Xóa khỏi danh sách"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
 
                    {/* ============ SETTINGS TAB ============ */}
                    {activeMenu === 'settings' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Cài Đặt</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Tuỳ chỉnh các cấu hình định tuyến và hiển thị bản đồ của bạn</p>

                            {/* Error banner nếu fetch preferences thất bại */}
                            {prefError && (
                                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                                    ⚠️ {prefError} —{' '}
                                    <button onClick={fetchPreferences} style={{ color: '#dc2626', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Thử lại</button>
                                </div>
                            )}

                            {/* Loading skeleton */}
                            {isLoadingPrefs && !preferences && (
                                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid #f3f4f6', color: '#6b7280', fontSize: '13px' }}>
                                    ⏳ Đang tải cấu hình...
                                </div>
                            )}

                            {(!isLoadingPrefs || preferences) && (
                            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* Toggle helper */}
                                    {([
                                        { key: 'avoid_floods' as const, label: 'Né tránh vùng ngập lụt', desc: 'Tự động tìm đường đi tránh các khu vực ngập sâu khi có mưa lớn.' },
                                        { key: 'avoid_congestion' as const, label: 'Tránh ùn tắc (Kẹt xe)', desc: 'Gợi ý các tuyến đường tránh điểm nóng kẹt xe mức độ nghiêm trọng.' },
                                        { key: 'show_traffic_layer' as const, label: 'Mặc định hiển thị mật độ giao thông', desc: 'Tự động kích hoạt lớp phủ mật độ giao thông khi mở ứng dụng bản đồ.' },
                                        { key: 'show_restricted_roads' as const, label: 'Hiển thị đường bị hạn chế', desc: 'Hiển thị các tuyến đường bị cấm hoặc hạn chế lưu thông trên bản đồ.' },
                                        { key: 'enable_buffer_alerts' as const, label: 'Thông báo cảnh báo vùng đệm', desc: 'Nhận thông báo khi tuyến đường đi qua khu vực có rủi ro.' },
                                    ] as { key: 'avoid_floods' | 'avoid_congestion' | 'show_traffic_layer' | 'show_restricted_roads' | 'enable_buffer_alerts'; label: string; desc: string }[]).map(item => (
                                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>{item.label}</h3>
                                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</p>
                                            </div>
                                            <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                                                <button
                                                    onClick={() => updatePreference(item.key, !(preferences?.[item.key] ?? false))}
                                                    aria-label={item.label}
                                                    style={{
                                                        width: '48px', height: '26px',
                                                        borderRadius: '9999px',
                                                        backgroundColor: preferences?.[item.key] ? '#2563eb' : '#d1d5db',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        transition: 'background-color 0.2s',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <span style={{
                                                        width: '20px', height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'white',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: preferences?.[item.key] ? '25px' : '3px',
                                                        transition: 'left 0.2s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                    }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Phương tiện mặc định */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>Phương tiện di chuyển mặc định</h3>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>Phương tiện được chọn sẵn khi bắt đầu tính toán đường đi.</p>
                                        </div>
                                        <div style={{ marginLeft: '16px' }}>
                                            <select
                                                value={preferences?.default_travel_mode || 'driving'}
                                                onChange={(e) => updatePreference('default_travel_mode', e.target.value as any)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #d1d5db',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    backgroundColor: '#f9fafb'
                                                }}
                                            >
                                                <option value="driving">🚗 Lái xe (Ô tô/Xe máy)</option>
                                                <option value="walking">🚶 Đi bộ</option>
                                                <option value="cycling">🚲 Xe đạp</option>
                                            </select>
                                        </div>
                                    </div>

                                </div>

                                {/* Footer row */}
                                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                                        <CheckCircle2 size={16} /> Các thiết lập đã được tự động lưu và đồng bộ lên tài khoản cá nhân.
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <button
                                            onClick={sendTestNotification}
                                            disabled={testNotifLoading}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: testNotifLoading ? '#93c5fd' : '#2563eb',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: testNotifLoading ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Bell size={14} />
                                            {testNotifLoading ? 'Đang gửi...' : 'Gửi thông báo kiểm tra'}
                                        </button>
                                        {testNotifMsg && (
                                            <span style={{ fontSize: '11px', color: testNotifMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{testNotifMsg}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>
                    )}

                    {/* ============ HELP TAB ============ */}
                    {activeMenu === 'help' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Hỗ Trợ</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Câu hỏi thường gặp và hướng dẫn sử dụng</p>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                <HelpCircle size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Trung tâm hỗ trợ sẽ được cập nhật sớm</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ============ FOOTER ============ */}
            <div style={{ backgroundColor: 'white', padding: '16px 32px', textAlign: 'center', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                    onClick={handleGoBack}
                    style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.3s ease' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                >
                    ← Quay Lại Bản Đồ
                </button>

                <button
                    onClick={handleLogout}
                    style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
                >
                    <LogOut size={12} />
                    Đăng Xuất
                </button>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '8px', textAlign: 'center', fontSize: '11px', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                DaNang EventMap © 2026. All rights reserved.
            </div>

            {/* ============ MODALS ============ */}
            <ChangePasswordModal 
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                hasPassword={userData?.has_password} 
                onSuccess={() => setShowChangePassword(false)}
            />

            <EditProfileModal 
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                currentUsername={userData?.username || ''}
                currentAvatar={userData?.avatar_url || ''}
                onSuccess={() => fetchProfile()} 
            />

            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px', padding: '24px',
                        width: '360px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'sans-serif'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2',
                            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', fontSize: '20px'
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', margin: 0 }}>
                            Xác nhận xóa lộ trình
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                            Bạn có chắc chắn muốn xóa lộ trình này không? Hành động này không thể hoàn tác.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setRouteToDelete(null);
                                }}
                                style={{
                                    flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#4b5563',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleDeleteRoute}
                                style={{
                                    flex: 1, padding: '10px', backgroundColor: '#ef4444', color: 'white',
                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}