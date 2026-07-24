import React, { useEffect, useRef, useState } from 'react';
import {
    Bell, BellOff, CloudRain, Calendar, AlertTriangle,
    Settings, CheckCheck, X, ChevronRight,
    MapPin, Clock, Info, ArrowRight
} from 'lucide-react';
import { useNotificationStore, AppNotification } from '../../../store/notificationStore';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onFlyToZone?: (notif: AppNotification) => void;
    onOpenEvent?: (eventId: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ trước`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Hôm qua';
    return `${diffD} ngày trước`;
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function groupNotifications(items: AppNotification[]) {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const older: AppNotification[] = [];
    const nowDay = new Date().toDateString();
    const yestDay = new Date(Date.now() - 86400000).toDateString();
    for (const n of items) {
        const day = new Date(n.created_at).toDateString();
        if (day === nowDay) today.push(n);
        else if (day === yestDay) yesterday.push(n);
        else older.push(n);
    }
    return { today, yesterday, older };
}

// ── Notification type config ──────────────────────────────────
function getTypeConfig(type: AppNotification['type']) {
    switch (type) {
        case 'traffic_alert':
            return {
                Icon: CloudRain,
                iconColor: 'text-red-500',
                bgColor: 'bg-red-50',
                badgeBg: 'bg-red-100',
                badgeText: 'text-red-600',
                borderColor: 'border-red-200',
                gradientFrom: 'from-red-500',
                gradientTo: 'to-rose-600',
                label: 'Cảnh báo ngập lụt / Giao thông',
            };
        case 'event_reminder':
            return {
                Icon: Calendar,
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-50',
                badgeBg: 'bg-blue-100',
                badgeText: 'text-blue-600',
                borderColor: 'border-blue-200',
                gradientFrom: 'from-blue-500',
                gradientTo: 'to-indigo-600',
                label: 'Nhắc nhở sự kiện',
            };
        case 'event_update':
            return {
                Icon: AlertTriangle,
                iconColor: 'text-amber-500',
                bgColor: 'bg-amber-50',
                badgeBg: 'bg-amber-100',
                badgeText: 'text-amber-600',
                borderColor: 'border-amber-200',
                gradientFrom: 'from-amber-500',
                gradientTo: 'to-orange-500',
                label: 'Cập nhật sự kiện',
            };
        default:
            return {
                Icon: Settings,
                iconColor: 'text-slate-500',
                bgColor: 'bg-slate-100',
                badgeBg: 'bg-slate-100',
                badgeText: 'text-slate-600',
                borderColor: 'border-slate-200',
                gradientFrom: 'from-slate-500',
                gradientTo: 'to-slate-600',
                label: 'Thông báo hệ thống',
            };
    }
}

// ── Detail Modal ──────────────────────────────────────────────
function NotificationDetailModal({
    notif,
    onClose,
    onOpenEvent,
    onFlyToZone,
}: {
    notif: AppNotification;
    onClose: () => void;
    onOpenEvent?: (id: number) => void;
    onFlyToZone?: (notif: AppNotification) => void;
}) {
    const cfg = getTypeConfig(notif.type);
    const { Icon } = cfg;
    const cleanMsg = notif.message?.replace(/\[zone_id:\d+\]/g, '').trim() || '';
    const modalRef = useRef<HTMLDivElement>(null);

    // Đóng khi click backdrop
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Đóng khi nhấn Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const hasAction =
        (notif.type === 'event_reminder' || notif.type === 'event_update') && notif.event_id
        || notif.type === 'traffic_alert';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ animation: 'fadeInBg 0.2s ease' }}>
            {/* Backdrop blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal card */}
            <div
                ref={modalRef}
                className="relative w-full max-w-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden"
                style={{ animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
                {/* Gradient header */}
                <div className={`relative bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} px-6 py-5`}>
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
                            <Icon size={24} className="text-white" />
                        </div>
                        <div>
                            <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest block mb-0.5">
                                {cfg.label}
                            </span>
                            <h3 className="text-white font-bold text-[15px] leading-snug pr-8">
                                {notif.title}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-4">
                    {/* Thời gian */}
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} className="flex-shrink-0" />
                        <span className="text-[12px]">
                            {formatDateTime(notif.created_at)}
                            <span className="text-slate-400 ml-1">· {getRelativeTime(notif.created_at)}</span>
                        </span>
                    </div>

                    {/* Nội dung chi tiết */}
                    {cleanMsg && (
                        <div className={`flex gap-3 p-4 rounded-2xl border ${cfg.borderColor} ${cfg.bgColor}`}>
                            <Info size={15} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
                            <p className="text-[13px] text-slate-700 leading-relaxed">{cleanMsg}</p>
                        </div>
                    )}

                    {/* Thông tin sự kiện liên quan */}
                    {notif.event_title && (
                        <div className="flex items-start gap-2 text-slate-600">
                            <MapPin size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                            <div>
                                <span className="text-[10px] text-slate-400 block">Sự kiện liên quan</span>
                                <span className="text-[13px] font-semibold text-slate-700">
                                    {notif.event_title}
                                </span>
                                {notif.event_start_time && (
                                    <span className="text-[11px] text-slate-400 block mt-0.5">
                                        Bắt đầu: {formatDateTime(notif.event_start_time)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Trạng thái đã đọc */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                        <span className="text-[11px] text-slate-400">
                            {notif.is_read ? 'Đã đọc' : 'Chưa đọc'}
                        </span>
                    </div>
                </div>

                {/* Action footer */}
                {hasAction && (
                    <div className="px-6 pb-5 pt-0 flex gap-2">
                        {(notif.type === 'event_reminder' || notif.type === 'event_update') && notif.event_id && onOpenEvent && (
                            <button
                                onClick={() => { onOpenEvent(notif.event_id!); onClose(); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo} text-white text-[12px] font-bold shadow-md hover:opacity-90 transition-opacity`}
                            >
                                <Calendar size={14} />
                                Xem sự kiện
                                <ArrowRight size={13} />
                            </button>
                        )}
                        {notif.type === 'traffic_alert' && onFlyToZone && (
                            <button
                                onClick={() => { onFlyToZone(notif); onClose(); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-[12px] font-bold shadow-md hover:opacity-90 transition-opacity"
                            >
                                <MapPin size={14} />
                                Xem trên bản đồ
                                <ArrowRight size={13} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-500 text-[12px] font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                )}

                {!hasAction && (
                    <div className="px-6 pb-5 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-[12px] font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                )}

                <style>{`
                    @keyframes fadeInBg {
                        from { opacity: 0; }
                        to   { opacity: 1; }
                    }
                    @keyframes popIn {
                        from { opacity: 0; transform: scale(0.88) translateY(10px); }
                        to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
}

// ── Icon wrapper (list) ──────────────────────────────────────
function NotifIcon({ type }: { type: AppNotification['type'] }) {
    const cfg = getTypeConfig(type);
    const { Icon } = cfg;
    return (
        <div className={`w-9 h-9 rounded-xl ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={cfg.iconColor} />
        </div>
    );
}

// ── Single notification row ──────────────────────────────────
function NotifRow({
    notif,
    onRead,
    onSelect,
}: {
    notif: AppNotification;
    onRead: (id: number) => void;
    onSelect: (n: AppNotification) => void;
}) {
    const cleanMsg = notif.message?.replace(/\[zone_id:\d+\]/g, '').trim() || '';

    return (
        <button
            onClick={() => {
                if (!notif.is_read) onRead(notif.notification_id);
                onSelect(notif);
            }}
            className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors group
                ${notif.is_read ? 'hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}
        >
            <NotifIcon type={notif.type} />

            <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug line-clamp-2 ${notif.is_read ? 'text-slate-600 font-normal' : 'text-slate-800 font-semibold'}`}>
                    {notif.title}
                </p>
                {cleanMsg && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                        {cleanMsg}
                    </p>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                    {getRelativeTime(notif.created_at)}
                </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
                {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                )}
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
            </div>
        </button>
    );
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
    return (
        <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────
export default function NotificationCenter({
    isOpen,
    onClose,
    onFlyToZone,
    onOpenEvent,
}: NotificationCenterProps) {
    const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
    const panelRef = useRef<HTMLDivElement>(null);
    const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

    // Fetch khi mở panel
    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen, fetchNotifications]);

    // Click ngoài để đóng panel (chỉ khi không có modal chi tiết)
    useEffect(() => {
        if (!isOpen || selectedNotif) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose, selectedNotif]);

    if (!isOpen) return null;

    const groups = groupNotifications(notifications);

    return (
        <>
            {/* Panel danh sách */}
            <div
                ref={panelRef}
                className="absolute right-0 top-[54px] w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[9999]"
                style={{ animation: 'slideDown 0.18s ease' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Bell size={16} className="text-slate-700" />
                        <span className="text-[13px] font-bold text-slate-800">Thông báo</span>
                        {unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Đánh dấu tất cả đã đọc"
                            >
                                <CheckCheck size={13} />
                                <span>Đọc tất cả</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="max-h-[420px] overflow-y-auto scrollbar-none">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10">
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!isLoading && notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <BellOff size={36} className="text-slate-200" />
                            <p className="text-[12px] text-slate-400 font-medium">Chưa có thông báo nào</p>
                        </div>
                    )}

                    {!isLoading && notifications.length > 0 && (
                        <>
                            {groups.today.length > 0 && (
                                <>
                                    <SectionHeader label="Hôm nay" />
                                    {groups.today.map(n => (
                                        <NotifRow key={n.notification_id} notif={n} onRead={markAsRead} onSelect={setSelectedNotif} />
                                    ))}
                                </>
                            )}
                            {groups.yesterday.length > 0 && (
                                <>
                                    <SectionHeader label="Hôm qua" />
                                    {groups.yesterday.map(n => (
                                        <NotifRow key={n.notification_id} notif={n} onRead={markAsRead} onSelect={setSelectedNotif} />
                                    ))}
                                </>
                            )}
                            {groups.older.length > 0 && (
                                <>
                                    <SectionHeader label="Cũ hơn" />
                                    {groups.older.map(n => (
                                        <NotifRow key={n.notification_id} notif={n} onRead={markAsRead} onSelect={setSelectedNotif} />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
                        <p className="text-[10px] text-slate-400 text-center">
                            Hiển thị {notifications.length} thông báo gần nhất
                        </p>
                    </div>
                )}

                <style>{`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-8px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>

            {/* Modal chi tiết */}
            {selectedNotif && (
                <NotificationDetailModal
                    notif={selectedNotif}
                    onClose={() => setSelectedNotif(null)}
                    onOpenEvent={onOpenEvent}
                    onFlyToZone={onFlyToZone}
                />
            )}
        </>
    );
}
