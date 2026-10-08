import React from 'react';
import { RequestStatus, DocumentRequestStatus, ScheduleStatus } from '@/types';

type BadgeStatus = RequestStatus | DocumentRequestStatus | ScheduleStatus | string;

interface StatusBadgeProps {
    status: BadgeStatus;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
    const getBadgeStyle = (val: string) => {
        switch (val.toLowerCase()) {
            case 'issued':
            case 'completed':
            case 'released':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
            case 'verified':
            case 'approved':
            case 'confirmed':
                return 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
            case 'processing':
            case 'under_review':
            case 'scheduled':
                return 'bg-sky-50 text-sky-700 border-sky-200 font-medium';
            case 'ready':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
            case 'submitted':
            case 'pending':
            case 'requested':
                return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
            case 'rejected':
            case 'cancelled':
            case 'record_not_found':
            case 'voided':
                return 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
        }
    };

    const formatLabel = (val: string) => {
        return val.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide border shadow-sm ${getBadgeStyle(
                status
            )} ${className}`}
        >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
            {formatLabel(status)}
        </span>
    );
};

export default StatusBadge;
