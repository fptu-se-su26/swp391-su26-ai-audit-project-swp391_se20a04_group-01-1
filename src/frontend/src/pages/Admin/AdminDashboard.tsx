import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Navigation, LogOut, Menu, Bell, Plus, Search, Filter,
    Edit2, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Calendar, Users, MapPin, Flag, X, AlertCircle, Clock, FileText, Save,
    CalendarPlus, Settings, BarChart3, MessageSquare, LogIn
} from 'lucide-react';

interface Event {
    id: number;
    image: string;
    title: string;
    location: string;
    date: string;
    time: string;
    status: 'LIVE' | 'Sắp diễn ra' | 'Đã kết thúc';
    crowd: 'Cao' | 'Bình thường' | 'Cao';
}

const mockEvents: Event[] = [
    { id: 1, image: '🎆', title: 'Lễ hội Pháo hoa DIFF 2026', location: 'Sông Hàn, Đà Nẵng', date: '24/05/2026', time: '20:00 - 22:00', status: 'LIVE', crowd: 'Cao' },
    { id: 2, image: '🎵', title: 'Đêm nhạc Acoustic bên bờ biển', location: 'Biển Mỹ Khê', date: '10/06/2026', time: '19:00 - 22:00', status: 'Sắp diễn ra', crowd: 'Bình thường' },
    { id: 3, image: '🏮', title: 'Hội An Lantern Festival', location: 'Phố cổ Hội An', date: '20/06/2026', time: '17:00 - 23:00', status: 'Sắp diễn ra', crowd: 'Cao' },
    { id: 4, image: '🏃', title: 'Danang International Marathon', location: 'Cầu Rồng, Đà Nẵng', date: '15/08/2026', time: '05:00 - 10:00', status: 'Sắp diễn ra', crowd: 'Cao' },
    { id: 5, image: '🍜', title: 'Da Nang Food Festival', location: 'Công viên 29/3', date: '01/05/2026', time: '09:00 - 21:00', status: 'Đã kết thúc', crowd: 'Cao' },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [formData, setFormData] = useState({
        Title: '',
        TimeRange: '',
        EventDate: '',
        Location: '',
        Status: 'Sắp diễn ra',
        IsLive: false,
        CrowdLevel: 'Bình thường',
        Description: ''
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedEvents(mockEvents.map(e => e.id));
        } else {
            setSelectedEvents([]);
        }
    };

    const handleSelectEvent = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedEvents([...selectedEvents, id]);
        } else {
            setSelectedEvents(selectedEvents.filter(e => e !== id));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('✅ Lưu sự kiện thành công!');
                setFormData({
                    Title: '', TimeRange: '', EventDate: '', Location: '',
                    Status: 'Sắp diễn ra', IsLive: false, CrowdLevel: 'Bình thường', Description: ''
                });
                setTimeout(() => {
                    setShowModal(false);
                    setMessage('');
                }, 1500);
            } else {
                setMessage('❌ Lỗi: ' + (data.message || 'Không thể lưu sự kiện'));
            }
        } catch (error) {
            setMessage('❌ Không thể kết nối tới Server.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'LIVE':
                return { bg: '#fee2e2', color: '#dc2626', label: 'LIVE', pulse: true };
            case 'Sắp diễn ra':
                return { bg: '#fef3c7', color: '#b45309', label: 'Sắp diễn ra', pulse: false };
            case 'Đã kết thúc':
                return { bg: '#f3f4f6', color: '#6b7280', label: 'Đã kết thúc', pulse: false };
            default:
                return { bg: '#f3f4f6', color: '#6b7280', label: 'Khác', pulse: false };
        }
    };

    const getCrowdStyle = (crowd: string) => {
        switch (crowd) {
            case 'Cao':
                return { bg: '#fee2e2', color: '#dc2626', label: 'Cao' };
            case 'Bình thường':
                return { bg: '#d1fae5', color: '#059669', label: 'Bình thường' };
            default:
                return { bg: '#f3f4f6', color: '#6b7280', label: 'Thấp' };
        }
    };

    const paginatedEvents = mockEvents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(mockEvents.length / rowsPerPage);

    const menuItems = [
        { icon: BarChart3, label: 'Tổng quan', active: true },
        { icon: Calendar, label: 'Sự kiện', submenu: ['Danh sách sự kiện', 'Thêm sự kiện mới'] },
        { icon: Users, label: 'Người dùng' },
        { icon: MapPin, label: 'Địa điểm' },
        { icon: AlertCircle, label: 'Thống báo' },
        { icon: BarChart3, label: 'Báo cáo' },
        { icon: Settings, label: 'Cài đặt' },
    ];

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ============ NAVBAR ============ */}
            <nav style={{
                backgroundColor: '#2563EB',
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0' }}>
                        <Menu size={24} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                        <Navigation size={24} />
                        <span>DaNang EventMap</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Bell size={20} style={{ cursor: 'pointer' }} />
                        <div style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>1</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer' }}>
                        <div style={{ width: '28px', height: '28px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👨‍💼</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>Admin</span>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>Quản trị viên</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ============ MAIN LAYOUT ============ */}
            <div style={{ display: 'flex', flex: 1 }}>
                {/* ============ SIDEBAR ============ */}
                {sidebarOpen && (
                    <div style={{ width: '220px', backgroundColor: '#f0f4ff', borderRight: '1px solid #e5e7eb', padding: '16px', overflowY: 'auto', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                        {menuItems.map((item, i) => {
                            const IconComponent = item.icon;
                            return (
                                <div key={i}>
                                    <div style={{
                                        padding: '10px 12px',
                                        backgroundColor: item.active ? '#2563EB' : 'transparent',
                                        color: item.active ? 'white' : '#6b7280',
                                        borderRadius: '6px',
                                        marginBottom: '6px',
                                        fontSize: '13px',
                                        fontWeight: item.active ? '600' : '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s ease'
                                    }}
                                        onMouseOver={(e) => {
                                            if (!item.active) {
                                                e.currentTarget.style.backgroundColor = '#e0e7ff';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!item.active) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <IconComponent size={16} />
                                        {item.label}
                                    </div>
                                    {item.submenu && (
                                        <div style={{ paddingLeft: '24px', fontSize: '12px' }}>
                                            {item.submenu.map((sub, j) => (
                                                <div key={j} style={{ padding: '6px 0', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}>
                                                    {sub}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <hr style={{ margin: '16px 0', borderColor: '#e5e7eb' }} />
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#6b7280',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                                e.currentTarget.style.color = '#dc2626';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#6b7280';
                            }}
                        >
                            <LogOut size={16} />
                            Đăng xuất
                        </button>
                    </div>
                )}

                {/* ============ MAIN CONTENT ============ */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    {/* ============ PAGE TITLE ============ */}
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>Tổng quan</h1>

                    {/* ============ KPI CARDS ============ */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        {[
                            { icon: '📅', label: 'Tổng sự kiện', value: 125, link: 'Xem chi tiết →', trend: 8, up: true },
                            { icon: '📡', label: 'Sự kiện đang LIVE', value: 8, link: 'Xem chi tiết →', trend: 2, up: true },
                            { icon: '👥', label: 'Tổng người dùng', value: 1240, link: 'Xem chi tiết →', trend: 120, up: true },
                            { icon: '🚩', label: 'Báo cáo chờ xử lý', value: 3, link: 'Xem chi tiết →', trend: 1, up: false }
                        ].map((kpi, i) => (
                            <div key={i} style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '28px' }}>{kpi.icon}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: kpi.up ? '#22c55e' : '#ef4444' }}>
                                        {kpi.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {kpi.trend}
                                    </div>
                                </div>
                                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>{kpi.value}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{kpi.label}</p>
                                <p style={{ fontSize: '12px', color: '#2563EB', cursor: 'pointer' }}>{kpi.link}</p>
                            </div>
                        ))}
                    </div>

                    {/* ============ MAIN TABLE SECTION ============ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                        {/* ============ TABLE ============ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937' }}>Sự kiện mới nhất</h3>
                                <button
                                    onClick={() => setShowModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#2563EB',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
                                >
                                    <Plus size={14} />
                                    Thêm sự kiện mới
                                </button>
                            </div>

                            {/* Search & Filter */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '6px 10px' }}>
                                    <Search size={14} style={{ color: '#9ca3af' }} />
                                    <input type="text" placeholder="Tìm kiếm sự kiện..." style={{ flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', marginLeft: '6px', fontSize: '12px' }} />
                                </div>
                                <select style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    <option>Trạng thái</option>
                                    <option>LIVE</option>
                                    <option>Sắp diễn ra</option>
                                </select>
                                <select style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    <option>Mức độ đông đúc</option>
                                    <option>Cao</option>
                                    <option>Bình thường</option>
                                </select>
                            </div>

                            {/* Bulk Actions Bar */}
                            {selectedEvents.length > 0 && (
                                <div style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#EFF6FF',
                                    borderBottom: '1px solid #bfdbfe',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563EB' }}>
                                        {selectedEvents.length} sự kiện được chọn
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={{ padding: '6px 12px', backgroundColor: 'white', color: '#2563EB', border: '1px solid #2563EB', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                            Chuyển trạng thái
                                        </button>
                                        <button style={{ padding: '6px 12px', backgroundColor: 'white', color: '#2563EB', border: '1px solid #2563EB', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                            Xuất CSV
                                        </button>
                                        <button style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', width: '30px' }}>
                                                <input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedEvents.length === mockEvents.length && mockEvents.length > 0} />
                                            </th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Sự kiện</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Ngày diễn ra</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Trạng thái</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Mức độ</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedEvents.map((event) => {
                                            const statusStyle = getStatusStyle(event.status);
                                            const crowdStyle = getCrowdStyle(event.crowd);
                                            const isSelected = selectedEvents.includes(event.id);
                                            return (
                                                <tr key={event.id} style={{
                                                    backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    transition: 'background-color 0.2s ease'
                                                }}>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => handleSelectEvent(event.id, e.target.checked)}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ fontSize: '24px' }}>{event.image}</div>
                                                            <div>
                                                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>{event.title}</p>
                                                                <p style={{ fontSize: '11px', color: '#6b7280' }}>📍 {event.location}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>{event.date}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            backgroundColor: statusStyle.bg,
                                                            color: statusStyle.color,
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            position: 'relative',
                                                            animation: statusStyle.pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                                                        }}>
                                                            {statusStyle.label}
                                                            {statusStyle.pulse && <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#dc2626', borderRadius: '50%', marginLeft: '4px', animation: 'pulse 2s' }} />}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            backgroundColor: crowdStyle.bg,
                                                            color: crowdStyle.color,
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {crowdStyle.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        <button title="Chỉnh sửa" style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#2563EB', padding: '4px' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button title="Xóa" style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                                    <span>Hiển thị {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, mockEvents.length)} trong {mockEvents.length} sự kiện</span>
                                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer' }}>
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>
                                        <ChevronLeft size={14} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: currentPage === page ? '#2563EB' : 'white',
                                                color: currentPage === page ? 'white' : '#6b7280',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ============ RIGHT SIDEBAR - THÊM SỰ KIỆN FORM ============ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', height: 'fit-content', maxHeight: '600px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>Thêm sự kiện mới</h3>

                            <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Tên sự kiện (*)</label>
                                    <input type="text" name="Title" value={formData.Title} onChange={handleChange} placeholder="VD: Lễ hội Pháo hoa" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Khung giờ</label>
                                    <input type="text" name="TimeRange" value={formData.TimeRange} onChange={handleChange} placeholder="20:00 - 22:00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Ngày diễn ra</label>
                                    <input type="text" name="EventDate" value={formData.EventDate} onChange={handleChange} placeholder="24/05/2026" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Địa điểm</label>
                                    <input type="text" name="Location" value={formData.Location} onChange={handleChange} placeholder="Cảng Sông Hàn, Đà Nẵng" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Trạng thái</label>
                                    <select name="Status" value={formData.Status} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}>
                                        <option value="Sắp diễn ra">Sắp diễn ra</option>
                                        <option value="LIVE">LIVE</option>
                                        <option value="Đã kết thúc">Đã kết thúc</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Mức độ đông</label>
                                    <select name="CrowdLevel" value={formData.CrowdLevel} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}>
                                        <option value="Bình thường">Bình thường</option>
                                        <option value="Cao">Cao</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="checkbox" id="IsLive" name="IsLive" checked={formData.IsLive} onChange={handleChange} style={{ width: '14px', height: '14px' }} />
                                    <label htmlFor="IsLive" style={{ fontSize: '11px', fontWeight: '500', color: '#1f2937', cursor: 'pointer' }}>Gắn nhãn LIVE</label>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Mô tả</label>
                                    <textarea name="Description" value={formData.Description} onChange={handleChange} rows={2} placeholder="Nhập mô tả..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', resize: 'none' }} />
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px',
                                        backgroundColor: loading ? '#9ca3af' : '#2563EB',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        marginTop: '8px'
                                    }}
                                >
                                    <Save size={14} />
                                    {loading ? 'Đang lưu...' : 'LƯU SỰ KIỆN'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ============ HOẠT ĐỘNG GẦN ĐÂY ============ */}
                    <div style={{ marginTop: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937' }}>Hoạt động gần đây</h3>
                            <p style={{ fontSize: '12px', color: '#2563EB', cursor: 'pointer' }}>Xem tất cả</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '3px solid #2563EB' }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Admin đã thêm sự kiện "Lễ hội Pháo hoa DIFF 2026"</p>
                                <p style={{ fontSize: '11px', color: '#6b7280' }}>5 phút trước</p>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>User Trần Thị B đã báo cáo sự kiện không phù hợp</p>
                                <p style={{ fontSize: '11px', color: '#6b7280' }}>2 giờ trước</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ MODAL ============ */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #e5e7eb',
                            background: 'linear-gradient(to right, #2563EB, #4f46e5)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CalendarPlus size={24} />
                                <h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>Thêm Sự Kiện Mới</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {message && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
                                    color: message.includes('✅') ? '#065f46' : '#991b1b'
                                }}>
                                    {message}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Tên sự kiện (*)</label>
                                <input required type="text" name="Title" value={formData.Title} onChange={handleChange} placeholder="VD: Lễ hội Pháo hoa DIFF 2026" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Khung giờ</label>
                                    <input required type="text" name="TimeRange" value={formData.TimeRange} onChange={handleChange} placeholder="20:00 - 22:00" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Ngày diễn ra</label>
                                    <input required type="text" name="EventDate" value={formData.EventDate} onChange={handleChange} placeholder="24/05/2026" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Địa điểm</label>
                                <input required type="text" name="Location" value={formData.Location} onChange={handleChange} placeholder="Cảng Sông Hàn, Đà Nẵng" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Trạng thái</label>
                                    <select name="Status" value={formData.Status} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}>
                                        <option value="Sắp diễn ra">Sắp diễn ra</option>
                                        <option value="LIVE">LIVE</option>
                                        <option value="Đã kết thúc">Đã kết thúc</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Mức độ đông</label>
                                    <select name="CrowdLevel" value={formData.CrowdLevel} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}>
                                        <option value="Bình thường">Bình thường</option>
                                        <option value="Cao">Cao</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="IsLiveModal" name="IsLive" checked={formData.IsLive} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                                <label htmlFor="IsLiveModal" style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', cursor: 'pointer' }}>Sự kiện đang diễn ra ngay lúc này (Gắn nhãn LIVE)</label>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>Mô tả chi tiết</label>
                                <textarea name="Description" value={formData.Description} onChange={handleChange} rows={3} placeholder="Nhập thông tin giới thiệu sự kiện..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', resize: 'none' }} />
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', justifyContent: 'flex-end', backgroundColor: '#f9fafb' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '10px 16px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#1f2937',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 16px',
                                    backgroundColor: loading ? '#9ca3af' : '#2563EB',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                <Save size={14} />
                                {loading ? 'Đang lưu...' : 'Lưu sự kiện'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            `}</style>
        </div>
    );
}