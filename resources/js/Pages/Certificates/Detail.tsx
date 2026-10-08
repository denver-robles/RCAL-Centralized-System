import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { CertificateRequest, PageProps, RequestStatus } from '@/types';
import {
    Award,
    CheckCircle2,
    Clock,
    FileText,
    Printer,
    ShieldCheck,
    XCircle,
    UserCheck,
    AlertTriangle,
} from 'lucide-react';

interface Props extends PageProps {
    certificate: CertificateRequest;
}

export default function Detail({ auth, certificate }: Props) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { data, setData, processing, reset } = useForm({
        target_status: 'rejected',
        reason: '',
    });

    const handleTransition = (status: RequestStatus, reason?: string) => {
        setIsTransitioning(true);
        router.post(
            `/certificates/${certificate.id}/transition`,
            {
                target_status: status,
                reason: reason || '',
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsTransitioning(false),
            }
        );
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            `/certificates/${certificate.id}/transition`,
            {
                target_status: 'rejected',
                reason: data.reason,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setShowRejectModal(false);
                    reset();
                },
            }
        );
    };

    // Stepper definitions
    const steps = [
        { key: 'pending', label: '1. Order Submitted', icon: Clock },
        { key: 'verified', label: '2. Ledger Verified', icon: ShieldCheck },
        { key: 'approved', label: '3. Authorized', icon: UserCheck },
        { key: 'ready', label: '4. Seal Prepared', icon: FileText },
        { key: 'issued', label: '5. Issued & Released', icon: Award },
    ];

    const getStepStatus = (stepKey: string) => {
        const order = ['pending', 'verified', 'approved', 'ready', 'issued'];
        const currentIdx = order.indexOf(certificate.status);
        const stepIdx = order.indexOf(stepKey);

        if (certificate.status === 'rejected' || certificate.status === 'cancelled') {
            return 'inactive';
        }
        if (currentIdx >= stepIdx) {
            return currentIdx === stepIdx ? 'current' : 'complete';
        }
        return 'upcoming';
    };

    const isClosed = certificate.status === 'issued' || certificate.status === 'rejected' || certificate.status === 'cancelled';

    return (
        <PortalLayout
            title={`Certificate Order #${certificate.id}`}
            subtitle={
                certificate.certificate_number
                    ? `Official Certificate Series ${certificate.certificate_number}`
                    : 'Canonical Certificate Processing & Issuance Pipeline'
            }
            activeTab="certificates"
        >
            <Head title={`Order #${certificate.id} - RCAL PIMS`} />

            <div className="space-y-6">
                {/* 5-Step Progress Tracker (Crisp White) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                                Workflow Status:
                            </span>
                            <StatusBadge status={certificate.status} />
                        </div>

                        {certificate.status === 'issued' && (
                            <Link
                                href={`/certificates/${certificate.id}/print`}
                                target="_blank"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all duration-200"
                            >
                                <Printer className="w-4 h-4" />
                                Print Archdiocesan Certificate
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {steps.map((step) => {
                            const status = getStepStatus(step.key);
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.key}
                                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                                        status === 'complete'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                            : status === 'current'
                                            ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300 font-bold'
                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-semibold">{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Workflow Action Bar */}
                {!isClosed && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="font-bold text-slate-800">Available Workflow Actions:</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {certificate.status === 'pending' && (
                                <button
                                    onClick={() => handleTransition('verified')}
                                    disabled={isTransitioning || processing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-xs disabled:opacity-50"
                                >
                                    {isTransitioning ? 'Verifying...' : 'Verify Ledger Entry'}
                                </button>
                            )}

                            {certificate.status === 'verified' && (
                                <button
                                    onClick={() => handleTransition('approved')}
                                    disabled={isTransitioning || processing}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-xs disabled:opacity-50"
                                >
                                    {isTransitioning ? 'Approving...' : 'Approve Issuance'}
                                </button>
                            )}

                            {certificate.status === 'approved' && (
                                <button
                                    onClick={() => handleTransition('ready')}
                                    disabled={isTransitioning || processing}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all duration-200 shadow-xs disabled:opacity-50"
                                >
                                    {isTransitioning ? 'Preparing...' : 'Mark Ready for Pick-Up'}
                                </button>
                            )}

                            {certificate.status === 'ready' && auth.user?.can_issue_certificates && (
                                <button
                                    onClick={() => handleTransition('issued')}
                                    disabled={isTransitioning || processing}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all duration-200 disabled:opacity-50"
                                >
                                    {isTransitioning ? 'Issuing...' : 'Officially Issue Certificate'}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setData('target_status', 'rejected');
                                    setShowRejectModal(true);
                                }}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium transition-colors"
                            >
                                Reject Order
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Two-Column View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Canonical Record Folio Summary */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <h3 className="font-serif text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    Canonical Record Details
                                </h3>
                                {certificate.record && (
                                    <Link
                                        href={`/records/${certificate.record.id}`}
                                        className="text-xs text-amber-600 hover:underline font-mono font-medium"
                                    >
                                        Folio Citation: {certificate.record.citation}
                                    </Link>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-500 block mb-1">Subject Full Name</span>
                                    <span className="font-semibold text-slate-900 text-sm">
                                        {certificate.record?.person?.full_name}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-1">Sacrament Type</span>
                                    <span className="font-semibold capitalize text-amber-700 text-sm">
                                        {certificate.record?.sacrament_type}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-1">Date of Event</span>
                                    <span className="font-semibold text-slate-800">
                                        {certificate.record?.event_date?.slice(0, 10)}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-1">Parents</span>
                                    <span className="text-slate-800">
                                        {certificate.record?.person?.father_name || 'N/A'} &{' '}
                                        {certificate.record?.person?.mother_name || 'N/A'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-1">Originating Parish</span>
                                    <span className="text-slate-800">
                                        {certificate.record?.originating_parish?.name}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-1">Officiating Clergy</span>
                                    <span className="text-slate-800">
                                        {certificate.record?.performed_by_clergy
                                            ? `${certificate.record.performed_by_clergy.title} ${certificate.record.performed_by_clergy.first_name} ${certificate.record.performed_by_clergy.last_name}`
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Marginal Annotations block */}
                            {certificate.record?.annotations && certificate.record.annotations.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <h4 className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-2">
                                        Can. 535 §2 Marginal Annotations Attached:
                                    </h4>
                                    <div className="space-y-2">
                                        {certificate.record.annotations.map((ann) => (
                                            <div
                                                key={ann.id}
                                                className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs"
                                            >
                                                <div className="flex items-center justify-between text-slate-500 mb-1">
                                                    <span className="font-bold capitalize text-amber-800">
                                                        {ann.annotation_type}
                                                    </span>
                                                    <span>{ann.created_at.slice(0, 10)}</span>
                                                </div>
                                                <p className="text-slate-700">{ann.note_text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Order Metadata & Cryptographic Tokens */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                            <h3 className="font-serif text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                                <Award className="w-5 h-5 text-amber-600" />
                                Order Information
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-500 block">Applicant / Requester</span>
                                    <span className="font-semibold text-slate-900">{certificate.requester_name}</span>
                                </div>

                                {certificate.requester_contact && (
                                    <div>
                                        <span className="text-slate-500 block">Contact Info</span>
                                        <span className="text-slate-800">{certificate.requester_contact}</span>
                                    </div>
                                )}

                                <div>
                                    <span className="text-slate-500 block">Declared Purpose</span>
                                    <span className="text-slate-800">{certificate.purpose || 'Official Church Documentation'}</span>
                                </div>

                                {certificate.certificate_number && (
                                    <div className="pt-2 border-t border-slate-200">
                                        <span className="text-slate-500 block">Certificate Series Number</span>
                                        <span className="font-mono font-bold text-amber-700 text-sm">
                                            {certificate.certificate_number}
                                        </span>
                                    </div>
                                )}

                                {certificate.verification_token && (
                                    <div className="pt-2 border-t border-slate-200">
                                        <span className="text-slate-500 block mb-1">Cryptographic Verification Token</span>
                                        <div className="font-mono text-[10px] break-all bg-slate-50 p-2 rounded border border-slate-200 text-emerald-800">
                                            {certificate.verification_token}
                                        </div>
                                    </div>
                                )}

                                {certificate.rejection_reason && (
                                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800">
                                        <span className="font-bold block mb-1">Rejection Reason:</span>
                                        {certificate.rejection_reason}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audit Trail Timestamps */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
                            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2">
                                RA 10173 Audit Signatures
                            </h4>

                            <div className="space-y-2 text-slate-500">
                                <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span className="text-slate-800 font-medium">{certificate.created_at.slice(0, 16)}</span>
                                </div>
                                {certificate.verified_at && (
                                    <div className="flex justify-between">
                                        <span>Verified:</span>
                                        <span className="text-slate-800 font-medium">{certificate.verified_at.slice(0, 16)}</span>
                                    </div>
                                )}
                                {certificate.approved_at && (
                                    <div className="flex justify-between">
                                        <span>Approved:</span>
                                        <span className="text-slate-800 font-medium">{certificate.approved_at.slice(0, 16)}</span>
                                    </div>
                                )}
                                {certificate.issued_at && (
                                    <div className="flex justify-between">
                                        <span>Officially Issued:</span>
                                        <span className="text-emerald-700 font-bold">{certificate.issued_at.slice(0, 16)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => {
                        setShowRejectModal(false);
                        reset();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setShowRejectModal(false);
                            reset();
                        }
                    }}
                    tabIndex={-1}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 text-rose-600 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="font-semibold text-base text-slate-900">Reject Certificate Order</h3>
                        </div>

                        <form onSubmit={handleRejectSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Mandatory Rejection Rationale <span className="text-rose-600">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Explain why this request is rejected (e.g. invalid identification, unmatched ledger entry, unauthorized requester)..."
                                    required
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-colors"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        reset();
                                    }}
                                    className="btn-cancel text-xs py-1.5 px-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.reason.trim()}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    {processing ? 'Submitting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
