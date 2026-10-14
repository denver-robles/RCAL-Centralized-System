import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import VerifyIdButton from '@/Components/VerifyIdButton';
import FaceEnrollmentModal from '@/Components/FaceEnrollmentModal';
import { DocumentRequest, PageProps, SacramentSchedule } from '@/types';
import {
    FileText,
    Calendar,
    Plus,
    ShieldCheck,
    ShieldAlert,
    CheckCircle2,
    Clock,
    Award,
    X,
    ArrowRight,
    Church,
    AlertCircle,
    Layers,
    UserCheck,
    CreditCard,
    FileCheck,
    HelpCircle,
    ChevronRight,
    MapPin,
    User as UserIcon,
    ScanFace,
} from 'lucide-react';

interface Props extends PageProps {
    documentRequests: DocumentRequest[];
    schedules: SacramentSchedule[];
    metrics?: {
        total_claims: number;
        processing_claims: number;
        ready_claims: number;
        completed_claims: number;
        upcoming_schedules: number;
    };
    sacramentCounts?: {
        baptism: number;
        confirmation: number;
        marriage: number;
        death: number;
    };
}

export default function Dashboard({ auth, documentRequests, schedules, metrics, sacramentCounts }: Props) {
    const [selectedDoc, setSelectedDoc] = useState<DocumentRequest | null>(null);
    const [faceModalOpen, setFaceModalOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedDoc(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getStepDetails = (status: string) => {
        switch (status) {
            case 'submitted':
                return { step: 1, percent: 20, label: 'Submitted', desc: 'Filing received by secretariat' };
            case 'under_review':
                return { step: 2, percent: 40, label: 'Under Review', desc: 'Ledger record being verified' };
            case 'processing':
                return { step: 3, percent: 60, label: 'Processing', desc: 'Curia preparation & dry seal' };
            case 'ready':
                return { step: 4, percent: 80, label: 'Ready for Collection', desc: 'Available at parish secretariat' };
            case 'completed':
                return { step: 5, percent: 100, label: 'Completed', desc: 'Officially released to requester' };
            case 'rejected':
                return { step: 0, percent: 0, label: 'Disapproved', desc: 'Canonical requirements not met' };
            default:
                return { step: 1, percent: 20, label: 'Submitted', desc: 'Filing received' };
        }
    };

    const derivedMetrics = metrics || {
        total_claims: documentRequests.length,
        processing_claims: documentRequests.filter((d) =>
            ['submitted', 'under_review', 'processing'].includes(d.status)
        ).length,
        ready_claims: documentRequests.filter((d) => d.status === 'ready').length,
        completed_claims: documentRequests.filter((d) => d.status === 'completed').length,
        upcoming_schedules: schedules.filter((s) => ['requested', 'confirmed'].includes(s.status)).length,
    };

    const derivedCounts = sacramentCounts || {
        baptism: documentRequests.filter((d) => d.sacrament_type === 'baptism').length,
        confirmation: documentRequests.filter((d) => d.sacrament_type === 'confirmation').length,
        marriage: documentRequests.filter((d) => d.sacrament_type === 'marriage').length,
        death: documentRequests.filter((d) => d.sacrament_type === 'death').length,
    };

    return (
        <PortalLayout
            title="Parishioner Self-Service Portal"
            subtitle={`Welcome back, ${
                auth.user?.display_name || auth.user?.username
            }. Track your canonical certificate claims, review liturgical appointments, and manage sacramental records.`}
            activeTab="portal"
        >
            <Head title="Parishioner Dashboard - RCAL PIMS" />

            <div className="space-y-6">
                {/* Action Welcome Banner */}
                <div className="bg-gradient-to-r from-[#0a0f1d] via-slate-900 to-[#0d162a] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-white relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                                <Church className="w-3.5 h-3.5" />
                                <span>Roman Catholic Archdiocese of Lipa</span>
                            </div>
                            {auth.user?.identity_status === 'verified' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Government ID Verified</span>
                                </div>
                            ) : auth.user?.identity_status === 'pending' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span>ID Verification In Review</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-semibold">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                    <span>ID Not Verified</span>
                                </div>
                            )}

                            {/* Biometric Face++ Status Pill */}
                            {auth.user?.has_face_reference ? (
                                <div
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold"
                                    title="Biometric Face ID is canonically registered and permanently sealed"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Face ID Verified &amp; Sealed</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setFaceModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                                    title="Enroll your Face++ reference photo for fast sign-in"
                                >
                                    <ScanFace className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Enroll Face ID</span>
                                </button>
                            )}
                        </div>
                        <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Canonical Records &amp; Sacramental Claims
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Request certified ecclesiastical copies of your Baptism, Confirmation, Marriage, or Death records. Track each verification stage in real-time under Republic Act 10173 (Data Privacy Act of 2012).
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
                        <Link
                            href="/portal/requests/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all duration-150"
                        >
                            <Plus className="w-4 h-4" />
                            <span>File Document Claim</span>
                        </Link>
                        <Link
                            href="/portal/schedule-requests/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all duration-150"
                        >
                            <Calendar className="w-4 h-4 text-amber-400" />
                            <span>Book Ceremony</span>
                        </Link>
                        {!auth.user?.has_face_reference && (
                            <button
                                type="button"
                                onClick={() => setFaceModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all duration-150 cursor-pointer"
                                title="Enroll your Face++ reference photo for fast sign-in"
                            >
                                <ScanFace className="w-4 h-4 text-amber-400" />
                                <span>Enroll Face ID</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Identity Verification Prompt Card (Shown when user is unverified, pending, or requires input) */}
                {auth.user?.identity_status !== 'verified' && (
                    <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                                {auth.user?.identity_status === 'pending' ? (
                                    <Clock className="w-6 h-6 animate-pulse" />
                                ) : auth.user?.identity_status === 'requires_input' ? (
                                    <ShieldAlert className="w-6 h-6 text-rose-600" />
                                ) : (
                                    <ShieldCheck className="w-6 h-6" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-serif font-bold text-base text-slate-900">
                                        {auth.user?.identity_status === 'pending'
                                            ? 'Stripe Verification In Progress'
                                            : auth.user?.identity_status === 'requires_input'
                                            ? 'Verification Requires Attention'
                                            : 'Verify Government ID (Stripe Identity)'}
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                        RA 10173 • Can. 535
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                                    {auth.user?.identity_status === 'pending' ? (
                                        <>
                                            Your documents were submitted and are being reviewed by Stripe. You can{' '}
                                            <Link href="/identity/status" className="text-amber-800 font-bold underline">
                                                check status here
                                            </Link>
                                            .
                                        </>
                                    ) : auth.user?.identity_status === 'requires_input' ? (
                                        'Stripe could not clearly verify your previous submission. Please retry with a valid photo ID (Passport, PhilID, Driver\'s License, UMID) to unlock full certificate issuance.'
                                    ) : (
                                        'Official ecclesiastical certificate claims require verification of your government-issued ID to protect personal records under the Philippine Data Privacy Act.'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                            {auth.user?.identity_status === 'pending' ? (
                                <Link
                                    href="/identity/status"
                                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs transition shadow-xs"
                                >
                                    Check Status
                                </Link>
                            ) : (
                                <VerifyIdButton
                                    buttonText={
                                        auth.user?.identity_status === 'requires_input'
                                            ? 'Retry ID Verification'
                                            : 'Verify Government ID'
                                    }
                                    variant="amber"
                                    className="text-xs uppercase tracking-wider font-bold py-2.5 px-4"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Parishioner KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Claims */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-600 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Total Claims
                            </span>
                            <span className="text-2xl font-serif font-black text-slate-900 leading-tight block">
                                {derivedMetrics.total_claims}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                                Filed requests
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Under Processing */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-600 flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                In Processing
                            </span>
                            <span className="text-2xl font-serif font-black text-slate-900 leading-tight block">
                                {derivedMetrics.processing_claims}
                            </span>
                            <span className="text-[11px] text-sky-600 font-medium truncate block">
                                Canonical ledger matching
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Ready for Collection */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 flex items-center justify-center shrink-0">
                            <Award className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Ready for Pickup
                            </span>
                            <span className="text-2xl font-serif font-black text-emerald-700 leading-tight block">
                                {derivedMetrics.ready_claims}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-medium truncate block">
                                Available at Parish Office
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Upcoming Ceremonies */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-600 flex items-center justify-center shrink-0">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Appointments
                            </span>
                            <span className="text-2xl font-serif font-black text-slate-900 leading-tight block">
                                {derivedMetrics.upcoming_schedules}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                                Sacrament ceremonies
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sacramental Claims Distribution Pills */}
                {derivedMetrics.total_claims > 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                            <Layers className="w-4 h-4 text-amber-500" />
                            <span>Your Claimed Sacrament Distribution:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                Baptism: <strong>{derivedCounts.baptism}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                Confirmation: <strong>{derivedCounts.confirmation}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                                Marriage: <strong>{derivedCounts.marriage}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                Death: <strong>{derivedCounts.death}</strong>
                            </span>
                        </div>
                    </div>
                )}

                {/* Section 1: Active Document Claims & Certificate Requests */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-serif text-base font-bold text-slate-900">
                                    Document Claims &amp; Certificate Requests
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Official submissions requiring ledger verification &amp; seal affixing
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                {documentRequests.length} Total Claims
                            </span>
                            <Link
                                href="/portal/requests/create"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-2xs transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>New Claim</span>
                            </Link>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Tracking Code</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Name on Inscription</th>
                                    <th className="py-3 px-4">Parish Jurisdiction</th>
                                    <th className="py-3 px-4">Date Filed</th>
                                    <th className="py-3 px-4 min-w-[220px]">Workflow Progress</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {documentRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500 space-y-2">
                                            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                                            <p className="font-medium text-slate-600">
                                                You have not filed any document claims yet.
                                            </p>
                                            <Link
                                                href="/portal/requests/create"
                                                className="inline-flex items-center gap-1.5 text-amber-700 font-semibold hover:underline text-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                File your first church record claim now
                                            </Link>
                                        </td>
                                    </tr>
                                ) : (
                                    documentRequests.map((doc) => {
                                        const details = getStepDetails(doc.status);
                                        const isRejected = doc.status === 'rejected';

                                        return (
                                            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-mono font-bold text-slate-900 tracking-tight">
                                                        {doc.tracking_code}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {doc.internal_note?.toLowerCase().includes('staff') ||
                                                        doc.internal_note?.toLowerCase().includes('parish') ? (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                                Desk Filing
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                                                                Online Claim
                                                            </span>
                                                        )}
                                                        {doc.certificate_request_id && (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-mono font-bold">
                                                                Order #{doc.certificate_request_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 capitalize font-semibold text-slate-900">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        {doc.sacrament_type}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                                    {doc.name_on_record}
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-600">
                                                    {doc.targeted_parish?.name || 'Archdiocesan Curia Chancery'}
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                                    {doc.created_at.slice(0, 10)}
                                                </td>

                                                {/* Progressional Workflow Column */}
                                                <td className="py-3.5 px-4">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                    isRejected
                                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                        : doc.status === 'ready'
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse'
                                                                        : doc.status === 'completed'
                                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                                }`}
                                                            >
                                                                {isRejected ? (
                                                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                                                ) : doc.status === 'completed' || doc.status === 'ready' ? (
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                ) : (
                                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                                )}
                                                                {details.label}
                                                            </span>

                                                            {!isRejected && (
                                                                <span className="font-mono text-[10px] text-slate-500 font-semibold">
                                                                    Step {details.step}/5 ({details.percent}%)
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Stepper Progress Bar */}
                                                        {!isRejected ? (
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                        doc.status === 'completed'
                                                                            ? 'bg-emerald-600'
                                                                            : doc.status === 'ready'
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-amber-500'
                                                                    }`}
                                                                    style={{ width: `${details.percent}%` }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-rose-600 block">
                                                                Verification halted
                                                            </span>
                                                        )}

                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            {details.desc}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                                                    >
                                                        <span>Track</span>
                                                        <ArrowRight className="w-3 h-3 text-amber-400" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section 2: Scheduled Liturgical Ceremonies */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-700 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-serif text-base font-bold text-slate-900">
                                    Liturgical Appointments &amp; Ceremonies
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Confirmed schedule dates with presiding ministers &amp; venue bookings
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                {schedules.length} Scheduled
                            </span>
                            <Link
                                href="/portal/schedule-requests/create"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Book Ceremony</span>
                            </Link>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Appointment</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Parish &amp; Venue</th>
                                    <th className="py-3 px-4">Date &amp; Time</th>
                                    <th className="py-3 px-4">Presiding Minister</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500 space-y-2">
                                            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                                            <p className="font-medium text-slate-600">
                                                No liturgical appointments recorded for your account.
                                            </p>
                                            <Link
                                                href="/portal/schedule-requests/create"
                                                className="inline-flex items-center gap-1.5 text-sky-700 font-semibold hover:underline text-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Book a sacrament ceremony appointment now
                                            </Link>
                                        </td>
                                    </tr>
                                ) : (
                                    schedules.map((schedule) => {
                                        const starts = new Date(schedule.starts_at);
                                        return (
                                            <tr key={schedule.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                                    {schedule.title}
                                                </td>

                                                <td className="py-3.5 px-4 capitalize font-semibold text-slate-900">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                        {schedule.sacrament_type}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-700">
                                                    <div className="font-medium text-slate-900">
                                                        {schedule.parish?.name}
                                                    </div>
                                                    {schedule.venue && (
                                                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            {schedule.venue.name}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-700 font-medium">
                                                    <div className="font-semibold text-slate-900">
                                                        {starts.toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">
                                                        {starts.toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-slate-700">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>
                                                            {schedule.presiding_clergy?.titled_name || 'Assigned Officiant'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="flex flex-col gap-1">
                                                        <StatusBadge status={schedule.status} />
                                                        {schedule.status === 'cancelled' &&
                                                            schedule.cancellation_reason && (
                                                                <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1">
                                                                    <strong>Reason:</strong>{' '}
                                                                    {schedule.cancellation_reason}
                                                                </span>
                                                            )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    {schedule.status === 'confirmed' &&
                                                        schedule.payment_status !== 'paid' &&
                                                        schedule.payment_status !== 'pending_cash' && (
                                                            <Link
                                                                href={`/portal/schedule-requests/${schedule.id}/payment`}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors"
                                                            >
                                                                <CreditCard className="w-3.5 h-3.5" />
                                                                Pay Now
                                                            </Link>
                                                        )}
                                                    {schedule.payment_status === 'paid' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Paid
                                                        </span>
                                                    )}
                                                    {schedule.payment_status === 'pending_cash' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] uppercase">
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            Cash at Office
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Canonical Secretariat & Collection Notice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Collection Guidelines */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span>Certificate Collection Requirements</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                            Once marked <strong>Ready for Collection</strong>, certificates may be claimed at your parish secretariat office. Please prepare:
                        </p>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                            <li>One (1) original valid government-issued photo ID.</li>
                            <li>Your official Tracking Code reference.</li>
                            <li>Signed authorization letter &amp; representative ID if claimed on behalf of record holder.</li>
                        </ul>
                    </div>

                    {/* Data Privacy & Canonical Governance */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs space-y-2 text-xs text-slate-700">
                        <div className="flex items-center gap-2 text-emerald-900 font-serif font-bold text-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Republic Act 10173 (Data Privacy Act) Compliance</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                            All canonical registers and submitted identity records are processed strictly under the supervision of the Archdiocese of Lipa Curia Chancery for legitimate ecclesiastical administration. Records are protected by encrypted storage and strict role-based access.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal: Full 5-Step Claim & Certificate Tracking */}
            {selectedDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setSelectedDoc(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-serif font-bold text-lg text-slate-900">
                                        Document Claim Tracking
                                    </h3>
                                    <StatusBadge status={selectedDoc.status} />
                                </div>
                                <span className="font-mono text-xs text-amber-800 font-bold mt-0.5 block">
                                    Tracking Code: {selectedDoc.tracking_code}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDoc(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 5-Step Lifecycle Visual Stepper */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                                5-Step Canonical Certification Pipeline
                            </span>
                            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center text-xs">
                                {[
                                    { num: 1, label: 'Submitted', desc: 'Filing Received' },
                                    { num: 2, label: 'Under Review', desc: 'Ledger Checked' },
                                    { num: 3, label: 'Processing', desc: 'Curia Cleared' },
                                    { num: 4, label: 'Ready', desc: 'Seal Affixed' },
                                    { num: 5, label: 'Completed', desc: 'Released' },
                                ].map((step) => {
                                    const activeStep = getStepDetails(selectedDoc.status).step;
                                    const isDone = step.num <= activeStep;
                                    const isCurrent = step.num === activeStep;
                                    return (
                                        <div key={step.num} className="flex flex-col items-center">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                                                    isDone
                                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                                        : 'bg-slate-200 text-slate-500'
                                                } ${
                                                    isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''
                                                }`}
                                            >
                                                {isDone && step.num < activeStep ? (
                                                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                                                ) : (
                                                    step.num
                                                )}
                                            </div>
                                            <span
                                                className={`font-semibold text-[11px] block leading-tight ${
                                                    isCurrent
                                                        ? 'text-amber-800 font-bold'
                                                        : isDone
                                                        ? 'text-slate-800'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                {step.label}
                                            </span>
                                            <span className="text-[9px] text-slate-500 hidden sm:block mt-0.5">
                                                {step.desc}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Subject & Request Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white border border-slate-200 rounded-xl p-4">
                            <div>
                                <span className="text-slate-500 text-[11px] block">Name on Inscription:</span>
                                <strong className="text-slate-900">{selectedDoc.name_on_record}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[11px] block">Sacrament Type:</span>
                                <strong className="text-slate-900 capitalize">{selectedDoc.sacrament_type}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[11px] block">Parish Jurisdiction:</span>
                                <span className="text-slate-800">
                                    {selectedDoc.targeted_parish?.name || 'Curia Chancery'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[11px] block">Date Filed:</span>
                                <span className="text-slate-800">{selectedDoc.created_at.slice(0, 10)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[11px] block">Intended Purpose:</span>
                                <span className="text-slate-800">{selectedDoc.purpose || 'Personal Copy'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[11px] block">Linked Staff Order:</span>
                                <span className="font-mono text-amber-700 font-bold">
                                    {selectedDoc.certificate_request_id
                                        ? `#ORD-${selectedDoc.certificate_request_id}`
                                        : 'In Matching Queue'}
                                </span>
                            </div>
                        </div>

                        {/* Certificate Reference Card if Issued / Ready */}
                        {selectedDoc.certificate_request?.certificate_number && (
                            <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl flex items-start gap-3">
                                <Award className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                    <span className="font-bold text-emerald-900 text-sm block">
                                        Official Certificate Issued: {selectedDoc.certificate_request.certificate_number}
                                    </span>
                                    <p className="text-slate-700 leading-relaxed">
                                        Your certificate has been printed and embossed with the archdiocesan seal. You may claim it at the parish secretariat during official curia hours upon presenting valid photo ID.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Rejection / Note alert if applicable */}
                        {selectedDoc.rejection_reason && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                                <strong className="block font-bold">Reason for Disapproval:</strong>
                                <p>{selectedDoc.rejection_reason}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSelectedDoc(null)}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                            >
                                Close Tracker
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Biometric Face Reference Enrollment Modal */}
            <FaceEnrollmentModal
                isOpen={faceModalOpen}
                onClose={() => setFaceModalOpen(false)}
            />
        </PortalLayout>
    );
}
