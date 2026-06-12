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
import SettingsTab from './SettingsTab';
import UsersTab from './UsersTab';
import ClosureTab from './ClosureTab';
import FloodTab from './FloodTab';
import TrafficTab from './TrafficTab';
import EventsTab from './EventsTab';
import OverviewTab from './OverviewTab';
import { DBEvent, TrafficAlert, FloodZone, RoadClosure, ManageUser, EventFormData } from './types';

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

    const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([
        { id: 1, title: 'Kẹt xe kéo dài cầu sông Hàn', location: 'Cầu Sông Hàn, Sơn Trà', type: 'CONGESTION', severity: 'HIGH', is_active: true, created_at: '10 phút trước' },
        { id: 2, title: 'Tai nạn xe máy va chạm nhẹ', location: 'Đường Nguyễn Văn Linh, Thanh Khê', type: 'ACCIDENT', severity: 'MEDIUM', is_active: true, created_at: '30 phút trước' },
        { id: 3, title: 'Thi công sửa đường ống nước', location: 'Đường Điện Biên Phủ, Thanh Khê', type: 'CONSTRUCTION', severity: 'LOW', is_active: true, created_at: '2 giờ trước' }
    ]);

    const [floodZones, setFloodZones] = useState<FloodZone[]>([
        { id: 1, name: 'Vùng trũng Hàm Nghi', district: 'Thanh Khê', risk_level: 'HIGH', is_active: true, last_updated: '2026-05-31' },
        { id: 2, name: 'Khu vực bến xe trung tâm', district: 'Liên Chiểu', risk_level: 'MEDIUM', is_active: true, last_updated: '2026-05-30' },
        { id: 3, name: 'Ngã tư Trưng Nữ Vương - Nguyễn Văn Linh', district: 'Hải Châu', risk_level: 'LOW', is_active: false, last_updated: '2026-05-28' }
    ]);

    const [roadClosures, setRoadClosures] = useState<RoadClosure[]>([
        { id: 1, road_name: 'Đường Bạch Đằng', event_title: 'Lễ hội Pháo hoa quốc tế DIFF 2026', restriction_type: 'CLOSED', time_frame: '18:00 - 23:00' },
        { id: 2, road_name: 'Đường Trần Hưng Đạo', event_title: 'Lễ hội Pháo hoa quốc tế DIFF 2026', restriction_type: 'CLOSED', time_frame: '18:00 - 23:00' },
        { id: 3, road_name: 'Đường 2 Tháng 9', event_title: 'Danang International Marathon', restriction_type: 'ONE_WAY', time_frame: '04:00 - 10:00' }
    ]);

    const [showTrafficModal, setShowTrafficModal] = useState(false);
    const [trafficFormData, setTrafficFormData] = useState({
        title: '', location: '', type: 'CONGESTION' as any, severity: 'MEDIUM' as any
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

    const fetchUsers = async () => {
        try {
            const response = await userService.getAllUsers();
            setAdminUsers(response.data?.data || response.data || response || []);
        } catch (error) {
            setAdminUsers([]);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchAdminSecuritySettings();
        fetchUserProfile();
        fetchUsers();
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
            const response = await fetch('http://localhost:5001/api/events');
            if (response.ok) {
                const result = await response.json();
                setEvents(result.data);
            }
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
        setEvents(prev => prev.map(e => e.event_id === id ? { ...e, status: nextStatus } : e));
    };

    const handleDeleteEvent = async (id: number) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này không?')) {
            setEvents(prev => prev.filter(e => e.event_id !== id));
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingEvent ? `http://localhost:5001/api/events/${editingEvent.event_id}` : 'http://localhost:5001/api/events';
        const method = editingEvent ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ Title: eventFormData.title, Description: eventFormData.description, Location: eventFormData.location_name, EventDate: eventFormData.start_time.split('T')[0], Status: eventFormData.status })
            });
            if (response.ok) {
                setShowModal(false);
                setEditingEvent(null);
                fetchEvents();
            }
        } catch (error) {
            alert('Lỗi kết nối máy chủ.');
        }
    };

    const handleCreateTrafficAlert = (e: React.FormEvent) => {
        e.preventDefault();
        const newAlert: TrafficAlert = { id: Date.now(), title: trafficFormData.title, location: trafficFormData.location, type: trafficFormData.type, severity: trafficFormData.severity, is_active: true, created_at: 'Vừa xong' };
        setTrafficAlerts([newAlert, ...trafficAlerts]);
        setShowTrafficModal(false);
    };

    const toggleTrafficStatus = (id: number) => {
        setTrafficAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
    };

    const toggleFloodStatus = (id: number) => {
        setFloodZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !z.is_active, last_updated: 'Hôm nay' } : z));
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
        if (!window.confirm("Bạn có chắc chắn muốn mở khóa cho tài khoản này không?")) return;
        try { await userService.unbanUser(userId); fetchUsers(); } catch (error) {}
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
                setTwoFactorEnabled(true); setShowTwoFaQR(false); localStorage.setItem('is_2fa_enabled', '1');
            }
        } catch (error) {
            alert('Mã xác thực lỗi');
        }
    };

    const handleDisable2FA = async () => {
        try {
            await userService.disable2FA({ password: disable2FaPassword });
            setTwoFactorEnabled(false); setShowDisable2FaInput(false); localStorage.setItem('is_2fa_enabled', '0');
        } catch (error) {}
    };

    return (
        <AdminLayout activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
            {activeMenu === 'overview' && <OverviewTab events={events} trafficAlerts={trafficAlerts} floodZones={floodZones} />}
            {activeMenu === 'events' && (
                <EventsTab
                    events={events} loadingEvents={loadingEvents} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter} currentPage={currentPage} setCurrentPage={setCurrentPage}
                    showModal={showModal} setShowModal={setShowModal} editingEvent={editingEvent} setEditingEvent={setEditingEvent}
                    eventFormData={eventFormData} setEventFormData={setEventFormData} handleApproveEvent={handleApproveEvent}
                    handleDeleteEvent={handleDeleteEvent} handleCreateEvent={handleCreateEvent}
                />
            )}
            {activeMenu === 'traffic' && (
                <TrafficTab
                    trafficAlerts={trafficAlerts} toggleTrafficStatus={toggleTrafficStatus} showTrafficModal={showTrafficModal}
                    setShowTrafficModal={setShowTrafficModal} trafficFormData={trafficFormData} setTrafficFormData={setTrafficFormData}
                    handleCreateTrafficAlert={handleCreateTrafficAlert}
                />
            )}
            {activeMenu === 'flood' && <FloodTab floodZones={floodZones} toggleFloodStatus={toggleFloodStatus} />}
            {activeMenu === 'closure' && <ClosureTab roadClosures={roadClosures} />}
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
        </AdminLayout>
    );
}