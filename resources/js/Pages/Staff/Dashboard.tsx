import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { PageProps } from '@/types';
import StatusBadge from '@/Components/StatusBadge';
import FaceEnrollmentModal from '@/Components/FaceEnrollmentModal';
import {
    Activity,
    BookOpen,
    FileCheck,
    Calendar,
    Users,
    Church,
    Clock,
    Award,
    Shield,
    ArrowRight,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    Layers,
    UserCheck,
    ScanFace,
} from 'lucide-react';

interface UrgentCertificate {
    id: number;
    certificate_number: string | null;
    requester_name: string;
    status: string;
    created_at: string;
    record?: {
        sacrament_type: string;
        person?: {
            full_name: string;
        };
        originating_parish?: {
            name: string;
        };
    };
}

interface UpcomingSchedule {
    id: number;
    title: string;
    sacrament_type: string;
    starts_at: string;
    status: string;
    venue?: {
        name: string;
    };
    presiding_clergy?: {
        titled_name: string;
    };
    parish?: {
        name: string;
    };
}

interface RecentRecord {
    id: number;
    citation: string;
    sacrament_type: string;
    created_at: string;
    person?: {
        full_name: string;
    };
    originating_parish?: {
        name: string;
    };
}

interface DashboardProps extends PageProps {
    stats: {
        open: number;
        issued: number;
        pending: number;
        rejected: number;
        total: number;
    };
    sacramentCounts: {
        total?: number;
        baptism?: number;
        confirmation?: number;
        marriage?: number;
        death?: number;
    };
    urgentCertificates: UrgentCertificate[];
    upcomingSchedules: UpcomingSchedule[];
    recentRecords: RecentRecord[];
    kpiOverview: {
        totalRecords: number;
        openCertificates: number;
        activeSchedules: number;
        parishesCount: number;
        clergyCount: number;
    };
}

export default function Dashboard({
    auth,
    stats,
    sacramentCounts,
    urgentCertificates,
    upcomingSchedules,
    recentRecords,
    kpiOverview,
}: DashboardProps) {
    const { user } = auth;
    const [faceModalOpen, setFaceModalOpen] = useState(false);

    return (
        <PortalLayout
            activeTab="dashboard"
            title="Curia Command Center & Administrative Dashboard"
            subtitle="Centralized oversight for canonical registers, certificate processing pipelines, and pastoral sacrament schedules."
        >
            <Head title="Staff Dashboard — RCAL PIMS" />

            <div className="space-y-7">
                {/* Jurisdiction Scope Welcome Banner */}
                <div className="bg-gradient-to-r from-[#0a0f1d] via-slate-900 to-[#0e172a] rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shrink-0 shadow-md">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <Church className="w-7 h-7 text-amber-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {user?.is_archdiocese_wide ? 'Archdiocesan Curia Chancery' : 'Parish Level Scope'}
                                </span>
                                <span className="text-sm text-slate-300 font-medium">
                                    {user?.role_label}
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                                Welcome, {user?.display_name || user?.username}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                                {user?.is_archdiocese_wide
                                    ? 'Full archdiocesan oversight enabled. Monitoring sacramental registers and certificate release queues across all Lipa vicariates.'
                                    : `Assigned Parish Administration: ${user?.home_parish_name || 'Assigned Parish'}. All operations are strictly canon-compliant.`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link
                            href="/records/create"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Inscribe Record</span>
                        </Link>
                        <Link
                            href="/certificates"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-sm border border-slate-700 transition-all duration-150 shadow-xs"
                        >
                            <FileCheck className="w-4 h-4 text-amber-400" />
                            <span>Certificate Orders</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setFaceModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-sm border border-slate-700 transition-all duration-150 shadow-xs"
                            title="Enroll or update your Face++ biometric reference photo"
                        >
                            <ScanFace className="w-4 h-4 text-amber-400" />
                            <span>{user?.has_face_reference ? 'Face ID Enrolled' : 'Enroll Face ID'}</span>
                        </button>
                    </div>
                </div>

                {/* 4 Essential Curia KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {/* KPI 1: Inscribed Records */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Canonical Records
                            </span>
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                                <BookOpen className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {kpiOverview.totalRecords.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-700">Can. 535</span>
                            <span>Permanent Inscribed Folios</span>
                        </p>
                    </div>

                    {/* KPI 2: Certificate Orders */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Certificate Pipeline
                            </span>
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                <FileCheck className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {kpiOverview.openCertificates.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-amber-700">{stats.pending} pending</span>
                            <span>awaiting verification / seal</span>
                        </p>
                    </div>

                    {/* KPI 3: Scheduled Sacraments */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Active Sacraments
                            </span>
                            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {kpiOverview.activeSchedules.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">Upcoming</span>
                            <span>Confirmed liturgies & rites</span>
                        </p>
                    </div>

                    {/* KPI 4: Institutional Network */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-amber-400 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                Diocesan Network
                            </span>
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                                <Church className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-3xl font-serif font-black text-slate-900">
                            {kpiOverview.parishesCount}
                        </div>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-700">{kpiOverview.clergyCount} Active Clergy</span>
                            <span>• Lipa Curia</span>
                        </p>
                    </div>
                </div>

                {/* Split Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
                    {/* Left Column (2/3): Urgent Certificate Queue & Recent Inscriptions */}
                    <div className="lg:col-span-2 space-y-7">
                        {/* Urgent Certificate Processing Queue */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-base text-slate-900">
                                            Urgent Certificate Processing Queue
                                        </h3>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            Orders requiring staff verification, chancellor approval, or physical seal release
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/certificates"
                                    className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
                                >
                                    <span>View All</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/90 text-2xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3">Order / Subject</th>
                                            <th className="px-4 py-3">Sacrament</th>
                                            <th className="px-4 py-3">Requester</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800">
                                        {urgentCertificates.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-slate-500">
                                                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-500" />
                                                    <p className="font-semibold text-slate-800 text-sm">All caught up!</p>
                                                    <p className="text-2xs text-slate-400">No certificate orders requiring immediate action.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            urgentCertificates.map((cert) => {
                                                const personName =
                                                    cert.record?.person?.full_name ||
                                                    [cert.record?.person?.first_name, cert.record?.person?.last_name].filter(Boolean).join(' ') ||
                                                    'Subject Record';

                                                return (
                                                    <tr key={cert.id} className="hover:bg-amber-50/20 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="font-bold text-slate-900 text-sm">
                                                                {personName}
                                                            </div>
                                                            <span className="font-mono text-2xs text-amber-800 font-semibold">
                                                                {cert.certificate_number || `#ORD-${cert.id}`}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="inline-block capitalize px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                                                {cert.record?.sacrament_type || 'Certificate'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                            {cert.requester_name}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <StatusBadge status={cert.status} />
                                                        </td>
                                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                                            <Link
                                                                href={`/certificates/${cert.id}`}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow-2xs"
                                                            >
                                                                <span>Process</span>
                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Canonical Folio Inscriptions */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-base text-slate-900">
                                            Recent Canonical Folio Inscriptions
                                        </h3>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            Recently transcribed sacramental entries into parish ledger registers
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/records"
                                    className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
                                >
                                    <span>Browse Registers</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/90 text-2xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3">Subject Person</th>
                                            <th className="px-4 py-3">Register &amp; Citation</th>
                                            <th className="px-4 py-3">Originating Parish</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800">
                                        {recentRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8 text-slate-500">
                                                    <BookOpen className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                                                    <p className="font-semibold text-slate-800 text-sm">No canonical folios recorded yet.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            recentRecords.map((rec) => {
                                                const personName =
                                                    rec.person?.full_name ||
                                                    [rec.person?.first_name, rec.person?.last_name].filter(Boolean).join(' ') ||
                                                    'Inscribed Person';
                                                const citation =
                                                    rec.citation ||
                                                    `Book ${rec.book_number}, Page ${rec.page_number}, Entry ${rec.entry_number}`;

                                                return (
                                                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="font-bold text-slate-900 text-sm">
                                                                {personName}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="capitalize px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                                    {rec.sacrament_type}
                                                                </span>
                                                                <span className="font-mono text-2xs text-amber-800 font-semibold">
                                                                    {citation}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-700 max-w-[180px] truncate" title={rec.originating_parish?.name}>
                                                            {rec.originating_parish?.name || 'Parish'}
                                                        </td>
                                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                                            <Link
                                                                href={`/records/${rec.id}`}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-700 font-semibold text-xs border border-slate-200 transition shadow-2xs"
                                                            >
                                                                <span>Folio</span>
                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3): Timetable, Sacraments Breakdown & Shortcuts */}
                    <div className="space-y-7">
                        {/* Upcoming Sacrament Liturgy Timetable */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-purple-600" />
                                    <h3 className="font-serif font-bold text-base text-slate-900">
                                        Sacrament Timetable
                                    </h3>
                                </div>
                                <Link
                                    href="/schedules"
                                    className="text-xs font-bold text-amber-700 hover:underline"
                                >
                                    Calendar ➔
                                </Link>
                            </div>

                            <div className="space-y-3">
                                {upcomingSchedules.length === 0 ? (
                                    <p className="text-sm text-slate-600 py-4 text-center">
                                        No upcoming sacrament schedules in this scope.
                                    </p>
                                ) : (
                                    upcomingSchedules.map((sch) => {
                                        const dateObj = new Date(sch.starts_at);
                                        return (
                                            <div
                                                key={sch.id}
                                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition space-y-1.5"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-slate-900 line-clamp-1">
                                                        {sch.title}
                                                    </span>
                                                    <StatusBadge status={sch.status} />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>
                                                        {dateObj.toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}{' '}
                                                        at{' '}
                                                        {dateObj.toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-700">
                                                    {sch.presiding_clergy?.titled_name || 'Assigned Clergy'} • {sch.venue?.name || sch.parish?.name || 'Parish'}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Sacrament Registry Breakdown */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                                <Layers className="w-5 h-5 text-amber-600" />
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    Sacramental Registry Mix
                                </h3>
                            </div>

                            <div className="space-y-3.5 text-sm">
                                <div>
                                    <div className="flex justify-between mb-1.5 text-slate-700">
                                        <span className="font-medium">Baptisms</span>
                                        <span className="font-bold font-mono">{sacramentCounts?.baptism ?? 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{
                                                width: `${Math.min(100, ((sacramentCounts?.baptism ?? 0) / Math.max(1, kpiOverview.totalRecords)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1.5 text-slate-700">
                                        <span className="font-medium">Confirmations</span>
                                        <span className="font-bold font-mono">{sacramentCounts?.confirmation ?? 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full"
                                            style={{
                                                width: `${Math.min(100, ((sacramentCounts?.confirmation ?? 0) / Math.max(1, kpiOverview.totalRecords)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1.5 text-slate-700">
                                        <span className="font-medium">Marriages</span>
                                        <span className="font-bold font-mono">{sacramentCounts?.marriage ?? 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 rounded-full"
                                            style={{
                                                width: `${Math.min(100, ((sacramentCounts?.marriage ?? 0) / Math.max(1, kpiOverview.totalRecords)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1.5 text-slate-700">
                                        <span className="font-medium">Christian Burials</span>
                                        <span className="font-bold font-mono">{sacramentCounts?.death ?? 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-500 rounded-full"
                                            style={{
                                                width: `${Math.min(100, ((sacramentCounts?.death ?? 0) / Math.max(1, kpiOverview.totalRecords)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Command Shortcuts */}
                        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-amber-400">
                                <Activity className="w-4 h-4" />
                                <h3 className="font-serif font-bold text-xs uppercase tracking-wide">
                                    Administrative Shortcuts
                                </h3>
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href="/records/create"
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition text-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <BookOpen className="w-4 h-4 text-amber-400" />
                                        <span>Transcribe New Folio</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                </Link>

                                <Link
                                    href="/schedules/create"
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition text-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Calendar className="w-4 h-4 text-amber-400" />
                                        <span>Book Sacrament Ceremony</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                </Link>

                                <Link
                                    href="/schedules/settings"
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition text-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Activity className="w-4 h-4 text-amber-400" />
                                        <span>Configure Sacrament Fees</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                </Link>

                                <Link
                                    href="/clergy"
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition text-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Users className="w-4 h-4 text-amber-400" />
                                        <span>Clergy Directory</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                </Link>

                                {user?.is_archdiocese_wide && (
                                    <Link
                                        href="/audit"
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition text-sm group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Shield className="w-4 h-4 text-amber-400" />
                                            <span>Curia Audit Logs (RA 10173)</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Biometric Face Reference Enrollment Modal */}
            <FaceEnrollmentModal
                isOpen={faceModalOpen}
                onClose={() => setFaceModalOpen(false)}
            />
        </PortalLayout>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
