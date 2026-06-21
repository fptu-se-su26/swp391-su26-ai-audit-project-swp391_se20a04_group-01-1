import React from 'react';
import { getEventStatus } from '../EventsLayer';

interface EventStatusBadgeProps {
    startTime: string;
    endTime?: string;
    /** EventDetailSidebar dùng size 'lg', EventsSidebar (danh sách) dùng 'sm' */
    size?: 'sm' | 'lg';
    className?: string;
}

const STATUS_CONFIG = {
    upcoming: {
        text: 'Sắp diễn ra',
        lgClass: 'bg-blue-50 text-blue-600 border-blue-200',
        smClass: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    ongoing: {
        text: 'Đang diễn ra',
        lgClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        smClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse-subtle',
    },
    ended: {
        text: 'Đã kết thúc',
        lgClass: 'bg-slate-100 text-slate-500 border-slate-200',
        smClass: 'bg-slate-100 text-slate-500 border-slate-200',
    },
} as const;

/**
 * Badge trạng thái sự kiện (Sắp diễn ra / Đang diễn ra / Đã kết thúc).
 * Trước đây logic statusText/statusClass bị lặp lại y hệt ở
 * EventDetailSidebar.tsx (size lớn) và EventsSidebar.tsx (size nhỏ trong list).
 */
export default function EventStatusBadge({ startTime, endTime, size = 'lg', className = '' }: EventStatusBadgeProps) {
    const status = getEventStatus(startTime, endTime);
    const config = STATUS_CONFIG[status];
    const sizeClass = size === 'lg'
        ? `text-[10px] font-extrabold px-2.5 py-1 ${config.lgClass}`
        : `text-[8px] font-bold px-1.5 py-0.5 ${config.smClass}`;

    return (
        <span className={`rounded-full border ${sizeClass} ${className}`}>
            {config.text}
        </span>
    );
}