import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { PageProps, Parish, SacramentSchedule, ScheduleType } from '@/types';
import {
    parseSacramentDate,
    formatSacramentDate,
    formatSacramentTime,
    formatSacramentTimeRange,
} from '@/utils/date';
import {
    Calendar as CalendarIcon,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Church,
    CheckCircle2,
    FileText,
    Eye,
    Download,
    BookOpen,
    X,
    Filter,
    ShieldAlert,
    Info,
    CheckSquare,
    Users,
    Heart,
    Plus,
    Settings,
    MapPin,
    AlertCircle,
    SquareCheck,
    Check,
    Receipt,
} from 'lucide-react';

interface Props extends PageProps {
    schedules: SacramentSchedule[];
    parishes: Parish[];
    filters: {
        year: number;
        month: number;
        parish_id?: string;
        sacrament_type?: string;
        status?: string;
    };
    metrics?: {
        scheduled_count: number;
        completed_count: number;
        total_count: number;
    };
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({ schedules, parishes, filters, metrics }: Props) {
    const [selectedSchedule, setSelectedSchedule] = useState<SacramentSchedule | null>(null);
    const [selectedDaySchedules, setSelectedDaySchedules] = useState<{ dateStr: string; items: SacramentSchedule[] } | null>(null);

    const year = filters.year || new Date().getFullYear();
    const month = filters.month || (new Date().getMonth() + 1);

    // Helpers to navigate months
    const navigateMonth = (delta: number) => {
        let newMonth = month + delta;
        let newYear = year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        applyFilters({ year: newYear, month: newMonth });
    };

    const goToToday = () => {
        const today = new Date();
        applyFilters({ year: today.getFullYear(), month: today.getMonth() + 1 });
    };

    const applyFilters = (newFilters: Partial<typeof filters>) => {
        router.get('/schedules/calendar', {
            ...filters,
            ...newFilters,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Helper to format presider
    const getPresiderName = (schedule: SacramentSchedule): string => {
        if (schedule.presiding_clergy?.titled_name) {
            return schedule.presiding_clergy.titled_name;
        }
        if (schedule.presiding_clergy?.full_name) {
            return `Rev. Fr. ${schedule.presiding_clergy.full_name}`;
        }
        if (schedule.specific_data?.guest_priest_name) {
            return `Guest: ${schedule.specific_data.guest_priest_name}`;
        }
        if (schedule.requested_clergy?.titled_name) {
            return `Pref: ${schedule.requested_clergy.titled_name}`;
        }
        return 'Pending Assignment';
    };

    const getTimeRange = (schedule: SacramentSchedule): string => {
        if (schedule.formatted_time) {
            return schedule.formatted_time;
        }
        return formatSacramentTimeRange(schedule.starts_at, schedule.ends_at);
    };

    // Friendly sacrament type styling
    const getSacramentStyle = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t === 'baptism') {
            return {
                label: 'Baptism',
                badge: 'bg-sky-50 text-sky-800 border-sky-300 ring-sky-300',
                dot: 'bg-sky-500',
                card: 'border-l-4 border-l-sky-500 bg-sky-50/70 hover:bg-sky-100/90 text-sky-950',
            };
        }
        if (t === 'matrimony' || t === 'wedding') {
            return {
                label: 'Matrimony',
                badge: 'bg-purple-50 text-purple-800 border-purple-300 ring-purple-300',
                dot: 'bg-purple-500',
                card: 'border-l-4 border-l-purple-500 bg-purple-50/70 hover:bg-purple-100/90 text-purple-950',
            };
        }
        if (t === 'confirmation') {
            return {
                label: 'Confirmation',
                badge: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-300',
                dot: 'bg-amber-500',
                card: 'border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/90 text-amber-950',
            };
        }
        if (t === 'blessing') {
            return {
                label: 'Blessing',
                badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-300',
                dot: 'bg-emerald-500',
                card: 'border-l-4 border-l-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-950',
            };
        }
        if (t === 'funeral') {
            return {
                label: 'Mass / Blessing for Departed',
                badge: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-300',
                dot: 'bg-slate-500',
                card: 'border-l-4 border-l-slate-500 bg-slate-100/70 hover:bg-slate-200/90 text-slate-900',
            };
        }
        if (t === 'sponsored_mass') {
            return {
                label: 'Sponsored Mass',
                badge: 'bg-rose-50 text-rose-800 border-rose-300 ring-rose-300',
                dot: 'bg-rose-500',
                card: 'border-l-4 border-l-rose-500 bg-rose-50/70 hover:bg-rose-100/90 text-rose-950',
            };
        }
        if (t === 'bone_transfer' || t === 'transfer_of_bones') {
            return {
                label: 'Bone / Ash Transfer',
                badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 ring-zinc-300',
                dot: 'bg-zinc-600',
                card: 'border-l-4 border-l-zinc-600 bg-zinc-100/70 hover:bg-zinc-200/90 text-zinc-900',
            };
        }
        return {
            label: t.charAt(0).toUpperCase() + t.slice(1),
            badge: 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-indigo-300',
            dot: 'bg-indigo-500',
            card: 'border-l-4 border-l-indigo-500 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950',
        };
    };

    // Group schedules by YYYY-MM-DD
    const schedulesByDate = useMemo(() => {
        const map: Record<string, SacramentSchedule[]> = {};
        for (const item of schedules) {
            if (!item.starts_at) continue;
            const d = parseSacramentDate(item.starts_at);
            if (!d) continue;
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!map[dateKey]) {
                map[dateKey] = [];
            }
            map[dateKey].push(item);
        }

        // Sort items on each day in chronological order (by starts_at asc)
        for (const dateKey in map) {
            map[dateKey].sort((a, b) => {
                const da = parseSacramentDate(a.starts_at)?.getTime() || 0;
                const db = parseSacramentDate(b.starts_at)?.getTime() || 0;
                return da - db;
            });
        }

        return map;
    }, [schedules]);

    // Build month calendar grid (Sundays to Saturdays)
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0);

        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
        const daysInMonth = lastDayOfMonth.getDate();

        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const grid: {
            dateStr: string;
            dayNumber: number;
            isCurrentMonth: boolean;
            isToday: boolean;
            items: SacramentSchedule[];
        }[] = [];

        // Previous month padding days
        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const prevMonthDate = new Date(year, month - 2, dayNum);
            const key = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(prevMonthDate.getDate()).padStart(2, '0')}`;
            grid.push({
                dateStr: key,
                dayNumber: dayNum,
                isCurrentMonth: false,
                isToday: key === todayKey,
                items: schedulesByDate[key] || [],
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            grid.push({
                dateStr: key,
                dayNumber: day,
                isCurrentMonth: true,
                isToday: key === todayKey,
                items: schedulesByDate[key] || [],
            });
        }

        // Next month padding days to complete last week
        const remaining = 7 - (grid.length % 7);
        if (remaining < 7) {
            for (let day = 1; day <= remaining; day++) {
                const nextMonthDate = new Date(year, month, day);
                const key = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDate.getDate()).padStart(2, '0')}`;
                grid.push({
                    dateStr: key,
                    dayNumber: day,
                    isCurrentMonth: false,
                    isToday: key === todayKey,
                    items: schedulesByDate[key] || [],
                });
            }
        }

        return grid;
    }, [year, month, schedulesByDate]);

    // Format full date header
    const formattedMonthTitle = `${MONTH_NAMES[month - 1]} ${year}`;

    return (
        <PortalLayout
            title="Sacrament Schedules Calendar"
            subtitle="Chronological calendar of scheduled and completed sacrament appointments"
            activeTab="schedules_calendar"
        >
            <Head title={`Sacrament Calendar - ${formattedMonthTitle} - RCAL PIMS`} />

            {/* Invariant Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 mb-5 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                        <strong className="font-bold text-amber-800">RCAL Canonical Rule:</strong> This calendar manages scheduled and completed sacramental rites (Baptism, Confirmation, Matrimony, Funerals, Blessings). Mass Intentions are strictly excluded.
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/schedules/settings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded-lg text-xs transition-colors shadow-2xs"
                    >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        Settings &amp; Days
                    </Link>
                    <Link
                        href="/schedules/create"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Appointment
                    </Link>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 mb-5 pb-2">
                <Link
                    href="/schedules"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Appointments List</span>
                </Link>
                <Link
                    href="/schedules?tab=payments"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Payment Records (Cash)</span>
                </Link>
                <Link
                    href="/schedules/calendar"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-xs"
                >
                    <CalendarDays className="w-4 h-4" />
                    <span>Calendar View</span>
                </Link>
                <Link
                    href="/schedules/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Sacrament Settings &amp; Days</span>
                </Link>
            </div>

            {/* Calendar Control Bar: Month Switcher, Church Picker & Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Month / Year Switcher */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-2xs">
                            <button
                                onClick={() => navigateMonth(-1)}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                                title="Previous Month"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-sm font-bold text-slate-900 min-w-[150px] text-center font-serif">
                                {formattedMonthTitle}
                            </span>
                            <button
                                onClick={() => navigateMonth(1)}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                                title="Next Month"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            Today
                        </button>
                    </div>

                    {/* Summary Metric Counters */}
                    {metrics && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Scheduled: {metrics.scheduled_count}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Completed: {metrics.completed_count}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                                Total: {metrics.total_count}
                            </span>
                        </div>
                    )}
                </div>

                {/* Filters Row: Church Selector, Sacrament Type & Status */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Filter className="w-3.5 h-3.5 text-amber-600" />
                        <span>Filter:</span>
                    </div>

                    {/* Parish / Church Selector (For Archdiocesan or Multi-Church Staff) */}
                    {parishes.length > 1 ? (
                        <select
                            value={filters.parish_id || 'all'}
                            onChange={e => applyFilters({ parish_id: e.target.value })}
                            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                            <option value="all">All Accessible Churches ({parishes.length})</option>
                            {parishes.map(p => (
                                <option key={p.id} value={p.id.toString()}>
                                    {p.name} ({p.city_municipality})
                                </option>
                            ))}
                        </select>
                    ) : parishes.length === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            <Church className="w-3 h-3 text-amber-600" />
                            {parishes[0].name}
                        </span>
                    ) : null}

                    {/* Sacrament Type Filter */}
                    <select
                        value={filters.sacrament_type || 'all'}
                        onChange={e => applyFilters({ sacrament_type: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                    >
                        <option value="all">All Sacraments</option>
                        <option value="baptism">Baptism</option>
                        <option value="matrimony">Matrimony / Wedding</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="blessing">Blessing</option>
                        <option value="sponsored_mass">Sponsored Mass</option>
                        <option value="bone_transfer">Bone / Ash Transfer</option>
                        <option value="funeral">Mass / Blessing for Departed</option>
                        <option value="reconciliation">Reconciliation / Confession</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status || 'all'}
                        onChange={e => applyFilters({ status: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                    >
                        <option value="all">Scheduled &amp; Completed</option>
                        <option value="scheduled">Scheduled Only</option>
                        <option value="completed">Completed Only</option>
                    </select>

                    {(filters.parish_id || (filters.sacrament_type && filters.sacrament_type !== 'all') || (filters.status && filters.status !== 'all')) && (
                        <button
                            onClick={() => applyFilters({ parish_id: '', sacrament_type: 'all', status: 'all' })}
                            className="text-amber-700 hover:text-amber-800 font-semibold underline ml-1"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Month Calendar Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                {/* Day of Week Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {DAYS_OF_WEEK.map((day, idx) => (
                        <div
                            key={day}
                            className={`py-2.5 border-r last:border-r-0 border-slate-200 ${
                                idx === 0 || idx === 6 ? 'text-amber-800 bg-amber-50/40' : ''
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 divide-y divide-slate-200 bg-slate-200">
                    {calendarDays.map((dayObj, index) => {
                        const hasItems = dayObj.items.length > 0;
                        const visibleItems = dayObj.items.slice(0, 3);
                        const hiddenCount = dayObj.items.length - 3;

                        return (
                            <div
                                key={index}
                                className={`min-h-[125px] sm:min-h-[145px] p-2 flex flex-col justify-between transition-colors ${
                                    dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                                } border-r last:border-r-0 border-slate-200`}
                            >
                                {/* Day Number Header */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span
                                        className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full transition-all ${
                                            dayObj.isToday
                                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-300'
                                                : dayObj.isCurrentMonth
                                                ? 'text-slate-800'
                                                : 'text-slate-400'
                                        }`}
                                    >
                                        {dayObj.dayNumber}
                                    </span>

                                    {hasItems && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                            {dayObj.items.length} {dayObj.items.length === 1 ? 'rite' : 'rites'}
                                        </span>
                                    )}
                                </div>

                                {/* Strictly: Sacrament Type, Presider, Time in an ordered manner */}
                                <div className="space-y-1.5 flex-1 overflow-y-auto">
                                    {visibleItems.map(item => {
                                        const style = getSacramentStyle(item.sacrament_type);
                                        const presider = getPresiderName(item);
                                        const timeRange = getTimeRange(item);
                                        const isCompleted = item.status === 'completed';

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setSelectedSchedule(item)}
                                                className={`w-full text-left p-1.5 sm:p-2 rounded-lg border shadow-2xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] ${style.card}`}
                                                title={`Click to view details for ${style.label}`}
                                            >
                                                {/* Line 1: Sacrament Type with status dot */}
                                                <div className="flex items-center justify-between gap-1 leading-tight mb-0.5">
                                                    <span className="font-bold text-[11px] truncate flex items-center gap-1.5">
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                                isCompleted ? 'bg-blue-600' : 'bg-emerald-500'
                                                            }`}
                                                            title={isCompleted ? 'Completed' : 'Scheduled'}
                                                        ></span>
                                                        {style.label}
                                                    </span>
                                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded shrink-0 bg-white/70">
                                                        {isCompleted ? 'Done' : 'Sched'}
                                                    </span>
                                                </div>

                                                {/* Line 2: Presider */}
                                                <div className="text-[10px] font-medium text-slate-700 truncate flex items-center gap-1 leading-tight mb-0.5">
                                                    <User className="w-2.5 h-2.5 shrink-0 text-slate-500" />
                                                    <span className="truncate">{presider}</span>
                                                </div>

                                                {/* Line 3: Time */}
                                                <div className="text-[10px] text-slate-600 flex items-center gap-1 leading-tight font-semibold">
                                                    <Clock className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                                                    <span>{timeRange}</span>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {/* Overflow "+X more" button */}
                                    {hiddenCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDaySchedules({ dateStr: dayObj.dateStr, items: dayObj.items })}
                                            className="w-full text-center py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                                        >
                                            +{hiddenCount} more ceremonies
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* EXPANDED SCHEDULE DETAILS MODAL (Upon clicking a schedule card) */}
            {selectedSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setSelectedSchedule(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between border-b pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getSacramentStyle(selectedSchedule.sacrament_type).badge}`}>
                                        {getSacramentStyle(selectedSchedule.sacrament_type).label}
                                    </span>
                                    <StatusBadge status={selectedSchedule.status} />
                                </div>
                                <h3 className="font-serif text-lg font-bold text-slate-900">
                                    {selectedSchedule.title || `${getSacramentStyle(selectedSchedule.sacrament_type).label} Ceremony`}
                                </h3>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <Church className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{selectedSchedule.parish?.name || 'Parish Church'}</span>
                                    {selectedSchedule.venue?.name && (
                                        <span>• {selectedSchedule.venue.name}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSchedule(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Liturgical Schedule & Presider Details */}
                        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="font-semibold text-amber-900 block mb-0.5">Ceremony Date &amp; Time</span>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    {selectedSchedule.starts_at ? (
                                        parseSacramentDate(selectedSchedule.starts_at)?.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                    ) : 'Pending Date Assignment'}
                                </div>
                                <div className="text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    {getTimeRange(selectedSchedule)}
                                </div>
                            </div>

                            <div>
                                <span className="font-semibold text-amber-900 block mb-0.5">Officiating Presider</span>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    {getPresiderName(selectedSchedule)}
                                </div>
                                {selectedSchedule.requested_clergy && selectedSchedule.requested_clergy_id !== selectedSchedule.presiding_clergy_id && (
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Preferred Clergy Requested: {selectedSchedule.requested_clergy.titled_name}
                                    </div>
                                )}
                                {!selectedSchedule.requested_clergy && selectedSchedule.specific_data?.requested_guest_priest_name && (
                                    <div className="text-[11px] text-purple-700 mt-1">
                                        Visiting Priest Requested: {selectedSchedule.specific_data.requested_guest_priest_name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sacrament Subject Specifics */}
                        <div className="space-y-4 text-xs">
                            {/* Matrimony / Wedding Contracting Parties */}
                            {(selectedSchedule.sacrament_type === 'matrimony' || selectedSchedule.sacrament_type === 'wedding') && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                        <Heart className="w-4 h-4 text-purple-600" />
                                        Contracting Parties (Groom &amp; Bride)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Groom */}
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                            <span className="font-bold text-blue-900 block border-b pb-1">Groom (Husband)</span>
                                            <div><strong>Name:</strong> {selectedSchedule.specific_data?.groom_name || 'N/A'}</div>
                                            <div><strong>DOB:</strong> {selectedSchedule.specific_data?.groom_dob || 'N/A'}</div>
                                            <div><strong>Place of Birth:</strong> {selectedSchedule.specific_data?.groom_pob || 'N/A'}</div>
                                            <div><strong>Father:</strong> {selectedSchedule.specific_data?.groom_father_name || 'N/A'}</div>
                                            <div><strong>Mother:</strong> {selectedSchedule.specific_data?.groom_mother_name || 'N/A'}</div>
                                            <div><strong>Home Parish:</strong> {selectedSchedule.specific_data?.groom_parish || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.groom_is_foreign_or_ofw === 'yes' && (
                                                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                                    OFW / Foreigner: Freedom to Marry Cert Req.
                                                </span>
                                            )}
                                        </div>

                                        {/* Bride */}
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                            <span className="font-bold text-pink-900 block border-b pb-1">Bride (Wife)</span>
                                            <div><strong>Name:</strong> {selectedSchedule.specific_data?.bride_name || 'N/A'}</div>
                                            <div><strong>DOB:</strong> {selectedSchedule.specific_data?.bride_dob || 'N/A'}</div>
                                            <div><strong>Place of Birth:</strong> {selectedSchedule.specific_data?.bride_pob || 'N/A'}</div>
                                            <div><strong>Father:</strong> {selectedSchedule.specific_data?.bride_father_name || 'N/A'}</div>
                                            <div><strong>Mother:</strong> {selectedSchedule.specific_data?.bride_mother_name || 'N/A'}</div>
                                            <div><strong>Home Parish:</strong> {selectedSchedule.specific_data?.bride_parish || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.bride_is_foreign_or_ofw === 'yes' && (
                                                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                                    OFW / Foreigner: Freedom to Marry Cert Req.
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {selectedSchedule.specific_data?.witnesses && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <strong className="block text-slate-800 mb-0.5">Principal Witnesses / Sponsors:</strong>
                                            <p className="text-slate-600">{selectedSchedule.specific_data.witnesses}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Baptism Details */}
                            {selectedSchedule.sacrament_type === 'baptism' && (
                                <div className="space-y-3">
                                    {(selectedSchedule.baptism_type || selectedSchedule.specific_data?.baptism_type || selectedSchedule.amount || selectedSchedule.donation_amount || selectedSchedule.specific_data?.amount) && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                                            <div>
                                                <span className="text-amber-800 font-semibold block text-[10px] uppercase">Baptism Ceremony Type</span>
                                                <span className="font-bold text-amber-950 capitalize text-sm">
                                                    {(selectedSchedule.baptism_type || selectedSchedule.specific_data?.baptism_type) === 'solo' ? 'Solo / Special Baptism' : 'Regular Community Baptism'}
                                                </span>
                                            </div>
                                            {(selectedSchedule.amount ?? selectedSchedule.donation_amount ?? selectedSchedule.specific_data?.amount ?? selectedSchedule.specific_data?.donation_amount) && (
                                                <div className="text-right">
                                                    <span className="text-amber-800 font-semibold block text-[10px] uppercase">Sacrament Offering (Stipend)</span>
                                                    <span className="font-bold text-amber-950 text-sm">
                                                        ₱{Number(selectedSchedule.amount ?? selectedSchedule.donation_amount ?? selectedSchedule.specific_data?.amount ?? selectedSchedule.specific_data?.donation_amount).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                        <Users className="w-4 h-4 text-sky-600" />
                                        Candidate &amp; Parent Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Candidate:</strong> {selectedSchedule.specific_data?.child_name || 'N/A'}</div>
                                            <div><strong>Date of Birth:</strong> {selectedSchedule.specific_data?.dob || 'N/A'}</div>
                                            <div><strong>Birthplace:</strong> {selectedSchedule.specific_data?.place_of_birth || selectedSchedule.specific_data?.birthplace || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.gender && <div><strong>Gender:</strong> {selectedSchedule.specific_data?.gender}</div>}
                                            <div><strong>Marital Status:</strong> {selectedSchedule.specific_data?.parents_status || selectedSchedule.specific_data?.parents_marital_status || 'N/A'}</div>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Father:</strong> {selectedSchedule.specific_data?.father_name || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.father_dob && <div className="text-[11px] text-slate-600">Birthdate: {selectedSchedule.specific_data.father_dob}</div>}
                                            {selectedSchedule.specific_data?.father_pob && <div className="text-[11px] text-slate-600">Birth Place: {selectedSchedule.specific_data.father_pob}</div>}
                                            {selectedSchedule.specific_data?.father_address && <div className="text-[11px] text-slate-600">Address: {selectedSchedule.specific_data.father_address}</div>}

                                            <div className="border-t border-slate-200 pt-1 mt-1"><strong>Mother:</strong> {selectedSchedule.specific_data?.mother_name || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.mother_dob && <div className="text-[11px] text-slate-600">Birthdate: {selectedSchedule.specific_data.mother_dob}</div>}
                                            {selectedSchedule.specific_data?.mother_pob && <div className="text-[11px] text-slate-600">Birth Place: {selectedSchedule.specific_data.mother_pob}</div>}
                                            {selectedSchedule.specific_data?.mother_address && <div className="text-[11px] text-slate-600">Address: {selectedSchedule.specific_data.mother_address}</div>}
                                        </div>
                                    </div>
                                    {(selectedSchedule.specific_data?.godfather_name || selectedSchedule.specific_data?.godmother_name) ? (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                                            <strong className="block text-slate-800">Godparents / Sponsors (Ninong &amp; Ninang):</strong>
                                            {selectedSchedule.specific_data?.godfather_name && (
                                                <div>
                                                    <span className="font-semibold text-slate-800">Godfather (Ninong):</span> {selectedSchedule.specific_data.godfather_name}
                                                    {selectedSchedule.specific_data.godfather_pob && <span className="text-[11px] text-slate-500 ml-2">({selectedSchedule.specific_data.godfather_pob})</span>}
                                                    {selectedSchedule.specific_data.godfather_address && <div className="text-[11px] text-slate-500 pl-2">Address: {selectedSchedule.specific_data.godfather_address}</div>}
                                                </div>
                                            )}
                                            {selectedSchedule.specific_data?.godmother_name && (
                                                <div>
                                                    <span className="font-semibold text-slate-800">Godmother (Ninang):</span> {selectedSchedule.specific_data.godmother_name}
                                                    {selectedSchedule.specific_data.godmother_pob && <span className="text-[11px] text-slate-500 ml-2">({selectedSchedule.specific_data.godmother_pob})</span>}
                                                    {selectedSchedule.specific_data.godmother_address && <div className="text-[11px] text-slate-500 pl-2">Address: {selectedSchedule.specific_data.godmother_address}</div>}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        selectedSchedule.specific_data?.godparents && (
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                <strong className="block text-slate-800 mb-0.5">Godparents / Sponsors:</strong>
                                                <p className="text-slate-600">{selectedSchedule.specific_data.godparents}</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Confirmation Details */}
                            {selectedSchedule.sacrament_type === 'confirmation' && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                        <CheckSquare className="w-4 h-4 text-amber-600" />
                                        Candidate &amp; Sponsor Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Candidate:</strong> {selectedSchedule.specific_data?.candidate_name || 'N/A'}</div>
                                            <div><strong>Date of Birth:</strong> {selectedSchedule.specific_data?.candidate_dob || 'N/A'}</div>
                                            <div><strong>Gender:</strong> {selectedSchedule.specific_data?.candidate_gender || 'N/A'}</div>
                                            <div><strong>Parish of Baptism:</strong> {selectedSchedule.specific_data?.baptism_parish || 'N/A'}</div>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Sponsor / Godparent:</strong> {selectedSchedule.specific_data?.godparent_name || 'N/A'}</div>
                                            <div><strong>Sponsor Age:</strong> {selectedSchedule.specific_data?.godparent_age ? `${selectedSchedule.specific_data.godparent_age} yrs old` : 'N/A'}</div>
                                            <div><strong>Sponsor Certificate:</strong> {selectedSchedule.specific_data?.godparent_certificate_type === 'marriage' ? 'Catholic Marriage Cert' : 'Confirmation Cert'}</div>
                                            <div><strong>Vicinity:</strong> {selectedSchedule.specific_data?.confirmation_resides_within_parish === 'no' ? 'Outside Parish (Permit Required)' : 'Within Parish'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Blessing Details */}
                            {selectedSchedule.sacrament_type === 'blessing' && (
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                    <h4 className="font-bold text-slate-900 mb-2">Blessing Specifics</h4>
                                    <div><strong>Category:</strong> {selectedSchedule.specific_data?.blessing_category || 'House Blessing'}</div>
                                    <div><strong>Venue:</strong> {selectedSchedule.specific_data?.venue_type || 'Off-site'}</div>
                                    {selectedSchedule.specific_data?.complete_address && (
                                        <div><strong>Address:</strong> {selectedSchedule.specific_data.complete_address}</div>
                                    )}
                                    {selectedSchedule.specific_data?.onsite_contact_name && (
                                        <div><strong>Contact Person:</strong> {selectedSchedule.specific_data.onsite_contact_name} ({selectedSchedule.specific_data.onsite_contact_number})</div>
                                    )}
                                    <div className="bg-amber-50 p-2 rounded border border-amber-200 text-[11px] text-amber-900 font-semibold mt-2">
                                        Quotation Reminder: Php 100 + any amount of donation for the clergy
                                    </div>
                                </div>
                            )}

                            {/* Sponsored Mass Details */}
                            {selectedSchedule.sacrament_type === 'sponsored_mass' && (
                                <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2 text-xs">
                                    <h4 className="font-bold text-rose-950 flex items-center gap-1.5 text-sm">
                                        <Sparkles className="w-4 h-4 text-rose-600" /> Sponsored Mass Specifics
                                    </h4>
                                    <div className="space-y-1">
                                        <div><strong>Mass Location:</strong> {selectedSchedule.specific_data?.mass_location || 'Parish Church'}</div>
                                        <div><strong>Representative:</strong> {selectedSchedule.requester_name || selectedSchedule.specific_data?.representative_name || 'N/A'}</div>
                                        <div><strong>Address:</strong> {selectedSchedule.requester_address || selectedSchedule.specific_data?.address || 'N/A'}</div>
                                        <div><strong>Contact:</strong> {selectedSchedule.requester_contact || 'N/A'}</div>
                                    </div>
                                    <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 space-y-1">
                                        <div className="font-bold text-rose-900 text-[11px] uppercase">Intentions:</div>
                                        {selectedSchedule.specific_data?.sponsored_thanksgiving && (
                                            <div>✓ <strong>Thanksgiving of:</strong> {selectedSchedule.specific_data.sponsored_thanksgiving_of || 'Parishioner'}</div>
                                        )}
                                        {selectedSchedule.specific_data?.sponsored_wedding_anniversary && (
                                            <div>✓ <strong>Wedding Anniversary of:</strong> {selectedSchedule.specific_data.sponsored_wedding_anniversary_of || 'Couple'}</div>
                                        )}
                                        {selectedSchedule.specific_data?.sponsored_birthday && (
                                            <div>✓ <strong>Birthday of:</strong> {selectedSchedule.specific_data.sponsored_birthday_of || 'Celebrant'}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold text-rose-900 border-t border-rose-200 pt-2">
                                        <span>Quotation Total:</span>
                                        <span>₱{Number(selectedSchedule.specific_data?.amount || selectedSchedule.amount || 2000).toLocaleString()} (Base ₱2,000 + Add-ons)</span>
                                    </div>
                                </div>
                            )}

                            {/* Bone / Ash Transfer Details */}
                            {(selectedSchedule.sacrament_type === 'bone_transfer' || selectedSchedule.sacrament_type === 'transfer_of_bones') && (
                                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                                    <h4 className="font-bold text-zinc-900 flex items-center gap-1.5 text-sm">
                                        <Heart className="w-4 h-4 text-zinc-600" /> Bone / Ash Transfer Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <div><strong>Deceased:</strong> {selectedSchedule.specific_data?.deceased_name || 'N/A'}</div>
                                            <div><strong>Age at Death:</strong> {selectedSchedule.specific_data?.deceased_age || 'N/A'}</div>
                                            <div><strong>Civil Status:</strong> {selectedSchedule.specific_data?.deceased_civil_status || 'N/A'}</div>
                                            <div><strong>Children:</strong> {selectedSchedule.specific_data?.children_count || 'N/A'}</div>
                                            <div><strong>Residency Address:</strong> {selectedSchedule.specific_data?.deceased_address || 'N/A'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div><strong>Representative:</strong> {selectedSchedule.requester_name || selectedSchedule.specific_data?.representative_name || 'N/A'}</div>
                                            <div><strong>Representative Address:</strong> {selectedSchedule.requester_address || selectedSchedule.specific_data?.representative_address || 'N/A'}</div>
                                            <div><strong>Contact Number:</strong> {selectedSchedule.requester_contact || 'N/A'}</div>
                                            <div><strong>Destination Cemetery:</strong> {selectedSchedule.specific_data?.target_cemetery || 'N/A'}</div>
                                            <div><strong>Application Date:</strong> {selectedSchedule.specific_data?.date_today || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-zinc-200 text-[11px] text-zinc-700 font-semibold">
                                        Quotation Reminder: Php 100 + any amount of donation for the clergy
                                    </div>
                                </div>
                            )}

                            {/* Mass / Blessing for Departed Details */}
                            {selectedSchedule.sacrament_type === 'funeral' && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                        <Heart className="w-4 h-4 text-amber-600" />
                                        Mass / Blessing for Departed Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Deceased Name:</strong> {selectedSchedule.specific_data?.deceased_name || 'N/A'}</div>
                                            <div><strong>Date of Death:</strong> {selectedSchedule.specific_data?.date_of_death || 'N/A'}</div>
                                            <div><strong>Age:</strong> {selectedSchedule.specific_data?.deceased_age || 'N/A'}</div>
                                            <div><strong>Civil Status:</strong> {selectedSchedule.specific_data?.deceased_civil_status || 'N/A'}</div>
                                            <div><strong>Spouse:</strong> {selectedSchedule.specific_data?.spouse_name || 'N/A'}</div>
                                            <div><strong>Children Count:</strong> {selectedSchedule.specific_data?.children_count || 'N/A'}</div>
                                            <div><strong>Cause of Death:</strong> {selectedSchedule.specific_data?.cause_of_death || 'N/A'}</div>
                                        </div>
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                            <div><strong>Service:</strong> {[selectedSchedule.specific_data?.service_mass && 'Misa', selectedSchedule.specific_data?.service_blessing && 'Pagbabasbas'].filter(Boolean).join(' & ') || 'Mass / Blessing'}</div>
                                            <div><strong>Location:</strong> {selectedSchedule.specific_data?.mass_location || 'Parish Church'}</div>
                                            <div><strong>Registrant:</strong> {selectedSchedule.specific_data?.informant_name || selectedSchedule.requester_name || 'N/A'}</div>
                                            <div><strong>Contact Number:</strong> {selectedSchedule.specific_data?.informant_contact || selectedSchedule.requester_contact || 'N/A'}</div>
                                            {selectedSchedule.specific_data?.received_anointing_before_death && (
                                                <div>
                                                    <strong>Pahid ng Langis:</strong>{' '}
                                                    {selectedSchedule.specific_data.received_anointing_before_death === 'yes'
                                                        ? 'Oo (Nakatanggap bago pumanaw)'
                                                        : selectedSchedule.specific_data.received_anointing_before_death === 'no'
                                                        ? 'Hindi nakatanggap'
                                                        : 'Hindi sigurado'}
                                                </div>
                                            )}
                                            {selectedSchedule.specific_data?.burial_date && (
                                                <div><strong>Araw/Oras ng Libing:</strong> {selectedSchedule.specific_data.burial_date}</div>
                                            )}
                                            {selectedSchedule.specific_data?.burial_location && (
                                                <div><strong>Lugar ng Libingan:</strong> {selectedSchedule.specific_data.burial_location}</div>
                                            )}
                                            {selectedSchedule.specific_data?.character_traits && (
                                                <div className="mt-2 pt-2 border-t border-slate-200">
                                                    <strong>Character Traits (for Homily):</strong>
                                                    <p className="text-slate-600 text-xs mt-0.5">{selectedSchedule.specific_data.character_traits}</p>
                                                </div>
                                            )}
                                            {selectedSchedule.specific_data?.favorite_family_hobby && (
                                                <div className="mt-1">
                                                    <strong>Family Hobby / Memory:</strong>
                                                    <p className="text-slate-600 text-xs mt-0.5">{selectedSchedule.specific_data.favorite_family_hobby}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Requester Contact Info */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <span className="font-bold text-slate-900 block mb-1">Requester / Applicant Details</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                                    <div><strong>Name:</strong> {selectedSchedule.requester_name || selectedSchedule.requester_user?.display_name || 'N/A'}</div>
                                    <div><strong>Relationship:</strong> {selectedSchedule.requester_relationship || 'Self'}</div>
                                    <div><strong>Contact:</strong> {selectedSchedule.requester_contact || 'N/A'}</div>
                                    <div><strong>Email:</strong> {selectedSchedule.requester_email || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Canonical Register Citation (If Completed) */}
                            {selectedSchedule.status === 'completed' && (
                                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 text-emerald-700" />
                                            Canonical Handwritten Register Citation
                                        </span>
                                        {selectedSchedule.record_id && (
                                            <Link
                                                href={`/records/${selectedSchedule.record_id}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                                            >
                                                Open Canonical Register <Eye className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-emerald-900">
                                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Book Vol.</span>
                                            <span className="font-bold text-sm">{selectedSchedule.record?.book_number || selectedSchedule.specific_data?.transcription_details?.book_number || 'Vol. 1'}</span>
                                        </div>
                                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Page No.</span>
                                            <span className="font-bold text-sm">{selectedSchedule.record?.page_number || selectedSchedule.specific_data?.transcription_details?.page_number || '1'}</span>
                                        </div>
                                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Entry No.</span>
                                            <span className="font-bold text-sm">{selectedSchedule.record?.entry_number || selectedSchedule.specific_data?.transcription_details?.entry_number || '1'}</span>
                                        </div>
                                    </div>
                                    {selectedSchedule.record?.citation && (
                                        <div className="text-[11px] text-emerald-800">
                                            Official Canonical Citation: <span className="font-bold">{selectedSchedule.record.citation}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Physical Documents & Staff Reminders */}
                            {(selectedSchedule.staff_notes || selectedSchedule.document_checklist) && (
                                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                                        <Info className="w-4 h-4 text-blue-600" />
                                        Parish Office Notes &amp; Physical Documents Status
                                    </span>
                                    {selectedSchedule.staff_notes && (
                                        <p className="text-blue-900 bg-white/70 p-2.5 rounded-lg border border-blue-200 italic">
                                            &ldquo;{selectedSchedule.staff_notes}&rdquo;
                                        </p>
                                    )}
                                    {selectedSchedule.document_checklist && Object.keys(selectedSchedule.document_checklist).length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                                            {Object.entries(selectedSchedule.document_checklist).map(([k, checked]) => (
                                                <div key={k} className="flex items-center gap-1.5">
                                                    {checked ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0" />
                                                    ) : (
                                                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"></span>
                                                    )}
                                                    <span className={checked ? 'text-emerald-900 font-medium' : 'text-slate-500'}>
                                                        {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Uploaded Attachments */}
                            {selectedSchedule.attachments && selectedSchedule.attachments.length > 0 && (
                                <div className="space-y-2">
                                    <span className="font-bold text-slate-900 block">Uploaded Document Files ({selectedSchedule.attachments.length})</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedSchedule.attachments.map(att => (
                                            <div key={att.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                                <div className="truncate mr-2">
                                                    <span className="font-semibold block text-slate-800 capitalize truncate">
                                                        {att.document_type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Attached file</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <a
                                                        href={`/schedule-attachments/${att.id}/view`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                                                        title="View Attachment"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </a>
                                                    <a
                                                        href={`/schedule-attachments/${att.id}/download`}
                                                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                                                        title="Download Attachment"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between border-t pt-4">
                            <Link
                                href={`/schedules?date=${selectedSchedule.starts_at?.slice(0, 10)}`}
                                className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline flex items-center gap-1"
                            >
                                View in Schedule Table <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setSelectedSchedule(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERFLOW DAY CEREMONIES MODAL */}
            {selectedDaySchedules && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setSelectedDaySchedules(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-serif text-base font-bold text-slate-900">
                                    All Rites for {parseSacramentDate(selectedDaySchedules.dateStr)?.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedDaySchedules.items.length} ceremonies scheduled or completed on this date
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDaySchedules(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {selectedDaySchedules.items.map(item => {
                                const style = getSacramentStyle(item.sacrament_type);
                                const presider = getPresiderName(item);
                                const timeRange = getTimeRange(item);
                                const isCompleted = item.status === 'completed';

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedDaySchedules(null);
                                            setSelectedSchedule(item);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer ${style.card}`}
                                    >
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="font-bold text-xs flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-blue-600' : 'bg-emerald-500'}`}></span>
                                                {style.label}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80">
                                                {isCompleted ? 'Completed' : 'Scheduled'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-700 flex items-center gap-1.5 mb-1 font-medium">
                                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                                            <span>{presider}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-semibold">
                                            <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                                            <span>{timeRange}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="border-t pt-3 flex justify-end">
                            <button
                                onClick={() => setSelectedDaySchedules(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
