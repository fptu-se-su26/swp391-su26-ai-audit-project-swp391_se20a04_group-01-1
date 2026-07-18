import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Calendar, Users, MapPin, Flag, X, AlertCircle, Clock, Save, AlertTriangle, Car,
    Waves, RouteOff, BarChart3, CheckCircle2, RefreshCw, Shield, Lock, Key, Copy, Check,
    Eye, EyeOff 
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend
} from 'recharts';
import AdminLayout from '../../layouts/AdminLayout';
import * as authService from '../../services/authService';
import * as userService from '../../services/userService';
import { eventAPI, adminAPI, trafficAlertAPI, poiAPI } from '../../services/api';
import { eventRoadService } from '../../services/eventRoadService';
import SettingsTab from './SettingsTab';
import UsersTab from './UsersTab';
import ClosureTab from './ClosureTab';
import FloodTab from './FloodTab';
import TrafficTab from './TrafficTab';
import EventsTab from './EventsTab';
import OverviewTab from './OverviewTab';
import POIsTab from './POIsTab';
import { DBEvent, TrafficAlert, FloodZone, RoadClosure, ManageUser, EventFormData } from './types';
import toast from 'react-hot-toast';
import { showPremiumToast } from '../../utils/toastUtils';

export default function AdminDashboard() {
    const [activeMenu, setActiveMenu] = useState('overview');

    // States for Profile Info
    const [profileForm, setProfileForm] = useState({ username: '', email: '' });
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState(false);

    // States for Events
    const [events, setEvents] = useState<DBEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DBEvent | null>(null);

    const [eventFormData, setEventFormData] = useState<EventFormData>({
        title: '', short_description: '', description: '', location_name: '',
        latitude: 16.0544, longitude: 108.2022, start_time: '', end_time: '',
        status: 'pending', category_id: 1
    });

    const [eventBannerFile, setEventBannerFile] = useState<File | null>(null);
    const [eventThumbnailFile, setEventThumbnailFile] = useState<File | null>(null);

    const handleEventImageChange = (banner: File | null, thumbnail: File | null) => {
        setEventBannerFile(banner);
        setEventThumbnailFile(thumbnail);
    };

        const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);

    const [floodZones, setFloodZones] = useState<FloodZone[]>([]);

    const [roadClosures, setRoadClosures] = useState<RoadClosure[]>([
        { id: 1, road_name: 'Đường Bạch Đằng', event_title: 'Lễ hội Pháo hoa quốc tế DIFF 2026', restriction_type: 'CLOSED', time_frame: '18:00 - 23:00' },
        { id: 2, road_name: 'Đường Trần Hưng Đạo', event_title: 'Lễ hội Pháo hoa quốc tế DIFF 2026', restriction_type: 'CLOSED', time_frame: '18:00 - 23:00' },
        { id: 3, road_name: 'Đường 2 Tháng 9', event_title: 'Danang International Marathon', restriction_type: 'ONE_WAY', time_frame: '04:00 - 10:00' }
    ]);

    const [showTrafficModal, setShowTrafficModal] = useState(false);
    const [trafficFormData, setTrafficFormData] = useState({
        title: '', location: '', type: 'CONGESTION' as any, severity: 'MEDIUM' as any,
        latitude: 16.0544, longitude: 108.2022, affected_area_polygon: ''
    });

    const [pwdFormData, setPwdFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdMessage, setPwdMessage] = useState('');
    const [pwdError, setPwdError] = useState(false);
    const [hasPassword, setHasPassword] = useState(true);
    const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

    const [adminUsers, setAdminUsers] = useState<ManageUser[]>([]);
    const [showBanModal, setShowBanModal] = useState(false);
    const [userToBan, setUserToBan] = useState<ManageUser | null>(null);
    const [banReason, setBanReason] = useState('');

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFaQRCode, setTwoFaQRCode] = useState<string | null>(null);
    const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
    const [totpConfirmCode, setTotpConfirmCode] = useState('');
    const [showTwoFaQR, setShowTwoFaQR] = useState(false);
    const [showDisable2FaInput, setShowDisable2FaInput] = useState(false);
    const [disable2FaPassword, setDisable2FaPassword] = useState('');
    const [twoFaMessage, setTwoFaMessage] = useState('');
    const [twoFaError, setTwoFaError] = useState(false);
    const [isConfirming2FA, setIsConfirming2FA] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pendingPOIsCount, setPendingPOIsCount] = useState(0);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    const showCustomConfirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel: () => void = () => {}
    ) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onConfirm();
            },
            onCancel: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onCancel();
            }
        });
    };

    const fetchUsers = async () => {
        try {
            const response = await userService.getAllUsers();
            setAdminUsers(response.data?.data || response.data || response || []);
        } catch (error) {
            setAdminUsers([]);
        }
    };

    const fetchFloodZones = async () => {
        try {
            const response = await adminAPI.getFloodZones();
            if (response.data && response.data.success) {
                const data = response.data.data.map((z: any) => ({
                    id: Number(z.zone_id),
                    name: z.name || z.zone_name,
                    district: z.district,
                    risk_level: (z.risk_level || 'LOW').toUpperCase(),
                    is_active: !!z.is_active,
                    last_updated: z.last_updated || 'Chưa cập nhật'
                }));
                setFloodZones(data);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách vùng ngập lụt:", error);
            showPremiumToast('Không thể lấy dữ liệu vùng ngập lụt từ server.', 'error');
        }
    };

    const fetchTrafficAlerts = async () => {
        try {
            const response = await adminAPI.getTrafficAlerts();
            if (response.data && response.data.success) {
                const data = response.data.data.map((alert: any) => ({
                    id: alert.id,
                    title: alert.title,
                    location: alert.location,
                    type: alert.type,
                    severity: alert.severity,
                    is_active: alert.is_active,
                    created_at: new Date(alert.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                }));
                setTrafficAlerts(data);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách cảnh báo giao thông:", error);
            showPremiumToast('Không thể lấy dữ liệu cảnh báo giao thông.', 'error');
        }
    };

    const fetchPendingPOIsCount = async () => {
        try {
            const response = await poiAPI.getPendingPOIs();
            if (response.data && response.data.data) {
                setPendingPOIsCount(response.data.data.length);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách POI chờ duyệt:", error);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchAdminSecuritySettings();
        fetchUserProfile();
        fetchUsers();
        fetchRoadClosures();
        fetchFloodZones();
        fetchTrafficAlerts();
        fetchPendingPOIsCount();
    }, []);

    const fetchAdminSecuritySettings = async () => {
        try {
            const result = await userService.getSecuritySettings();
            if (result && result.data) setTwoFactorEnabled(result.data.two_factor_enabled || false);
        } catch (error) {
            setTwoFactorEnabled(localStorage.getItem('is_2fa_enabled') === '1');
        }
    };

    const fetchUserProfile = async () => {
        try {
            const result = await userService.getProfile();
            if (result && result.data) {
                if (result.data.has_password !== undefined) setHasPassword(result.data.has_password);
                setProfileForm({
                    username: result.data.username || '',
                    email: result.data.email || ''
                });
            }
        } catch (error) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setProfileForm({ username: user.username || '', email: user.email || '' });
            }
        }
    };

    const fetchRoadClosures = async () => {
        try {
            const data = await eventRoadService.getEventRoads();
            const mappedClosures = data.map(road => {
                let timeFrameStr = '';
                if (road.days_of_week) {
                    const daysStr = road.days_of_week.split(',').map((d: string) => {
                        const day = parseInt(d.trim());
                        return day === 0 ? 'CN' : `T${day + 1}`;
                    }).join(', ');
                    const startStr = road.start_time_of_day ? road.start_time_of_day.substring(0, 5) : '';
                    const endStr = road.end_time_of_day ? road.end_time_of_day.substring(0, 5) : '';
                    timeFrameStr = `${startStr} - ${endStr} (${daysStr} hàng tuần)`;
                } else {
                    const startStr = new Date(road.restriction_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const endStr = new Date(road.restriction_end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = new Date(road.restriction_start).toLocaleDateString('vi-VN');
                    timeFrameStr = `${startStr} - ${endStr} (${dateStr})`;
                }
                
                return {
                    id: road.road_id,
                    road_name: road.road_name,
                    event_title: road.event_title || 'Sự kiện cấm đường',
                    restriction_type: road.restriction_type as any,
                    time_frame: timeFrameStr
                };
            });
            setRoadClosures(mappedClosures);
        } catch (error) {
            console.error("Lỗi khi tải danh sách đường cấm do sự kiện:", error);
        }
    };

    const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError(false);
        setProfileMessage('');
        try {
            await userService.updateProfile({ username: profileForm.username });
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                user.username = profileForm.username;
                localStorage.setItem('user', JSON.stringify(user));
            }
            setProfileMessage('✅ Cập nhật tên hiển thị thành công!');
            setTimeout(() => setProfileMessage(''), 3000);
        } catch (error: any) {
            setProfileError(true);
            setProfileMessage(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ!');
        }
    };

    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const response = await eventAPI.getAllEvents();
            setEvents(response.data.data);
        } catch (error) {
            setEvents([
                { event_id: 1, category_id: 1, is_featured: true, is_free: false, ticket_price: 500000, favorite_count: 120, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title: 'Lễ hội Pháo hoa DIFF 2026', short_description: 'Lễ hội pháo hoa quốc tế hoành tráng bên sông Hàn.', description: 'DIFF 2026 quy tụ 8 đội thi...', location_name: 'Sông Hàn, Sơn Trà, Đà Nẵng', latitude: 16.0722, longitude: 108.2255, start_time: '2026-06-24T20:00', end_time: '2026-06-24T22:00', status: 'approved', view_count: 3200 }
            ]);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleApproveEvent = async (id: number, currentStatus: string) => {
        const nextStatus = currentStatus === 'approved' ? 'pending' : 'approved';
        try {
            const eventObj = events.find(e => e.event_id === id);
            if (!eventObj) return;
            await eventAPI.updateEvent(id, {
                ...eventObj,
                status: nextStatus
            });
            showPremiumToast(nextStatus === 'approved' ? 'Phê duyệt sự kiện thành công!' : 'Đã chuyển sự kiện về trạng thái chờ duyệt!', 'success');
            fetchEvents();
        } catch (error) {
            showPremiumToast('Lỗi phê duyệt sự kiện.', 'error');
        }
    };

    const handleDeleteEvent = async (id: number) => {
        showCustomConfirm(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa sự kiện này không?',
            async () => {
                try {
                    await eventAPI.deleteEvent(id);
                    showPremiumToast('Xóa sự kiện thành công!', 'success');
                    fetchEvents();
                } catch (error) {
                    showPremiumToast('Lỗi xóa sự kiện.', 'error');
                }
            }
        );
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', eventFormData.title);
            formData.append('short_description', eventFormData.short_description || '');
            formData.append('description', eventFormData.description || '');
            formData.append('location_name', eventFormData.location_name);
            formData.append('latitude', String(eventFormData.latitude));
            formData.append('longitude', String(eventFormData.longitude));
            formData.append('start_time', eventFormData.start_time);
            formData.append('end_time', eventFormData.end_time || '');
            formData.append('status', eventFormData.status);
            formData.append('category_id', String(eventFormData.category_id || 1));
            formData.append('is_featured', String(editingEvent ? editingEvent.is_featured : false));
            formData.append('is_free', String(editingEvent ? editingEvent.is_free : true));
            formData.append('ticket_price', String(editingEvent ? editingEvent.ticket_price : 0));
            if (eventBannerFile) {
                formData.append('banner', eventBannerFile);
            }
            if (eventThumbnailFile) {
                formData.append('thumbnail', eventThumbnailFile);
            }

            if (editingEvent) {
                await eventAPI.updateEvent(editingEvent.event_id, formData);
                showPremiumToast('Cập nhật sự kiện thành công!', 'success');
            } else {
                await eventAPI.createEvent(formData);
                showPremiumToast('Thêm sự kiện mới thành công!', 'success');
            }
            setShowModal(false);
            setEditingEvent(null);
            setEventBannerFile(null);
            setEventThumbnailFile(null);
            fetchEvents();
        } catch (error) {
            showPremiumToast('Lỗi kết nối máy chủ hoặc lưu sự kiện.', 'error');
        }
    };

    const handleCreateTrafficAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = {
                title: trafficFormData.title,
                location: trafficFormData.location,
                type: trafficFormData.type,
                severity: trafficFormData.severity,
                latitude: Number(trafficFormData.latitude),
                longitude: Number(trafficFormData.longitude),
                affected_area_polygon: trafficFormData.affected_area_polygon || null
            };
            const response = await trafficAlertAPI.createTrafficAlert(body);
            if (response.data && response.data.success) {
                showPremiumToast('Tạo cảnh báo giao thông mới thành công!', 'success');
                setTrafficFormData({
                    title: '', location: '', type: 'CONGESTION', severity: 'MEDIUM',
                    latitude: 16.0544, longitude: 108.2022, affected_area_polygon: ''
                });
                setShowTrafficModal(false);
                fetchTrafficAlerts();
            } else {
                showPremiumToast(response.data.message || 'Lỗi khi tạo cảnh báo giao thông.', 'error');
            }
        } catch (error) {
            console.error("Lỗi tạo cảnh báo giao thông:", error);
            showPremiumToast('Lỗi kết nối máy chủ.', 'error');
        }
    };

    const toggleTrafficStatus = async (id: number) => {
        const alert = trafficAlerts.find(a => a.id === id);
        if (!alert) return;

        const nextStatus = !alert.is_active;
        try {
            const response = await adminAPI.toggleTrafficAlert(id, nextStatus);
            if (response.data && response.data.success) {
                showPremiumToast('Cập nhật trạng thái sự cố thành công!', 'success');
                setTrafficAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: nextStatus } : a));
            } else {
                showPremiumToast('Cập nhật trạng thái sự cố thất bại.', 'error');
            }
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái sự cố:", error);
            showPremiumToast('Lỗi hệ thống khi cập nhật trạng thái.', 'error');
        }
    };

    const handleDeleteTrafficAlert = async (id: number) => {
        showCustomConfirm(
            'Xác nhận xóa sự cố',
            'Bạn có chắc chắn muốn xóa báo cáo cảnh báo sự cố giao thông này không?',
            async () => {
                try {
                    const response = await adminAPI.deleteTrafficAlert(id);
                    if (response.data && response.data.success) {
                        showPremiumToast('Xóa cảnh báo sự cố thành công!', 'success');
                        setTrafficAlerts(prev => prev.filter(a => a.id !== id));
                    } else {
                        showPremiumToast('Không thể xóa cảnh báo sự cố.', 'error');
                    }
                } catch (error) {
                    console.error("Lỗi khi xóa sự cố giao thông:", error);
                    showPremiumToast('Lỗi hệ thống khi xóa sự cố.', 'error');
                }
            },
            () => {}
        );
    };

    const toggleFloodStatus = async (id: number) => {
        const zone = floodZones.find(z => z.id === id);
        if (!zone) return;

        const nextStatus = !zone.is_active;
        try {
            const response = await adminAPI.updateFloodZone(id, nextStatus);
            if (response.data && response.data.success) {
                showPremiumToast('Cập nhật trạng thái vùng ngập thành công!', 'success');
                setFloodZones(prev => prev.map(z => z.id === id ? { ...z, is_active: nextStatus, last_updated: 'Vừa xong' } : z));
            } else {
                showPremiumToast('Cập nhật trạng thái vùng ngập thất bại.', 'error');
            }
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái vùng ngập:", error);
            showPremiumToast('Lỗi hệ thống khi cập nhật trạng thái.', 'error');
        }
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError(false); setPwdMessage('');
        try {
            await userService.changePassword({ currentPassword: pwdFormData.currentPassword || '', newPassword: pwdFormData.newPassword, confirmPassword: pwdFormData.confirmPassword });
            setPwdMessage('✅ Cập nhật mật khẩu thành công!');
            setPwdFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setPwdError(true); setPwdMessage(error.response?.data?.message || 'Có lỗi xảy ra!');
        }
    };

    const handleUnbanUser = async (userId: number) => {
        showCustomConfirm(
            'Xác nhận mở khóa',
            'Bạn có chắc chắn muốn mở khóa cho tài khoản này không?',
            async () => {
                try {
                    await userService.unbanUser(userId);
                    fetchUsers();
                } catch (error) {}
            }
        );
    };

    const handleBanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToBan) return;
        try {
            await userService.banUser(userToBan.user_id, banReason);
            setShowBanModal(false); setUserToBan(null); fetchUsers();
        } catch (error) {}
    };

    const handleSetup2FA = async () => {
        try {
            const result = await authService.setup2FA();
            if (result?.success && result?.data?.qrCode) {
                setTwoFaQRCode(result.data.qrCode); setTwoFaSecret(result.data.secret); setShowTwoFaQR(true);
            }
        } catch (error) {
            setTwoFaQRCode('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/DanangSmart:admin');
            setTwoFaSecret('JBSWY3DPEHPK3PXP'); setShowTwoFaQR(true);
        }
    };

    const handleConfirm2FA = async () => {
        try {
            const result = await authService.confirm2FA(totpConfirmCode, twoFaSecret as string);
            if (result?.success) {
                setTwoFactorEnabled(true);
                setShowTwoFaQR(false);
                localStorage.setItem('is_2fa_enabled', '1');
                showPremiumToast('Kích hoạt 2FA thành công!', 'success');
            }
        } catch (error) {
            showPremiumToast('Mã xác thực lỗi. Vui lòng kiểm tra lại.', 'error');
        }
    };

    const handleDisable2FA = async () => {
        setTwoFaMessage('');
        setTwoFaError(false);
        try {
            const result = await userService.disable2FA({ password: disable2FaPassword });
            if (result.success) {
                setTwoFactorEnabled(false);
                setShowDisable2FaInput(false);
                setDisable2FaPassword('');
                localStorage.setItem('is_2fa_enabled', '0');
                showPremiumToast('Đã tắt xác thực 2 lớp (2FA) thành công!', 'success');
            } else {
                setTwoFaError(true);
                setTwoFaMessage(result.error?.message || result.message || 'Lỗi khi tắt 2FA');
            }
        } catch (error: any) {
            setTwoFaError(true);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Mật khẩu không chính xác hoặc lỗi hệ thống!';
            setTwoFaMessage(errorMessage);
        }
    };



    return (
        <AdminLayout 
            activeMenu={activeMenu} 
            setActiveMenu={setActiveMenu}
            counts={{
                events: events.length,
                flood: floodZones.length,
                closure: roadClosures.length,
                traffic: trafficAlerts.length,
                pois: pendingPOIsCount,
                pendingPOIs: pendingPOIsCount
            }}
        >
            {activeMenu === 'overview' && <OverviewTab events={events} trafficAlerts={trafficAlerts} floodZones={floodZones} />}
            {activeMenu === 'events' && (
                <EventsTab
                    events={events} loadingEvents={loadingEvents} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter} currentPage={currentPage} setCurrentPage={setCurrentPage}
                    showModal={showModal} setShowModal={setShowModal} editingEvent={editingEvent} setEditingEvent={setEditingEvent}
                    eventFormData={eventFormData} setEventFormData={setEventFormData} handleApproveEvent={handleApproveEvent}
                    handleDeleteEvent={handleDeleteEvent} handleCreateEvent={handleCreateEvent}
                    onImageChange={handleEventImageChange}
                />
            )}
            {activeMenu === 'traffic' && (
                <TrafficTab
                    trafficAlerts={trafficAlerts} toggleTrafficStatus={toggleTrafficStatus} showTrafficModal={showTrafficModal}
                    setShowTrafficModal={setShowTrafficModal} trafficFormData={trafficFormData} setTrafficFormData={setTrafficFormData}
                    handleCreateTrafficAlert={handleCreateTrafficAlert}
                    deleteTrafficAlert={handleDeleteTrafficAlert}
                />
            )}
            {activeMenu === 'flood' && <FloodTab floodZones={floodZones} toggleFloodStatus={toggleFloodStatus} />}
            {activeMenu === 'closure' && (
                <ClosureTab 
                    roadClosures={roadClosures} 
                    events={events}
                    onRefresh={fetchRoadClosures} 
                />
            )}
            {activeMenu === 'users' && (
                <UsersTab
                    adminUsers={adminUsers} showBanModal={showBanModal} setShowBanModal={setShowBanModal}
                    userToBan={userToBan} setUserToBan={setUserToBan} banReason={banReason} setBanReason={setBanReason}
                    handleBanSubmit={handleBanSubmit} handleUnbanUser={handleUnbanUser}
                />
            )}
            {activeMenu === 'settings' && (
                <SettingsTab
                    profileForm={profileForm} setProfileForm={setProfileForm} profileMessage={profileMessage}
                    profileError={profileError} handleUpdateProfileSubmit={handleUpdateProfileSubmit}
                    hasPassword={hasPassword} pwdFormData={pwdFormData} setPwdFormData={setPwdFormData}
                    pwdMessage={pwdMessage} pwdError={pwdError} showPwd={showPwd} setShowPwd={setShowPwd}
                    handleChangePasswordSubmit={handleChangePasswordSubmit} twoFactorEnabled={twoFactorEnabled}
                    twoFaQRCode={twoFaQRCode} twoFaSecret={twoFaSecret} totpConfirmCode={totpConfirmCode}
                    setTotpConfirmCode={setTotpConfirmCode} showTwoFaQR={showTwoFaQR} setShowTwoFaQR={setShowTwoFaQR}
                    showDisable2FaInput={showDisable2FaInput} setShowDisable2FaInput={setShowDisable2FaInput}
                    disable2FaPassword={disable2FaPassword} setDisable2FaPassword={setDisable2FaPassword}
                    twoFaMessage={twoFaMessage} twoFaError={twoFaError} isConfirming2FA={isConfirming2FA}
                    handleSetup2FA={handleSetup2FA} handleConfirm2FA={handleConfirm2FA} handleDisable2FA={handleDisable2FA}
                    setTwoFaQRCode={setTwoFaQRCode} setTwoFaSecret={setTwoFaSecret} setTwoFaError={setTwoFaError} setTwoFaMessage={setTwoFaMessage}
                />
            )}
            {activeMenu === 'pois' && (
                <POIsTab 
                    onRefresh={() => {
                        fetchPendingPOIsCount();
                    }} 
                />
            )}
            {/* CUSTOM CONFIRM MODAL DIALOG */}
            {confirmModal.isOpen && (
                <div 
                    style={{
                        animation: 'fadeIn 250ms ease-out forwards'
                    }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                >
                    <div 
                        style={{
                            animation: 'scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                        }}
                        className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4 text-left font-sans"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
                                <AlertTriangle size={20} />
                            </span>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                {confirmModal.title}
                            </h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed whitespace-pre-line">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={confirmModal.onCancel}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-100 transition-all"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}