import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { DocumentRequest, PageProps, SacramentSchedule } from '@/types';
import { FileText, Calendar, Plus, ShieldCheck, CheckCircle2, Clock, Award, X, ExternalLink, ArrowRight } from 'lucide-react';

interface Props extends PageProps {
    documentRequests: DocumentRequest[];
    schedules: SacramentSchedule[];
}

export default function Dashboard({ auth, documentRequests, schedules }: Props) {
    const [selectedDoc, setSelectedDoc] = useState<DocumentRequest | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedDoc(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getStepIndex = (status: string) => {
        switch (status) {
            case 'submitted': return 1;
            case 'under_review': return 2;
            case 'processing': return 3;
            case 'ready': return 4;
            case 'completed': return 5;
            default: return 1;
        }
    };
    return (
        <PortalLayout
            title="Parishioner Self-Service Portal"
            subtitle={`Welcome back, ${auth.user?.display_name || auth.user?.username}. Manage your sacramental document claims and scheduled ceremonies.`}
        >
            <Head title="Parishioner Dashboard - RCAL PIMS" />

            <div className="space-y-6">
                {/* Action Welcome Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
                    <div className="space-y-1">
                        <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                            Roman Catholic Archdiocese of Lipa
                        </span>
                        <h2 className="font-serif text-xl font-bold text-white">
                            Sacramental Records & Certificate Processing
                        </h2>
                        <p className="text-xs text-slate-300 max-w-xl">
                            Request certified copies of your Baptism, Confirmation, Marriage, or Death certificates with end-to-end status tracking and Data Privacy (RA 10173) compliance.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/portal/requests/create"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" />
                            File New Document Claim
                        </Link>
                    </div>
                </div>

                {/* Section 1: Active Document Claims */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-amber-600" />
                            <h3 className="font-serif text-base font-bold text-slate-900">
                                Your Document Claims & Certificate Requests
                            </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                            {documentRequests.length} Total Claims
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Tracking Code</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Name on Record</th>
                                    <th className="py-3 px-4">Parish Jurisdiction</th>
                                    <th className="py-3 px-4">Date Filed</th>
                                    <th className="py-3 px-4">Lifecycle Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {documentRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-slate-500">
                                            You have not filed any document claims yet.{' '}
                                            <Link href="/portal/requests/create" className="text-amber-600 font-semibold hover:underline">
                                                File your first claim now.
                                            </Link>
                                        </td>
                                    </tr>
                                ) : (
                                    documentRequests.map((doc) => {
                                        const step = getStepIndex(doc.status);
                                        return (
                                            <tr key={doc.id} className="hover:bg-amber-50/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-mono font-bold text-amber-800">
                                                        {doc.tracking_code}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {doc.internal_note?.toLowerCase().includes('staff') || doc.internal_note?.toLowerCase().includes('parish') ? (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-sans font-medium">
                                                                Desk Filing
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-sans font-medium">
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
                                                <td className="py-3 px-4 capitalize font-medium text-slate-800">
                                                    {doc.sacrament_type}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-900">
                                                    {doc.name_on_record}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {doc.targeted_parish?.name || 'Archdiocesan Curia Chancery'}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500">
                                                    {doc.created_at.slice(0, 10)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="space-y-1.5">
                                                        <StatusBadge status={doc.status} />
                                                        {/* 5-step miniature progress dots */}
                                                        {step > 0 && (
                                                            <div className="flex items-center gap-1 w-24">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <div
                                                                        key={s}
                                                                        className={`h-1.5 flex-1 rounded-full ${
                                                                            s <= step ? 'bg-amber-500' : 'bg-slate-200'
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs shadow-2xs transition-colors"
                                                    >
                                                        Track
                                                        <ArrowRight className="w-3 h-3 text-amber-600" />
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

                {/* Section 2: Scheduled Sacramental Ceremonies */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <Calendar className="w-5 h-5 text-sky-600" />
                            <h3 className="font-serif text-base font-bold text-slate-900">
                                Your Liturgical Appointments & Ceremonies
                            </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                            {schedules.length} Scheduled
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Appointment</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Parish & Venue</th>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Minister</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-500">
                                            No liturgical appointments recorded for your account.
                                        </td>
                                    </tr>
                                ) : (
                                    schedules.map((schedule) => {
                                        const starts = new Date(schedule.starts_at);
                                        return (
                                            <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-slate-900">
                                                    {schedule.title}
                                                </td>
                                                <td className="py-3 px-4 capitalize text-slate-700">
                                                    {schedule.sacrament_type}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {schedule.parish?.name}
                                                    {schedule.venue && ` (${schedule.venue.name})`}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {starts.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}{' '}
                                                    at{' '}
                                                    {starts.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {schedule.presiding_clergy?.titled_name || 'Assigned Officiant'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <StatusBadge status={schedule.status} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Data Privacy (RA 10173) Notice */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-700">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold text-emerald-900 block mb-0.5">
                            Data Privacy Act of 2012 (Republic Act 10173) Compliance Notice
                        </span>
                        <p className="text-slate-600 leading-relaxed">
                            All personal data, sacramental ledger references, and supporting identity documents submitted through the RCAL PIMS Parishioner Portal are processed exclusively for legitimate canonical administration by authorized archdiocesan personnel. Records are safeguarded by strict role-based isolation and full cryptographic audit logging.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal: Full 5-Step Claim & Certificate Tracking */}
            {selectedDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setSelectedDoc(null)}
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-5 animate-in zoom-in-95 duration-200"
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
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 5-Step Lifecycle Visual Stepper */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                                5-Step Canonical Certification Pipeline
                            </span>
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                {[
                                    { num: 1, label: 'Submitted', desc: 'Filing Received' },
                                    { num: 2, label: 'Verified', desc: 'Ledger Checked' },
                                    { num: 3, label: 'Approved', desc: 'Curia Cleared' },
                                    { num: 4, label: 'Ready', desc: 'Seal Affixed' },
                                    { num: 5, label: 'Issued', desc: 'Released' },
                                ].map((step) => {
                                    const activeStep = getStepIndex(selectedDoc.status);
                                    const isDone = step.num <= activeStep;
                                    const isCurrent = step.num === activeStep;
                                    return (
                                        <div key={step.num} className="flex flex-col items-center">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                                                    isDone
                                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                                        : 'bg-slate-200 text-slate-500'
                                                } ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                                            >
                                                {isDone && step.num < activeStep ? (
                                                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                                                ) : (
                                                    step.num
                                                )}
                                            </div>
                                            <span
                                                className={`font-semibold text-[11px] block ${
                                                    isCurrent
                                                        ? 'text-amber-800 font-bold'
                                                        : isDone
                                                        ? 'text-slate-800'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                {step.label}
                                            </span>
                                            <span className="text-[9px] text-slate-500 hidden sm:block">
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
                                <span className="text-slate-800">{selectedDoc.targeted_parish?.name || 'Curia Chancery'}</span>
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
                                    {selectedDoc.certificate_request_id ? `#ORD-${selectedDoc.certificate_request_id}` : 'In Matching Queue'}
                                </span>
                            </div>
                        </div>

                        {/* Certificate Reference Card if Issued */}
                        {selectedDoc.certificate_request?.certificate_number && (
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3">
                                <Award className="w-6 h-6 text-amber-600 shrink-0" />
                                <div className="text-xs">
                                    <span className="font-bold text-amber-900 block">
                                        Official Certificate Issued: {selectedDoc.certificate_request.certificate_number}
                                    </span>
                                    <span className="text-slate-600 text-[11px]">
                                        Your document is ready for collection at the parish secretariat office upon presenting valid photo ID.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Rejection / Note alert if applicable */}
                        {selectedDoc.rejection_reason && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                                <strong>Reason for Disapproval:</strong> {selectedDoc.rejection_reason}
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSelectedDoc(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                            >
                                Close Tracker
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
