import React, { useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { PageProps, Parish } from '@/types';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    BookOpen,
    FileCheck,
    Calendar,
    Church,
    Clock,
    Shield,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Layers,
    Activity,
    Lightbulb,
    FileText,
} from 'lucide-react';
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

interface AnalyticsProps extends PageProps {
    descriptive: {
        records_by_type: Record<string, number>;
        schedule_stats: Record<string, number>;
        monthly_trends: { month: string; count: number; is_forecast: boolean }[];
        summary: {
            total_records: number;
            monthly_average: number;
            monthly_std_dev: number;
            pending_certificates: number;
        };
    };
    predictive: {
        slope: number;
        trend_direction: 'upward' | 'downward' | 'stable' | 'insufficient_data';
        forecast: { month: string; predicted_count: number; is_forecast: boolean }[];
    };
    prescriptive: {
        category: string;
        priority: 'high' | 'medium' | 'low';
        title: string;
        insight: string;
        action: string;
    }[];
    parishes?: Parish[];
    scopedParish?: Parish | null;
    filters?: {
        parish_id?: string;
    };
}

export default function AnalyticsIndex({
    descriptive,
    predictive,
    prescriptive,
    parishes = [],
    scopedParish = null,
    filters = {},
}: AnalyticsProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const priorityBadge = {
        high: 'bg-rose-50 text-rose-800 border-rose-300 ring-rose-200',
        medium: 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-200',
        low: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-200',
    };

    const priorityBorder = {
        high: 'border-l-rose-500',
        medium: 'border-l-amber-500',
        low: 'border-l-emerald-500',
    };

    const priorityIcon = {
        high: AlertCircle,
        medium: Clock,
        low: CheckCircle2,
    };

    // Prepare chronological timeline combining actual records and 3-month forecast
    const timelineData = useMemo(() => {
        const actuals = (descriptive?.monthly_trends || []).map((item, idx, arr) => {
            const isLastActual = idx === arr.length - 1;
            return {
                month: item.month,
                actual: item.count,
                predicted: isLastActual ? item.count : null,
            };
        });

        const forecasts = (predictive?.forecast || []).map((item) => ({
            month: item.month,
            actual: null,
            predicted: item.predicted_count,
        }));

        return [...actuals, ...forecasts];
    }, [descriptive?.monthly_trends, predictive?.forecast]);

    // Prepare distribution by sacrament type
    const sacramentBreakdownData = useMemo(() => {
        const entries = Object.entries(descriptive?.records_by_type || {});
        if (entries.length === 0) {
            return [
                { sacrament: 'Baptism', total: 0 },
                { sacrament: 'Confirmation', total: 0 },
                { sacrament: 'Marriage', total: 0 },
                { sacrament: 'Death', total: 0 },
            ];
        }
        return entries.map(([type, total]) => ({
            sacrament: type.charAt(0).toUpperCase() + type.slice(1),
            total,
        }));
    }, [descriptive?.records_by_type]);

    // Format trend direction badge
    const trendConfig = useMemo(() => {
        const dir = predictive?.trend_direction || 'stable';
        switch (dir) {
            case 'upward':
                return {
                    label: 'Upward Trajectory',
                    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    icon: ArrowUpRight,
                    color: 'text-emerald-400',
                };
            case 'downward':
                return {
                    label: 'Downward Trend',
                    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                    icon: ArrowDownRight,
                    color: 'text-rose-400',
                };
            case 'stable':
                return {
                    label: 'Stable Volume',
                    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    icon: Minus,
                    color: 'text-amber-400',
                };
            default:
                return {
                    label: 'Baseline Gathering',
                    bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                    icon: Activity,
                    color: 'text-slate-400',
                };
        }
    }, [predictive?.trend_direction]);

    const handleParishChange = (newParishId: string) => {
        router.get(
            '/analytics',
            { parish_id: newParishId || undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <PortalLayout
            title="Curia Decision Support & Analytics"
            subtitle="Descriptive canonical metrics, predictive sacrament forecasting, and prescriptive administrative guidance"
            activeTab="analytics"
        >
            <Head title="Curia Analytics — RCAL PIMS" />

            <div className="space-y-6">
                {/* ── PARISH JURISDICTION FILTER (ARCHDIOCESE-WIDE OR SCOPED) ── */}
                {user?.is_archdiocese_wide && parishes.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Church className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Jurisdiction Filter
                                </div>
                                <div className="text-sm font-serif font-bold text-slate-900">
                                    {filters.parish_id && scopedParish
                                        ? scopedParish.name
                                        : 'Archdiocese of Lipa — All Vicariates & Parishes'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide shrink-0">
                                Filter by Parish:
                            </label>
                            <select
                                value={filters.parish_id || ''}
                                onChange={(e) => handleParishChange(e.target.value)}
                                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 min-w-[240px]"
                            >
                                <option value="">— Entire Archdiocese (All Parishes) —</option>
                                {parishes.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.city_municipality ? `(${p.city_municipality})` : ''}
                                    </option>
                                ))}
                            </select>

                            {filters.parish_id && (
                                <button
                                    type="button"
                                    onClick={() => handleParishChange('')}
                                    className="px-3 py-2 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors shrink-0"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── HERO COMMAND BANNER (MATCHING SYSTEM STYLE) ── */}
                <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Background Decorative Glow */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex items-start sm:items-center gap-4 max-w-3xl">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                            <BarChart3 className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {scopedParish ? scopedParish.name : 'Archdiocesan Curia Chancery'}
                                </span>
                                <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Predictive &amp; Prescriptive Analytics Engine</span>
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                                Sacramental Demand Modeling &amp; Capacity Intelligence
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                                Real-time Ordinary Least Squares (OLS) regression modeling across canonical folios, seasonal variance analysis, and prescriptive pastoral recommendations.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
                        <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${trendConfig.bg}`}>
                            <trendConfig.icon className="w-4 h-4 shrink-0" />
                            <span>
                                {trendConfig.label} ({predictive?.slope > 0 ? `+${predictive.slope}` : predictive?.slope || 0}/mo)
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 1. ESSENTIAL CANONICAL KPI CARDS (GRID OF 4) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {/* KPI 1: Inscribed Records */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Inscribed Folios
                            </span>
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {(descriptive?.summary?.total_records || 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-700">Can. 535 §1</span>
                            <span>Permanent Inscribed Records</span>
                        </p>
                    </div>

                    {/* KPI 2: Monthly Average */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Monthly Average
                            </span>
                            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {descriptive?.summary?.monthly_average || 0}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-sky-700">12-Month Mean</span>
                            <span>Sacraments / Month</span>
                        </p>
                    </div>

                    {/* KPI 3: Seasonal Volatility */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Seasonal Volatility
                            </span>
                            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            ±{descriptive?.summary?.monthly_std_dev || 0}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">Std. Deviation</span>
                            <span>Seasonal variance spread</span>
                        </p>
                    </div>

                    {/* KPI 4: Certificate Orders Pending */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Certificate Queue
                            </span>
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                                <FileCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {(descriptive?.summary?.pending_certificates || 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-amber-700">Pending Release</span>
                            <span>Awaiting signature &amp; seal</span>
                        </p>
                    </div>
                </div>

                {/* ── 2. PREDICTIVE TIMELINE & SACRAMENTAL MIX CHARTS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: 3-Month Linear Regression Forecast */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Sacrament Inscriptions &amp; 3-Month Forecast
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Solid navy line represents historical canonical records; dashed gold line represents linear regression prediction.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-2xs font-semibold uppercase tracking-wider shrink-0">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-3 h-1 bg-slate-900 rounded-full" />
                                    Actual
                                </span>
                                <span className="flex items-center gap-1.5 text-amber-700">
                                    <span className="w-3 h-1 bg-amber-500 border-dashed border-t border-amber-600" />
                                    Forecast
                                </span>
                            </div>
                        </div>

                        <div className="h-72 sm:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderRadius: '12px',
                                            border: '1px solid #334155',
                                            color: '#ffffff',
                                            fontSize: '12px',
                                            padding: '8px 12px',
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

                    {/* Right: Sacramental Mix Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="mb-5 pb-3 border-b border-slate-100">
                                <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-amber-500" />
                                    Sacramental Registry Mix
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cumulative distribution of canonical folios by sacrament rite.
                                </p>
                            </div>

                            <div className="h-64 sm:h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sacramentBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="sacrament"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                        />
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
                                        <Bar
                                            dataKey="total"
                                            name="Inscribed Records"
                                            fill="#d97706"
                                            radius={[6, 6, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Dominant Sacrament Rite:</span>
                            <span className="font-bold text-slate-900">
                                {sacramentBreakdownData[0]?.sacrament || 'Baptism'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 3. PRESCRIPTIVE OPERATIONAL ACTION PLAN ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                Prescriptive Pastoral &amp; Administrative Recommendations
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Automated operational directives generated from archival demand patterns, clergy allocation ratios, and certificate queue health.
                            </p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 shrink-0">
                            {prescriptive.length} Guidance Directive{prescriptive.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prescriptive.map((rec, index) => {
                            const IconComponent = priorityIcon[rec.priority] || AlertCircle;
                            return (
                                <div
                                    key={index}
                                    className={`p-5 rounded-2xl border border-slate-200 border-l-4 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all duration-200 flex flex-col justify-between ${priorityBorder[rec.priority]}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <IconComponent className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{rec.category}</span>
                                            </span>
                                            <span
                                                className={`text-3xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ring-1 ${priorityBadge[rec.priority]}`}
                                            >
                                                {rec.priority} Priority
                                            </span>
                                        </div>

                                        <h4 className="font-serif font-bold text-slate-900 text-base leading-snug">
                                            {rec.title}
                                        </h4>
                                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                            {rec.insight}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3.5 border-t border-slate-200/80 bg-white/80 p-3 rounded-xl border border-slate-200/60">
                                        <div className="text-xs font-medium text-slate-800 leading-relaxed">
                                            <span className="text-amber-800 font-bold uppercase tracking-wide text-2xs block mb-0.5">
                                                Recommended Action:
                                            </span>
                                            {rec.action}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
