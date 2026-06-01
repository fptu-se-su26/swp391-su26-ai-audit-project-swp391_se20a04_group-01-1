import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Calendar, Users, MapPin, Flag, X, AlertCircle, Clock, Save, AlertTriangle, Car,
    Waves, RouteOff, BarChart3, CheckCircle2, RefreshCw, Shield, Lock, Key, Copy, Check
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend
} from 'recharts';
import AdminLayout from '../../layouts/AdminLayout';
import * as authService from '../../services/authService';
import * as userService from '../../services/userService';

// ============ INTERFACES & MOCKS ============
interface DBEvent {
    event_id: number;
    title: string;
    short_description?: string;
    description?: string;
    location_name?: string;
    latitude: number;
    longitude: number;
    start_time: string;
    end_time: string;
    status: string; // 'pending', 'approved', 'cancelled'
    view_count: number;
}

interface TrafficAlert {
    id: number;
    title: string;
    location: string;
    type: 'CONGESTION' | 'ACCIDENT' | 'CONSTRUCTION';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    is_active: boolean;
    created_at: string;
}

interface FloodZone {
    id: number;
    name: string;
    district: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    is_active: boolean;
    last_updated: string;
}

interface RoadClosure {
    id: number;
    road_name: string;
    event_title: string;
    restriction_type: 'CLOSED' | 'ONE_WAY' | 'SPEED_LIMIT';
    time_frame: string;
}

// Mock Data for charts
const chartDataTraffic = [
    { hour: '07:00', 'Kẹt xe': 45, 'Thông thoáng': 80 },
    { hour: '09:00', 'Kẹt xe': 85, 'Thông thoáng': 40 },
    { hour: '12:00', 'Kẹt xe': 60, 'Thông thoáng': 65 },
    { hour: '15:00', 'Kẹt xe': 50, 'Thông thoáng': 75 },
    { hour: '17:00', 'Kẹt xe': 95, 'Thông thoáng': 30 },
    { hour: '19:00', 'Kẹt xe': 70, 'Thông thoáng': 50 },
];

const chartDataEvents = [
    { name: 'Tháng 1', 'Sự kiện': 12 },
    { name: 'Tháng 2', 'Sự kiện': 18 },
    { name: 'Tháng 3', 'Sự kiện': 25 },
    { name: 'Tháng 4', 'Sự kiện': 40 },
    { name: 'Tháng 5', 'Sự kiện': 65 },
    { name: 'Tháng 6', 'Sự kiện': 85 },
];

export default function AdminDashboard() {
    const [activeMenu, setActiveMenu] = useState('overview');

    // States for Events (fetched from API + Local mock as fallback)
    const [events, setEvents] = useState<DBEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DBEvent | null>(null);

    // Form State for Event
    const [eventFormData, setEventFormData] = useState({
        title: '',
        short_description: '',
        description: '',
        location_name: '',
        latitude: 16.0544,
        longitude: 108.2022,
        start_time: '',
        end_time: '',
        status: 'pending',
        category_id: 1
    });

    // States for Traffic, Flood, Closure tabs (Mock database arrays)
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

    // Modal Form for Traffic Alert
    const [showTrafficModal, setShowTrafficModal] = useState(false);
    const [trafficFormData, setTrafficFormData] = useState({
        title: '',
        location: '',
        type: 'CONGESTION' as 'CONGESTION' | 'ACCIDENT' | 'CONSTRUCTION',
        severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH'
    });

    // States for Settings (Change Password & User Ban Management)
    const [pwdFormData, setPwdFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdMessage, setPwdMessage] = useState('');
    const [pwdError, setPwdError] = useState(false);

    interface ManageUser {
        id: number;
        username: string;
        email: string;
        role: string;
        is_active: boolean;
        ban_reason?: string;
    }

    const [adminUsers, setAdminUsers] = useState<ManageUser[]>([
        { id: 1, username: 'johndoe123', email: 'johndoe@gmail.com', role: 'user', is_active: true },
        { id: 2, username: 'tranb456', email: 'tranb@gmail.com', role: 'user', is_active: true },
        { id: 3, username: 'nguyenc789', email: 'nguyenc@gmail.com', role: 'user', is_active: false, ban_reason: 'Spam báo cáo kẹt xe giả' },
        { id: 4, username: 'danang_mod', email: 'mod@danang.gov.vn', role: 'admin', is_active: true }
    ]);
    const [showBanModal, setShowBanModal] = useState(false);
    const [userToBan, setUserToBan] = useState<ManageUser | null>(null);
    const [banReason, setBanReason] = useState('');

    // States for 2FA Settings
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFaQRCode, setTwoFaQRCode] = useState<string | null>(null);
    const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
    const [totpConfirmCode, setTotpConfirmCode] = useState('');
    const [showTwoFaQR, setShowTwoFaQR] = useState(false);
    const [showDisable2FaInput, setShowDisable2FaInput] = useState(false);
    const [disable2FaPassword, setDisable2FaPassword] = useState('');
    const [twoFaMessage, setTwoFaMessage] = useState('');
    const [twoFaError, setTwoFaError] = useState(false);

    // Pagination for Events
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    useEffect(() => {
        fetchEvents();
        fetchAdminSecuritySettings();
    }, []);

    const fetchAdminSecuritySettings = async () => {
        try {
            const result = await userService.getSecuritySettings();
            if (result && result.data) {
                setTwoFactorEnabled(result.data.two_factor_enabled || false);
            }
        } catch (error) {
            console.log('Failed to fetch security settings, using local mock state.');
            const stored = localStorage.getItem('is_2fa_enabled');
            setTwoFactorEnabled(stored === '1');
        }
    };

    // ============ ACTIONS ============
    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const response = await fetch('http://localhost:5001/api/events');
            if (response.ok) {
                const result = await response.json();
                setEvents(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch events from backend, using placeholder events.', error);
            // Fallback mock events
            setEvents([
                { event_id: 1, title: 'Lễ hội Pháo hoa DIFF 2026', short_description: 'Lễ hội pháo hoa quốc tế hoành tráng bên sông Hàn.', description: 'DIFF 2026 quy tụ 8 đội thi...', location_name: 'Sông Hàn, Sơn Trà, Đà Nẵng', latitude: 16.0722, longitude: 108.2255, start_time: '2026-06-24T20:00', end_time: '2026-06-24T22:00', status: 'approved', view_count: 3200 },
                { event_id: 2, title: 'Danang International Marathon', short_description: 'Giải chạy marathon quốc tế thường niên.', description: 'Hàng ngàn vận động viên tham gia chạy dọc bờ biển.', location_name: 'Công viên Biển Đông, Sơn Trà', latitude: 16.0711, longitude: 108.2433, start_time: '2026-08-15T04:00', end_time: '2026-08-15T11:00', status: 'pending', view_count: 850 },
                { event_id: 3, title: 'Đêm nhạc Acoustic bãi biển', short_description: 'Giao lưu nhạc nhẹ tại bãi tắm Mỹ An.', description: 'Sự kiện âm nhạc miễn phí cho du khách.', location_name: 'Bãi biển Mỹ An, Ngũ Hành Sơn', latitude: 16.0441, longitude: 108.2522, start_time: '2026-06-10T19:00', end_time: '2026-06-10T22:00', status: 'approved', view_count: 1450 }
            ]);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleApproveEvent = async (id: number, currentStatus: string) => {
        const nextStatus = currentStatus === 'approved' ? 'pending' : 'approved';
        setEvents(prev => prev.map(e => e.event_id === id ? { ...e, status: nextStatus } : e));
        // Thường gọi API UPDATE /api/events/:id ở đây
    };

    const handleDeleteEvent = async (id: number) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này không?')) {
            setEvents(prev => prev.filter(e => e.event_id !== id));
            // Thường gọi API DELETE /api/events/:id ở đây
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    Title: eventFormData.title,
                    Description: eventFormData.description,
                    Location: eventFormData.location_name,
                    EventDate: eventFormData.start_time.split('T')[0],
                    TimeRange: `${eventFormData.start_time.split('T')[1] || '00:00'} - ${eventFormData.end_time.split('T')[1] || '00:00'}`,
                    Status: eventFormData.status
                })
            });

            if (response.ok) {
                alert('Tạo sự kiện thành công!');
                setShowModal(false);
                fetchEvents();
                // Reset form
                setEventFormData({
                    title: '', short_description: '', description: '', location_name: '',
                    latitude: 16.0544, longitude: 108.2022, start_time: '', end_time: '',
                    status: 'pending', category_id: 1
                });
            } else {
                alert('Lưu sự kiện thành công! (Mô phỏng lưu database offline)');
                // Thêm cục bộ để test UI
                const newEvt: DBEvent = {
                    event_id: Date.now(),
                    title: eventFormData.title,
                    short_description: eventFormData.short_description,
                    description: eventFormData.description,
                    location_name: eventFormData.location_name,
                    latitude: eventFormData.latitude,
                    longitude: eventFormData.longitude,
                    start_time: eventFormData.start_time,
                    end_time: eventFormData.end_time,
                    status: eventFormData.status,
                    view_count: 0
                };
                setEvents([newEvt, ...events]);
                setShowModal(false);
            }
        } catch (error) {
            alert('Lỗi kết nối máy chủ. Đã cập nhật ngoại tuyến.');
        }
    };

    const handleCreateTrafficAlert = (e: React.FormEvent) => {
        e.preventDefault();
        const newAlert: TrafficAlert = {
            id: Date.now(),
            title: trafficFormData.title,
            location: trafficFormData.location,
            type: trafficFormData.type,
            severity: trafficFormData.severity,
            is_active: true,
            created_at: 'Vừa xong'
        };
        setTrafficAlerts([newAlert, ...trafficAlerts]);
        setShowTrafficModal(false);
        setTrafficFormData({ title: '', location: '', type: 'CONGESTION', severity: 'MEDIUM' });
    };

    const toggleTrafficStatus = (id: number) => {
        setTrafficAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
    };

    const toggleFloodStatus = (id: number) => {
        setFloodZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !z.is_active, last_updated: 'Hôm nay' } : z));
    };

    // Filtered Events
    const filteredEvents = events.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.location_name && e.location_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const paginatedEvents = filteredEvents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(filteredEvents.length / rowsPerPage);

    // ============ SUB-VIEWS RENDERERS ============

    // 1. Tab Overview
    const renderOverview = () => {
        const liveCount = events.filter(e => e.status === 'approved').length; // Mock Approved as Active
        return (
            <div className="space-y-8 animate-fade-in">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Calendar size={24} />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <TrendingUp size={14} className="mr-1" /> +12%
                            </span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-500">Tổng sự kiện</h4>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{events.length}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <TrendingUp size={14} className="mr-1" /> +2
                            </span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-500">Sự kiện hoạt động (Approved)</h4>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{liveCount}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <Car size={24} />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                                <TrendingDown size={14} className="mr-1" /> -5%
                            </span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-500">Cảnh báo kẹt xe</h4>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{trafficAlerts.filter(t => t.is_active).length}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                <Waves size={24} />
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Ổn định
                            </span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-500">Điểm ngập báo động</h4>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{floodZones.filter(z => z.is_active && z.risk_level === 'HIGH').length}</p>
                    </div>
                </div>

                {/* Graph Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Traffic Density Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-blue-600" />
                            Biến động mật độ giao thông ngày thường (Phút cao điểm)
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartDataTraffic}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="Kẹt xe" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Thông thoáng" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Events Growth Area Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" />
                            Tổng quan Sự kiện được số hóa theo tháng
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartDataEvents}>
                                    <defs>
                                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="Sự kiện" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bottom Activity Grid */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-800">Hoạt động điều phối gần đây</h3>
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem toàn bộ nhật ký</button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-700">Phê duyệt sự kiện "Lễ hội pháo hoa quốc tế DIFF 2026"</p>
                                <p className="text-xs text-slate-400 mt-1"></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-700">Kích hoạt cảnh báo Đỏ: Ngập úng nghiêm trọng nút giao Hàm Nghi</p>
                                <p className="text-xs text-slate-400 mt-1"></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-700">Điều chỉnh lộ trình khẩn cấp: Đóng làn Cầu Rồng hướng Đông-Tây</p>
                                <p className="text-xs text-slate-400 mt-1"></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 2. Tab Events Management
    const renderEvents = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Search & Actions Header */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    {/* Left Filters */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm sự kiện, địa điểm..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="approved">Đã phê duyệt (Approved)</option>
                            <option value="pending">Chờ phê duyệt (Pending)</option>
                            <option value="cancelled">Đã hủy (Cancelled)</option>
                        </select>
                    </div>

                    {/* Right Create Button */}
                    <button
                        onClick={() => { setEditingEvent(null); setShowModal(true); }}
                        className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/10 shrink-0"
                    >
                        <Plus size={16} />
                        Thêm sự kiện mới
                    </button>
                </div>

                {/* Table Data */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {loadingEvents ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                                <p className="text-slate-500 text-sm">Đang lấy danh sách sự kiện...</p>
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-2">
                                <AlertCircle className="text-slate-300" size={48} />
                                <p className="text-slate-600 font-semibold text-sm">Không tìm thấy sự kiện nào</p>
                                <p className="text-slate-400 text-xs">Vui lòng điều chỉnh từ khóa tìm kiếm hoặc lọc trạng thái.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-6">Tên sự kiện</th>
                                        <th className="py-4 px-6">Ngày / Giờ diễn ra</th>
                                        <th className="py-4 px-6">Trạng thái</th>
                                        <th className="py-4 px-6">Lượt xem</th>
                                        <th className="py-4 px-6 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                    {paginatedEvents.map((evt) => (
                                        <tr key={evt.event_id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{evt.title}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5">📍 {evt.location_name || 'Không xác định'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col text-slate-600 text-xs">
                                                    <span>{evt.start_time.replace('T', ' ')}</span>
                                                    <span className="text-[10px] text-slate-400">Đến {evt.end_time.replace('T', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <button
                                                    onClick={() => handleApproveEvent(evt.event_id, evt.status)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${evt.status === 'approved'
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/50'
                                                            : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100/50'
                                                        }`}
                                                >
                                                    {evt.status === 'approved' ? 'Approved' : 'Pending'}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-500 font-bold">
                                                {evt.view_count.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingEvent(evt);
                                                            setEventFormData({
                                                                title: evt.title,
                                                                short_description: evt.short_description || '',
                                                                description: evt.description || '',
                                                                location_name: evt.location_name || '',
                                                                latitude: evt.latitude,
                                                                longitude: evt.longitude,
                                                                start_time: evt.start_time,
                                                                end_time: evt.end_time,
                                                                status: evt.status,
                                                                category_id: 1
                                                            });
                                                            setShowModal(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(evt.event_id)}
                                                        className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 3. Tab Traffic Management
    const renderTraffic = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header Actions */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <h3 className="text-base font-bold text-slate-800">Thông báo Sự cố giao thông thời gian thực</h3>
                    <button
                        onClick={() => setShowTrafficModal(true)}
                        className="bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-orange-700 transition flex items-center gap-2 text-sm shadow-md"
                    >
                        <Plus size={16} /> Báo cáo sự cố khẩn
                    </button>
                </div>

                {/* Grid Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {trafficAlerts.map(alert => (
                        <div key={alert.id} className={`bg-white rounded-2xl border p-5 shadow-sm relative overflow-hidden transition ${alert.is_active ? 'border-orange-200' : 'border-slate-200 opacity-60'}`}>
                            {/* Accent Glow Line */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${!alert.is_active ? 'bg-slate-300' :
                                    alert.severity === 'HIGH' ? 'bg-red-500' :
                                        alert.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-blue-500'
                                }`} />

                            <div className="flex items-start justify-between mt-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${alert.type === 'CONGESTION' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                        alert.type === 'ACCIDENT' ? 'bg-red-50 border-red-200 text-red-600' :
                                            'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}>
                                    {alert.type === 'CONGESTION' ? 'Kẹt xe' : alert.type === 'ACCIDENT' ? 'Tai nạn' : 'Thi công'}
                                </span>

                                <span className="text-[10px] text-slate-400 font-medium">{alert.created_at}</span>
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm mt-3 leading-snug">{alert.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">📍 {alert.location}</p>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                <span className={`text-xs font-bold ${alert.severity === 'HIGH' ? 'text-red-500' :
                                        alert.severity === 'MEDIUM' ? 'text-orange-500' : 'text-blue-500'
                                    }`}>
                                    Cấp độ: {alert.severity}
                                </span>

                                <button
                                    onClick={() => toggleTrafficStatus(alert.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${alert.is_active
                                            ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                        }`}
                                >
                                    {alert.is_active ? 'Gỡ cảnh báo' : 'Kích hoạt lại'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // 4. Tab Flood Management
    const renderFlood = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Quản lý điểm ngập úng đô thị</h3>
                    <p className="text-xs text-slate-400">Các điểm ngập sẽ hiển thị vùng đệm màu đỏ trên bản đồ để cảnh báo định tuyến tránh lũ của người dùng.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-4 px-6">Khu vực ngập úng</th>
                                <th className="py-4 px-6">Quận huyện</th>
                                <th className="py-4 px-6">Mức độ rủi ro</th>
                                <th className="py-4 px-6">Cập nhật lần cuối</th>
                                <th className="py-4 px-6 text-center">Trạng thái Cảnh báo</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                            {floodZones.map(zone => (
                                <tr key={zone.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-4 px-6 font-semibold text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Waves size={18} className={zone.is_active ? 'text-blue-500' : 'text-slate-400'} />
                                            {zone.name}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-500">{zone.district}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${zone.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                zone.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {zone.risk_level}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-400">{zone.last_updated}</td>
                                    <td className="py-4 px-6 text-center">
                                        <button
                                            onClick={() => toggleFloodStatus(zone.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${zone.is_active
                                                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50'
                                                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {zone.is_active ? 'Đang ngập (Bật vùng đệm)' : 'Bình thường (Tắt)'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 5. Tab Closure Management (Event Roads)
    const renderClosure = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Hạn chế Giao thông và Cấm đường tạm thời</h3>
                    <p className="text-xs text-slate-400">Các tuyến đường bị chặn sẽ được thiết kế để công cụ định tuyến tự động phân luồng tránh cấm đường.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-4 px-6">Tuyến đường hạn chế</th>
                                <th className="py-4 px-6">Do Sự kiện / Lý do</th>
                                <th className="py-4 px-6">Phương thức hạn chế</th>
                                <th className="py-4 px-6">Khung giờ ảnh hưởng</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                            {roadClosures.map(closure => (
                                <tr key={closure.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-4 px-6 font-semibold text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <RouteOff size={18} className="text-red-500" />
                                            {closure.road_name}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-600 font-medium">{closure.event_title}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${closure.restriction_type === 'CLOSED'
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : closure.restriction_type === 'ONE_WAY'
                                                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                                                    : 'bg-blue-50 border-blue-200 text-blue-600'
                                            }`}>
                                            {closure.restriction_type === 'CLOSED' ? 'Cấm hoàn toàn' :
                                                closure.restriction_type === 'ONE_WAY' ? 'Đường một chiều' : 'Hạn chế tốc độ'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-bold">{closure.time_frame}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const handleChangePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError(false);
        setPwdMessage('');

        if (!pwdFormData.currentPassword || !pwdFormData.newPassword || !pwdFormData.confirmPassword) {
            setPwdError(true);
            setPwdMessage('Vui lòng điền đầy đủ thông tin mật khẩu!');
            return;
        }
        if (pwdFormData.newPassword !== pwdFormData.confirmPassword) {
            setPwdError(true);
            setPwdMessage('Mật khẩu mới nhập lại không khớp!');
            return;
        }
        if (pwdFormData.newPassword.length < 8) {
            setPwdError(true);
            setPwdMessage('Mật khẩu mới phải có ít nhất 8 ký tự!');
            return;
        }

        setPwdMessage('✅ Đổi mật khẩu thành công!');
        setPwdFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleUnbanUser = (id: number) => {
        setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: true, ban_reason: undefined } : u));
    };

    const handleConfirmBan = () => {
        if (userToBan) {
            setAdminUsers(prev => prev.map(u => u.id === userToBan.id ? { ...u, is_active: false, ban_reason: banReason || 'Không có lý do cụ thể' } : u));
            setShowBanModal(false);
            setUserToBan(null);
            setBanReason('');
        }
    };

    const handleSetup2FA = async () => {
        setTwoFaError(false);
        setTwoFaMessage('');
        try {
            const result = await authService.setup2FA();
            if (result && result.data && result.data.qrCodeUrl) {
                setTwoFaQRCode(result.data.qrCodeUrl);
                setTwoFaSecret(result.data.secret || 'JBSWY3DPEHPK3PXP');
                setShowTwoFaQR(true);
            } else if (result && result.qrCodeUrl) {
                setTwoFaQRCode(result.qrCodeUrl);
                setTwoFaSecret(result.secret || 'JBSWY3DPEHPK3PXP');
                setShowTwoFaQR(true);
            } else {
                throw new Error("Không nhận được mã QR.");
            }
        } catch (error) {
            console.warn('Failed to setup 2FA via API, using local mock fallback.');
            setTwoFaQRCode('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/DanangSmart:admin@danang.gov.vn?secret=JBSWY3DPEHPK3PXP&issuer=DanangSmart');
            setTwoFaSecret('JBSWY3DPEHPK3PXP');
            setShowTwoFaQR(true);
            setTwoFaMessage('Đang chạy ở chế độ offline. Dưới đây là mã QR mô phỏng.');
            setTwoFaError(false);
        }
    };

    const handleConfirm2FA = async () => {
        if (!totpConfirmCode || totpConfirmCode.length !== 6) {
            setTwoFaError(true);
            setTwoFaMessage('Vui lòng nhập đúng mã xác thực 6 chữ số!');
            return;
        }
        setTwoFaError(false);
        setTwoFaMessage('');
        try {
            await authService.confirm2FA(totpConfirmCode);
            setTwoFactorEnabled(true);
            setShowTwoFaQR(false);
            setTotpConfirmCode('');
            setTwoFaQRCode(null);
            setTwoFaSecret(null);
            localStorage.setItem('is_2fa_enabled', '1');
            setTwoFaMessage('✅ Bật xác thực 2 lớp (2FA) thành công!');
        } catch (error) {
            console.warn('Failed to confirm 2FA via API, using local mock fallback.');
            if (/^\d{6}$/.test(totpConfirmCode)) {
                setTwoFactorEnabled(true);
                setShowTwoFaQR(false);
                setTotpConfirmCode('');
                setTwoFaQRCode(null);
                setTwoFaSecret(null);
                localStorage.setItem('is_2fa_enabled', '1');
                setTwoFaMessage('✅ Bật xác thực 2 lớp (2FA) thành công (Mô phỏng offline)!');
            } else {
                setTwoFaError(true);
                setTwoFaMessage('Mã xác thực không hợp lệ. Vui lòng nhập lại!');
            }
        }
    };

    const handleDisable2FA = async () => {
        if (!disable2FaPassword) {
            setTwoFaError(true);
            setTwoFaMessage('Vui lòng nhập mật khẩu để tắt 2FA!');
            return;
        }
        setTwoFaError(false);
        setTwoFaMessage('');
        try {
            await userService.disable2FA({ password: disable2FaPassword });
            setTwoFactorEnabled(false);
            setShowDisable2FaInput(false);
            setDisable2FaPassword('');
            localStorage.setItem('is_2fa_enabled', '0');
            setTwoFaMessage('✅ Đã tắt xác thực 2 lớp (2FA) thành công!');
        } catch (error) {
            console.warn('Failed to disable 2FA via API, using local mock fallback.');
            setTwoFactorEnabled(false);
            setShowDisable2FaInput(false);
            setDisable2FaPassword('');
            localStorage.setItem('is_2fa_enabled', '0');
            setTwoFaMessage('✅ Đã tắt xác thực 2 lớp (2FA) thành công (Mô phỏng offline)!');
        }
    };

    const renderSettings = () => {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Đổi Mật Khẩu */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Key size={18} className="text-blue-500" />
                            Thay đổi mật khẩu tài khoản
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">Đảm bảo mật khẩu của bạn có độ dài tối thiểu 8 ký tự và bao gồm các chữ cái, chữ số.</p>

                        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                {pwdMessage && (
                                    <div className={`p-3 rounded-xl text-xs font-semibold ${pwdError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {pwdMessage}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={pwdFormData.currentPassword}
                                        onChange={(e) => setPwdFormData({ ...pwdFormData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                                        value={pwdFormData.newPassword}
                                        onChange={(e) => setPwdFormData({ ...pwdFormData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={pwdFormData.confirmPassword}
                                        onChange={(e) => setPwdFormData({ ...pwdFormData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition text-sm shadow-md mt-6 animate-pulse-subtle"
                            >
                                Cập nhật mật khẩu
                            </button>
                        </form>
                    </div>

                    {/* Bảo mật 2 lớp (2FA) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Shield size={18} className="text-emerald-500" />
                                    Xác thực 2 lớp (2FA)
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    twoFactorEnabled
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                        : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                    {twoFactorEnabled ? 'Đã bật' : 'Chưa kích hoạt'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-6">
                                Bảo vệ tài khoản quản trị bằng lớp bảo mật bổ sung. Khi đăng nhập thiết bị lạ, bạn sẽ cần cung cấp mã 6 chữ số từ ứng dụng Google Authenticator.
                            </p>

                            {twoFaMessage && (
                                <div className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${
                                    twoFaError
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                    {twoFaMessage}
                                </div>
                            )}

                            {/* Khi 2FA đã bật */}
                            {twoFactorEnabled && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                                        <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                                        <span>Tài khoản của bạn đã được bảo vệ bởi xác thực hai lớp (2FA).</span>
                                    </div>

                                    {showDisable2FaInput ? (
                                        <div className="space-y-3 p-4 bg-slate-50 border border-slate-150 rounded-xl">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu xác nhận</label>
                                            <input
                                                type="password"
                                                placeholder="Nhập mật khẩu hiện tại"
                                                value={disable2FaPassword}
                                                onChange={(e) => setDisable2FaPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleDisable2FA}
                                                    className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition text-xs shadow-sm"
                                                >
                                                    Xác nhận Tắt 2FA
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowDisable2FaInput(false);
                                                        setDisable2FaPassword('');
                                                    }}
                                                    className="px-3 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-300 transition text-xs"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDisable2FaInput(true)}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold py-2.5 rounded-xl transition text-sm shadow-sm"
                                        >
                                            Tắt xác thực 2 lớp
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Khi 2FA chưa bật và đang hiển thị QR code cấu hình */}
                            {!twoFactorEnabled && showTwoFaQR && (
                                <div className="space-y-4 p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <span className="text-xs font-semibold text-slate-600">Quét mã dưới đây bằng Google Authenticator</span>
                                        {twoFaQRCode && (
                                            <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-inner">
                                                <img src={twoFaQRCode} alt="Mã QR 2FA" className="w-40 h-40" />
                                            </div>
                                        )}
                                        {twoFaSecret && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                                                <span>Key: {twoFaSecret}</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(twoFaSecret || '');
                                                        alert('Đã copy mã bí mật!');
                                                    }}
                                                    className="text-blue-500 hover:text-blue-600"
                                                    title="Copy mã bí mật"
                                                    type="button"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã xác thực OTP (6 chữ số)</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="Nhập mã 6 chữ số"
                                            value={totpConfirmCode}
                                            onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleConfirm2FA}
                                                className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition text-xs shadow-sm"
                                            >
                                                Xác thực & Kích hoạt
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowTwoFaQR(false);
                                                    setTwoFaQRCode(null);
                                                    setTwoFaSecret(null);
                                                    setTotpConfirmCode('');
                                                }}
                                                className="px-3 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-300 transition text-xs"
                                            >
                                                Hủy bỏ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Khi 2FA chưa bật và chưa bấm kích hoạt */}
                            {!twoFactorEnabled && !showTwoFaQR && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                                        <Lock size={20} className="shrink-0 text-slate-400" />
                                        <span>Lớp bảo mật chưa được cấu hình. Nhấp nút bên dưới để bắt đầu thiết lập.</span>
                                    </div>
                                    <button
                                        onClick={handleSetup2FA}
                                        className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition text-sm shadow-md"
                                    >
                                        Thiết lập xác thực 2 lớp (2FA)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quản Lý Người Dùng & Khóa Tài Khoản */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
                    <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Users size={18} className="text-purple-500" />
                        Quản lý & Khóa tài khoản (Ban User)
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">Danh sách người dùng đăng ký ứng dụng. Cho phép Admin khóa/mở khóa tài khoản vi phạm chính sách.</p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Vai trò</th>
                                    <th className="py-3 px-4 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                                {adminUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-slate-800">{user.username}</span>
                                                {user.ban_reason && (
                                                    <span className="text-[10px] text-red-500 font-semibold mt-0.5">Lý do khóa: {user.ban_reason}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-left">{user.email}</td>
                                        <td className="py-3 px-4 text-left">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {user.role === 'admin' ? (
                                                <span className="text-[10px] text-slate-400 font-medium italic">Không thể khóa Admin</span>
                                            ) : user.is_active ? (
                                                <button
                                                    onClick={() => {
                                                        setUserToBan(user);
                                                        setBanReason('');
                                                        setShowBanModal(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition"
                                                >
                                                    Khóa (Ban)
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnbanUser(user.id)}
                                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg font-bold transition"
                                                >
                                                    Mở khóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout activeMenu={activeMenu} setActiveMenu={setActiveMenu}>

            {/* View Dispatcher */}
            {activeMenu === 'overview' && renderOverview()}
            {activeMenu === 'events' && renderEvents()}
            {activeMenu === 'traffic' && renderTraffic()}
            {activeMenu === 'flood' && renderFlood()}
            {activeMenu === 'closure' && renderClosure()}
            {activeMenu === 'settings' && renderSettings()}

            {/* ============ MODAL: THÊM SỰ KIỆN MỚI (TAB EVENTS) ============ */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {editingEvent ? 'Chỉnh Sửa Sự Kiện' : 'Thêm Sự Kiện Mới'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên sự kiện (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Lễ hội pháo hoa quốc tế DIFF"
                                    value={eventFormData.title}
                                    onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian bắt đầu (*)</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={eventFormData.start_time}
                                        onChange={(e) => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian kết thúc (*)</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={eventFormData.end_time}
                                        onChange={(e) => setEventFormData({ ...eventFormData, end_time: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm tổ chức (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Cảng Sông Hàn, Đà Nẵng"
                                    value={eventFormData.location_name}
                                    onChange={(e) => setEventFormData({ ...eventFormData, location_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái ban đầu</label>
                                    <select
                                        value={eventFormData.status}
                                        onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="pending">Pending (Chờ duyệt)</option>
                                        <option value="approved">Approved (Duyệt ngay)</option>
                                        <option value="cancelled">Cancelled (Hủy bỏ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại danh mục</label>
                                    <select
                                        value={eventFormData.category_id}
                                        onChange={(e) => setEventFormData({ ...eventFormData, category_id: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value={1}>Lễ hội lớn (Festival)</option>
                                        <option value={2}>Hòa nhạc (Music Event)</option>
                                        <option value={3}>Thể thao (Sports)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn gọn</label>
                                <input
                                    type="text"
                                    placeholder="Mô tả tóm tắt sự kiện dưới 100 chữ..."
                                    value={eventFormData.short_description}
                                    onChange={(e) => setEventFormData({ ...eventFormData, short_description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chi tiết sự kiện</label>
                                <textarea
                                    rows={3}
                                    placeholder="Nội dung giới thiệu chi tiết sự kiện cho người dùng..."
                                    value={eventFormData.description}
                                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-1"
                                >
                                    <Save size={16} /> Lưu sự kiện
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL: BÁO CÁO SỰ CỐ (TAB TRAFFIC) ============ */}
            {showTrafficModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Báo Cáo Sự Cố Giao Thông Khẩn
                            </h3>
                            <button onClick={() => setShowTrafficModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateTrafficAlert} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả sự cố (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Kẹt xe kéo dài, có va chạm..."
                                    value={trafficFormData.title}
                                    onChange={(e) => setTrafficFormData({ ...trafficFormData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm xảy ra (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Nút giao Lê Duẩn - Bạch Đằng"
                                    value={trafficFormData.location}
                                    onChange={(e) => setTrafficFormData({ ...trafficFormData, location: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phân loại sự cố</label>
                                    <select
                                        value={trafficFormData.type}
                                        onChange={(e) => setTrafficFormData({ ...trafficFormData, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                    >
                                        <option value="CONGESTION">Kẹt xe nghiêm trọng</option>
                                        <option value="ACCIDENT">Tai nạn giao thông</option>
                                        <option value="CONSTRUCTION">Đường đang thi công</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mức độ cảnh báo</label>
                                    <select
                                        value={trafficFormData.severity}
                                        onChange={(e) => setTrafficFormData({ ...trafficFormData, severity: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                    >
                                        <option value="LOW">Thấp (LOW)</option>
                                        <option value="MEDIUM">Trung bình (MEDIUM)</option>
                                        <option value="HIGH">Báo động Đỏ (HIGH)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowTrafficModal(false)}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-1"
                                >
                                    <CheckCircle2 size={16} /> Kích hoạt Cảnh báo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL: BAN USER (TAB SETTINGS) ============ */}
            {showBanModal && userToBan && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 animate-pulse" />
                                Khóa Tài Khoản: {userToBan.username}
                            </h3>
                            <button onClick={() => { setShowBanModal(false); setUserToBan(null); }} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500 text-left">
                                Vui lòng nhập lý do khóa tài khoản này. Người dùng sẽ không thể đăng nhập vào ứng dụng cho đến khi được mở khóa.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Lý do khóa (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Vi phạm điều khoản, spam báo cáo giả..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowBanModal(false); setUserToBan(null); }}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmBan}
                                    disabled={!banReason}
                                    className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition shadow-md"
                                >
                                    Khóa tài khoản
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}