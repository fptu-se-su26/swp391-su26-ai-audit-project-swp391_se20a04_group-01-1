import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';
import {
    Navigation, LogOut, User, Mail, Shield, Calendar, Clock,
    Settings, Heart, HelpCircle, Edit2, Lock, Bell, History,
    Bookmark, MapPin, Trash2, ArrowRight
} from 'lucide-react';
import { savedRouteService, SavedRoute } from '../../services/savedRouteService';

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

export default function ProfilePage() {
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(true);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [error, setError] = useState('');
    const [activeMenu, setActiveMenu] = useState<'profile' | 'saved_routes' | 'events' | 'favorites' | 'settings' | 'help'>('profile');
    
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
        }
    }, [activeMenu]);

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
                    onClick={() => navigate('/home')}>
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
                                <img src={userData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Những nơi bạn lưu lại để ghé thăm</p>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                <Heart size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Chưa có địa điểm yêu thích nào. Thêm ngay!</p>
                            </div>
                        </div>
                    )}

                    {/* ============ SETTINGS TAB ============ */}
                    {activeMenu === 'settings' && (
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Cài Đặt</h1>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Tuỳ chỉnh các cài đặt của ứng dụng</p>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '2px dashed #d1d5db', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                                <Settings size={48} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Tính năng cài đặt sẽ được cập nhật sớm</p>
                            </div>
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
                    onClick={() => navigate('/home')}
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