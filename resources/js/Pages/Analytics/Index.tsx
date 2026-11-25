import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

interface CertBreakdown {
    total: number;
    baptism: number;
    confirmation: number;
}

interface AppointmentBreakdown {
    total: number;
    baptism: number;
    confirmation: number;
    marriage: number;
    funeral: number;
    others: number;
}

interface AccountCodeItem {
    account_code: string;
    account_name: string;
    label: string;
    total: number;
    entry_count: number;
}

interface FiltersState {
    parish_id: number | null;
    period: 'all' | 'year' | 'month' | 'day';
    year: number;
    month: string;
    date: string;
}

interface AnalyticsProps {
    sacraments: {
        certificates: {
            pending: CertBreakdown;
            processed: CertBreakdown;
        };
        appointments: {
            pending: AppointmentBreakdown;
            completed: AppointmentBreakdown;
        };
        descriptive: {
            records_by_type: Record<string, number>;
            schedule_stats: Record<string, number>;
            monthly_trends: Array<{ month: string; count: number; is_forecast: boolean }>;
            summary: {
                total_records: number;
                monthly_average: number;
                monthly_std_dev: number;
                pending_certificates: number;
            };
        };
        predictive: {
            slope: number;
            trend_direction: string;
            forecast: Array<{ month: string; predicted_count: number; is_forecast: boolean }>;
        };
        prescriptive: Array<{
            priority: string;
            title: string;
            insight: string;
            action: string;
        }>;
    };
    finance: {
        summary: {
            total_cash_in: number;
            total_cash_out: number;
            net_total: number;
            is_surplus: boolean;
        };
        inflow_by_account: AccountCodeItem[];
        outflow_by_account: AccountCodeItem[];
        monthly_cashflow: Array<{
            month: string;
            cash_in: number;
            cash_out: number;
        }>;
    };
    parishes: Array<{ id: number; name: string }>;
    isArchdioceseWide: boolean;
    userHomeParish?: { id: number; name: string } | null;
    availableYears: number[];
    filters: FiltersState;
}

const formatPeso = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);

export default function AnalyticsIndex({
    sacraments,
    finance,
    parishes,
    isArchdioceseWide,
    userHomeParish,
    availableYears,
    filters,
}: AnalyticsProps) {
    const [activeTab, setActiveTab] = useState<'sacraments' | 'finance'>('sacraments');

    // Filter update handler (preserves other filter fields)
    const updateFilter = (newParams: Partial<FiltersState>) => {
        const next = { ...filters, ...newParams };
        const query: Record<string, any> = {};

        // Only archdiocese wide users can filter by parish
        if (isArchdioceseWide && next.parish_id) {
            query.parish_id = next.parish_id;
        }

        if (next.period && next.period !== 'all') {
            query.period = next.period;
        }

        if (next.period === 'year' && next.year) {
            query.year = next.year;
        }

        if (next.period === 'month' && next.month) {
            query.month = next.month;
        }

        if (next.period === 'day' && next.date) {
            query.date = next.date;
        }

        router.get('/analytics', query, {
            only: ['sacraments', 'finance', 'filters'],
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const query: Record<string, any> = {};
        if (isArchdioceseWide && filters.parish_id) {
            query.parish_id = filters.parish_id;
        }
        router.get('/analytics', query, {
            only: ['sacraments', 'finance', 'filters'],
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Human-friendly description of active time filter
    const activeFilterDescription = useMemo(() => {
        if (filters.period === 'year') {
            return `Calendar Year ${filters.year}`;
        }
        if (filters.period === 'month') {
            const [y, m] = (filters.month || '').split('-');
            if (y && m) {
                const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
                return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
            }
            return filters.month;
        }
        if (filters.period === 'day') {
            const d = new Date(filters.date);
            return isNaN(d.getTime())
                ? filters.date
                : d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return 'All Time';
    }, [filters.period, filters.year, filters.month, filters.date]);

    // Historical + 3-Month Forecast Line Chart Data (with bridge month)
    const timelineData = useMemo(() => {
        const actuals = (sacraments.descriptive?.monthly_trends || []).map((item, idx, arr) => {
            const isLastActual = idx === arr.length - 1;
            return {
                month: item.month,
                actual: item.count,
                predicted: isLastActual ? item.count : null,
            };
        });

        const forecasts = (sacraments.predictive?.forecast || []).map((item) => ({
            month: item.month,
            actual: null,
            predicted: item.predicted_count,
        }));

        return [...actuals, ...forecasts];
    }, [sacraments.descriptive?.monthly_trends, sacraments.predictive?.forecast]);

    // Data for Pending vs. Completed Sacraments Bar Chart
    const sacramentChartData = [
        {
            type: 'Baptism',
            Pending: sacraments.appointments.pending.baptism,
            Completed: sacraments.appointments.completed.baptism,
        },
        {
            type: 'Confirmation',
            Pending: sacraments.appointments.pending.confirmation,
            Completed: sacraments.appointments.completed.confirmation,
        },
        {
            type: 'Marriage',
            Pending: sacraments.appointments.pending.marriage,
            Completed: sacraments.appointments.completed.marriage,
        },
        {
            type: 'Funeral',
            Pending: sacraments.appointments.pending.funeral,
            Completed: sacraments.appointments.completed.funeral,
        },
        {
            type: 'Others',
            Pending: sacraments.appointments.pending.others,
            Completed: sacraments.appointments.completed.others,
        },
    ];

    return (
        <PortalLayout
            title="Parish & Curia Analytics"
            subtitle="Descriptive metrics, predictive sacrament forecasting, and financial account breakdowns."
            activeTab="analytics"
        >
            {/* ============================================================== */}
            {/* FILTER TOOLBAR: PARISH FILTER + DAY, MONTH, YEAR TIME FILTERS   */}
            {/* ============================================================== */}
            <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Parish Filter (Admin can choose, Staff is locked to their parish) */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Parish Filter
                        </label>
                        {isArchdioceseWide ? (
                            <select
                                value={filters.parish_id ?? ''}
                                onChange={(e) => updateFilter({ parish_id: e.target.value ? Number(e.target.value) : null })}
                                className="rounded-xl border-slate-300 text-sm font-medium text-slate-800 focus:border-amber-600 focus:ring-amber-600 min-w-[260px]"
                            >
                                <option value="">All Parishes (Archdiocese-Wide)</option>
                                {parishes.map((parish) => (
                                    <option key={parish.id} value={parish.id}>
                                        {parish.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 min-w-[240px]">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span className="font-bold">{userHomeParish?.name || 'Assigned Parish'}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                    Staff Scoped
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Time Filters (Day, Month, Year, All) */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Time Period
                            </label>
                            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                                {(['all', 'year', 'month', 'day'] as const).map((period) => (
                                    <button
                                        key={period}
                                        type="button"
                                        onClick={() => updateFilter({ period })}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${filters.period === period
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        {period === 'all' ? 'All' : period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Year Selector */}
                        {filters.period === 'year' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Year
                                </label>
                                <select
                                    value={filters.year}
                                    onChange={(e) => updateFilter({ year: Number(e.target.value) })}
                                    className="rounded-xl border-slate-300 text-sm font-medium text-slate-800 focus:border-amber-600 focus:ring-amber-600 py-1"
                                >
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Month Picker */}
                        {filters.period === 'month' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Month
                                </label>
                                <input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) => updateFilter({ month: e.target.value })}
                                    className="rounded-xl border-slate-300 text-sm font-medium text-slate-800 focus:border-amber-600 focus:ring-amber-600 py-1"
                                />
                            </div>
                        )}

                        {/* Day / Date Picker */}
                        {filters.period === 'day' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => updateFilter({ date: e.target.value })}
                                    className="rounded-xl border-slate-300 text-sm font-medium text-slate-800 focus:border-amber-600 focus:ring-amber-600 py-1"
                                />
                            </div>
                        )}

                        {filters.period !== 'all' && (
                            <div className="self-end">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                >
                                    Clear Time Filter
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subtitle feedback on active filters */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div>
                        Active Time Window: <strong className="text-slate-800">{activeFilterDescription}</strong>
                    </div>
                    <div>
                        Parish Scope:{' '}
                        <strong className="text-slate-800">
                            {isArchdioceseWide
                                ? filters.parish_id
                                    ? parishes.find((p) => p.id === filters.parish_id)?.name || 'Specific Parish'
                                    : 'All Parishes (Archdiocese-Wide)'
                                : userHomeParish?.name || 'Your Parish'}
                        </strong>
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 2-TAB NAVIGATION BAR                                           */}
            {/* ============================================================== */}
            <div className="mb-6 border-b border-slate-200">
                <nav className="flex space-x-2" aria-label="Analytics Navigation Tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('sacraments')}
                        className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${activeTab === 'sacraments'
                            ? 'border-amber-600 text-slate-900 bg-amber-50/70'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        Sacraments & Forecasting
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('finance')}
                        className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${activeTab === 'finance'
                            ? 'border-amber-600 text-slate-900 bg-amber-50/70'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        Finance & Account Codes
                    </button>
                </nav>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: SACRAMENTS ANALYTICS                                    */}
            {/* ============================================================== */}
            {activeTab === 'sacraments' && (
                <div className="space-y-8">
                    {/* --- SECTION A: CERTIFICATE REQUESTS --- */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                Certificate Requests (Baptism & Confirmation)
                            </h2>
                            <p className="text-sm text-slate-500">
                                Tracks requested copies of Baptism and Confirmation certificates in the selected time window.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Total Pending Certificate Requests */}
                            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                            Pending Queue
                                        </span>
                                        <h3 className="mt-2 text-base font-bold text-slate-800">
                                            Total Pending Certificate Requests
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Requests awaiting record verification, printing, or priest signature.
                                        </p>
                                    </div>
                                    <span className="text-3xl font-extrabold text-amber-600">
                                        {sacraments.certificates.pending.total}
                                    </span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">Baptism</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            {sacraments.certificates.pending.baptism}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">Confirmation</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            {sacraments.certificates.pending.confirmation}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Certificates Processed */}
                            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                            Completed & Released
                                        </span>
                                        <h3 className="mt-2 text-base font-bold text-slate-800">
                                            Total Certificates Processed
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Official certificates verified, printed, signed, and released.
                                        </p>
                                    </div>
                                    <span className="text-3xl font-extrabold text-emerald-600">
                                        {sacraments.certificates.processed.total}
                                    </span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">Baptism</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            {sacraments.certificates.processed.baptism}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">Confirmation</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            {sacraments.certificates.processed.confirmation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --- SECTION B: SACRAMENT APPOINTMENTS --- */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                Sacrament Appointments by Type
                            </h2>
                            <p className="text-sm text-slate-500">
                                Organizes bookings and completed celebrations across Baptism, Confirmation, Marriage, Funeral, and other services.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Total Pending Sacrament Appointments */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            Upcoming Schedule
                                        </span>
                                        <h3 className="mt-2 text-base font-bold text-slate-800">
                                            Total Pending Sacrament Appointments
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Scheduled sacraments awaiting celebration or final canonical requirements.
                                        </p>
                                    </div>
                                    <span className="text-3xl font-extrabold text-blue-600">
                                        {sacraments.appointments.pending.total}
                                    </span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Baptism</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.pending.baptism}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Confirmation</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.pending.confirmation}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Marriage</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.pending.marriage}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Funeral</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.pending.funeral}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Others</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.pending.others}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Sacraments Completed */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white">
                                            Celebrated & Recorded
                                        </span>
                                        <h3 className="mt-2 text-base font-bold text-slate-800">
                                            Total Sacraments Completed
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Sacraments already celebrated and recorded in parish registers.
                                        </p>
                                    </div>
                                    <span className="text-3xl font-extrabold text-slate-900">
                                        {sacraments.appointments.completed.total}
                                    </span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Baptism</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.completed.baptism}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Confirmation</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.completed.confirmation}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Marriage</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.completed.marriage}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Funeral</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.completed.funeral}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2.5">
                                        <p className="text-[11px] text-slate-500">Others</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {sacraments.appointments.completed.others}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bar Chart: Pending vs. Completed Sacraments */}
                        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Pending vs. Completed Sacraments by Type
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Compares upcoming scheduled sacraments against completed celebrations for each sacrament category.
                            </p>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sacramentChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Pending" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="Completed" fill="#0f172a" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* --- SECTION C: HISTORICAL & PREDICTIVE FORECASTING --- */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                Canonical Trends & 3-Month Predictive Forecast
                            </h2>
                            <p className="text-sm text-slate-500">
                                Analyzes inscribed canonical records and projects demand for the next 3 months using linear regression.
                            </p>
                        </div>

                        {/* Statistical Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Total Canonical Records</p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                                    {sacraments.descriptive.summary.total_records}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Inscribed records in registry books.</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Monthly Average (Mean)</p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                                    {sacraments.descriptive.summary.monthly_average} / mo
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Average records per monthly period.</p>
                            </div>

                        </div>

                        {/* Historical + 3-Month Forecast Line Chart */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Historical Volume & 3-Month Forecast
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Solid navy line shows actual historical records; dashed gold line shows linear regression projections.
                            </p>
                            <div className="h-72 sm:h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderRadius: '12px',
                                                border: '1px solid #334155',
                                                color: '#ffffff',
                                                fontSize: '12px',
                                            }}
                                            itemStyle={{ color: '#ffffff' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="actual"
                                            name="Historical Records"
                                            stroke="#0f172a"
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: '#0f172a' }}
                                            activeDot={{ r: 6 }}
                                            connectNulls={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="predicted"
                                            name="Projected Forecast"
                                            stroke="#d97706"
                                            strokeWidth={2.5}
                                            strokeDasharray="5 5"
                                            dot={{ r: 4, fill: '#d97706' }}
                                            activeDot={{ r: 6 }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Prescriptive Recommendations */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sacraments.prescriptive.map((rec, index) => (
                                <div key={index} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full bg-slate-100 text-slate-700">
                                        {rec.priority} Priority
                                    </span>
                                    <h4 className="mt-2 text-sm font-bold text-slate-900">{rec.title}</h4>
                                    <p className="text-xs text-slate-600 mt-1">{rec.insight}</p>
                                    <p className="text-xs font-semibold text-amber-700 mt-2">Action: {rec.action}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: FINANCE ANALYTICS                                       */}
            {/* ============================================================== */}
            {activeTab === 'finance' && (
                <div className="space-y-8">
                    {/* --- 3 SUMMARY CARDS: TOTAL CASH IN, TOTAL CASH OUT, NET TOTAL --- */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Total Cash In (Incoming Funds)
                            </p>
                            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
                                {formatPeso(finance.summary.total_cash_in)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Total money received from Official Receipts, arancel fees, mass offerings, and donations.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                Total Cash Out (Outgoing Expenses)
                            </p>
                            <p className="mt-2 text-3xl font-extrabold text-rose-600">
                                {formatPeso(finance.summary.total_cash_out)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Total money disbursed via Check Vouchers for utilities, supplies, and maintenance.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Net Total (Remaining Balance)
                                </p>
                                <span
                                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${finance.summary.is_surplus
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                        }`}
                                >
                                    {finance.summary.is_surplus ? 'Surplus (+)' : 'Deficit (-)'}
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-slate-900">
                                {formatPeso(finance.summary.net_total)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Net parish standing calculated by subtracting Total Cash Out from Total Cash In.
                            </p>
                        </div>
                    </section>

                    {/* --- MONTHLY CASH FLOW VISUAL --- */}
                    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900">
                            Monthly Cash Flow (Cash In vs. Cash Out)
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Compares monthly incoming receipts (green) against outgoing expenses (red).
                        </p>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={finance.monthly_cashflow}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value: number) => formatPeso(value)} />
                                    <Legend />
                                    <Bar dataKey="cash_in" name="Total Cash In" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="cash_out" name="Total Cash Out" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* --- ACCOUNT CODE BREAKDOWNS --- */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income Account Codes */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Where Funds Come From (Income Account Codes)
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Breakdown of incoming collections grouped by Chart of Accounts code.
                            </p>

                            <div className="h-56 w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={finance.inflow_by_account} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="account_code" width={75} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(value: number) => formatPeso(value)} />
                                        <Bar dataKey="total" name="Cash In" fill="#10b981" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {finance.inflow_by_account.map((item) => (
                                    <div key={item.account_code} className="py-2.5 flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 mr-2">
                                                {item.account_code}
                                            </span>
                                            <span className="text-slate-700 font-medium">{item.account_name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{formatPeso(item.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Expense Account Codes */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">
                                Where Funds Are Spent (Expense Account Codes)
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Breakdown of parish disbursements grouped by Chart of Accounts code.
                            </p>

                            <div className="h-56 w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={finance.outflow_by_account} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="account_code" width={75} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(value: number) => formatPeso(value)} />
                                        <Bar dataKey="total" name="Cash Out" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {finance.outflow_by_account.map((item) => (
                                    <div key={item.account_code} className="py-2.5 flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 mr-2">
                                                {item.account_code}
                                            </span>
                                            <span className="text-slate-700 font-medium">{item.account_name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{formatPeso(item.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </PortalLayout>
    );
}
