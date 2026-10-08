import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { SacramentalRecord, CanonicalAnnotation } from '@/types';
import {
    BookOpen,
    FileText,
    Calendar,
    Church,
    User,
    Plus,
    ShieldAlert,
    CheckCircle,
    FileCheck,
    Clock,
    X,
} from 'lucide-react';

const DEFAULT_ANNOTATION_TYPES = [
    { value: 'marriage', label: 'Holy Matrimony (Can. 1055)', links_to_record: true },
    { value: 'holy_orders', label: 'Holy Orders / Diaconate / Priesthood', links_to_record: false },
    { value: 'solemn_profession', label: 'Solemn Religious Profession', links_to_record: false },
    { value: 'nullity', label: 'Decree of Nullity / Dissolution', links_to_record: false },
    { value: 'correction', label: 'Canonical Rectification / Correction', links_to_record: false },
    { value: 'adoption', label: 'Legal / Canonical Adoption', links_to_record: false },
    { value: 'confirmation', label: 'Confirmation Notation', links_to_record: true },
    { value: 'other', label: 'Other Curial Marginal Annotation', links_to_record: false },
];

interface ParishionerUser {
    id: number;
    display_name: string;
    username: string;
    email: string;
    phone?: string | null;
}

interface DetailProps {
    record: SacramentalRecord;
    canWrite?: boolean;
    annotationTypes?: Array<{ value: string; label: string; links_to_record: boolean }>;
    parishioners?: ParishionerUser[];
}

export default function Detail({
    record,
    canWrite = true,
    annotationTypes = DEFAULT_ANNOTATION_TYPES,
    parishioners = [],
}: DetailProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);

    const safeAnnotationTypes = annotationTypes || DEFAULT_ANNOTATION_TYPES;

    // Annotation Form
    const {
        data: annotationData,
        setData: setAnnotationData,
        post: postAnnotation,
        processing: annotationProcessing,
        errors: annotationErrors,
        reset: resetAnnotation,
    } = useForm({
        annotation_type: 'marriage',
        note_text: '',
        event_date: '',
        decree_reference: '',
        reference_record_id: '',
    });

    // Certificate Order Form
    const {
        data: orderData,
        setData: setOrderData,
        post: postOrder,
        processing: orderProcessing,
        errors: orderErrors,
        reset: resetOrder,
    } = useForm({
        record_id: record.id,
        parishioner_id: '',
        requester_name: record.person?.full_name || '',
        requester_contact: '',
        purpose: 'Official Church Documentation',
    });

    const submitAnnotation = (e: React.FormEvent) => {
        e.preventDefault();
        postAnnotation(`/records/${record.id}/annotate`, {
            onSuccess: () => {
                setModalOpen(false);
                resetAnnotation();
            },
        });
    };

    const submitOrder = (e: React.FormEvent) => {
        e.preventDefault();
        postOrder('/certificates', {
            onSuccess: () => {
                setOrderModalOpen(false);
                resetOrder();
            },
        });
    };

    const selectedType = safeAnnotationTypes.find((t) => t.value === annotationData.annotation_type);

    return (
        <PortalLayout activeTab="records" title={`Canonical Folio: ${record.citation}`}>
            <Head title={`${record.person?.full_name || 'Record'} (${record.citation}) — RCAL PIMS`} />

            {/* Invariant Banner */}
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                        <strong className="text-amber-800 font-bold">Code of Canon Law Can. 535 Strict Invariant:</strong>
                        <p className="mt-0.5 text-slate-700">
                            This sacramental transcription is legally immutable. Direct edits to original entries are prohibited. Any subsequent ecclesiastical events (matrimony, holy orders, religious profession, nullity) or corrections are appended strictly as signed marginal annotations.
                        </p>
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setOrderModalOpen(true)}
                        className="btn-primary py-2 px-3 text-xs w-full sm:w-auto"
                    >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Issue Certificate</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Register Folio Details (Crisp White) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Primary Subject Card */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                            <div>
                                <span className="text-xs font-mono uppercase text-amber-700 font-bold">
                                    Subject Person
                                </span>
                                <h2 className="text-2xl font-serif font-bold text-slate-900 mt-1">
                                    {record.person?.full_name || 'N/A'}
                                </h2>
                            </div>
                            <span className="capitalize px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                {record.sacrament_type}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                            <div>
                                <span className="block text-slate-500 text-xs">Date of Birth:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.person?.date_of_birth || 'Not recorded'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Sex:</span>
                                <span className="font-semibold text-slate-800 capitalize">
                                    {record.person?.sex || 'Not recorded'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Father:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.person?.father_name || 'Not recorded'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Mother:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.person?.mother_name || 'Not recorded'}
                                </span>
                            </div>

                            {record.spouse && (
                                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                                    <span className="block text-slate-500 text-xs">Spouse (Party to Marriage):</span>
                                    <span className="font-bold text-amber-800 text-base">
                                        {record.spouse.full_name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ecclesial Inscription Citation */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                        <h3 className="text-sm font-mono uppercase text-slate-600 font-bold mb-4 border-b border-slate-200 pb-2">
                            Canonical Inscription Citation
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                            <div>
                                <span className="block text-slate-500 text-xs">Book Number:</span>
                                <span className="font-mono font-bold text-amber-700 text-base">
                                    {record.book_number}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Page / Folio:</span>
                                <span className="font-mono font-bold text-amber-700 text-base">
                                    {record.page_number}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Entry Number:</span>
                                <span className="font-mono font-bold text-amber-700 text-base">
                                    {record.entry_number}
                                </span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="block text-slate-500 text-xs">Originating Parish:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.originating_parish?.name || `Parish #${record.originating_parish_id}`}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Date of Event:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.event_date}
                                </span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="block text-slate-500 text-xs">Officiating Minister:</span>
                                <span className="font-semibold text-slate-800">
                                    {record.performed_by_clergy?.titled_name || 'Not recorded'}
                                </span>
                            </div>
                            {record.legitimacy && (
                                <div>
                                    <span className="block text-slate-500 text-xs">Legitimacy:</span>
                                    <span className="font-semibold text-slate-800 capitalize">
                                        {record.legitimacy}
                                    </span>
                                </div>
                            )}
                        </div>

                        {record.godparents && (
                            <div className="mt-4 pt-3 border-t border-slate-200 text-xs">
                                <span className="block text-slate-500 font-medium">Sponsors / Godparents:</span>
                                <p className="text-slate-800 mt-0.5">{record.godparents}</p>
                            </div>
                        )}
                        {record.witnesses && (
                            <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                                <span className="block text-slate-500 font-medium">Witnesses:</span>
                                <p className="text-slate-800 mt-0.5">{record.witnesses}</p>
                            </div>
                        )}
                        {record.register_notes && (
                            <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                                <span className="block text-slate-500 font-medium">Register Notes:</span>
                                <p className="text-slate-800 mt-0.5 italic">{record.register_notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Canon 535 Marginal Annotations Sidebar */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                            <h3 className="font-serif font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-amber-600" />
                                <span>Can. 535 Margin Notes</span>
                            </h3>

                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(true)}
                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                    title="Append Margin Note"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {!record.annotations || record.annotations.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                                No marginal notes have been appended to this register entry.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {record.annotations.map((ann) => (
                                    <div
                                        key={ann.id}
                                        className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-amber-800 uppercase tracking-wide">
                                                {ann.annotation_type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                {ann.created_at.split('T')[0]}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed">{ann.note_text}</p>
                                        {ann.decree_reference && (
                                            <div className="text-[11px] text-slate-600">
                                                Decree Ref: <span className="text-slate-900 font-mono font-medium">{ann.decree_reference}</span>
                                            </div>
                                        )}
                                        {ann.reference_record_id && (
                                            <div className="text-[11px] text-amber-700 font-mono font-medium">
                                                Linked Record: #{ann.reference_record_id}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Initialize Certificate Order */}
            {orderModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
                    onClick={() => {
                        setOrderModalOpen(false);
                        resetOrder();
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-amber-600" />
                                Initialize Certificate Order
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setOrderModalOpen(false);
                                    resetOrder();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={submitOrder} className="space-y-4 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Registered Parishioner Account (Optional)
                                </label>
                                <select
                                    value={orderData.parishioner_id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const found = parishioners?.find((p) => String(p.id) === val);
                                        setOrderData((prev) => ({
                                            ...prev,
                                            parishioner_id: val,
                                            requester_name: found ? found.display_name : prev.requester_name,
                                            requester_contact: found ? (found.phone || found.email) : prev.requester_contact,
                                        }));
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs text-xs"
                                >
                                    <option value="">Walk-in / Offline Requester (Unregistered)</option>
                                    {parishioners?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.display_name} ({p.email})
                                        </option>
                                    ))}
                                </select>
                                {orderData.parishioner_id && (
                                    <p className="text-emerald-700 text-[11px] mt-1.5 flex items-center gap-1 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                        <span>✓ This order will automatically appear in this parishioner's portal dashboard with live tracking.</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Applicant / Requester Name <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orderData.requester_name}
                                    onChange={(e) => setOrderData('requester_name', e.target.value)}
                                    placeholder="Full name of person requesting certificate"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                />
                                {orderErrors.requester_name && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{orderErrors.requester_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Requester Contact Phone (7 Digits)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{7}"
                                    maxLength={7}
                                    value={orderData.requester_contact}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 7);
                                        setOrderData('requester_contact', clean);
                                    }}
                                    placeholder="e.g. 7562572"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                />
                                <span className="text-[10px] text-slate-500 mt-0.5 block">Batangas standard: exactly 7 numeric digits.</span>
                                {orderErrors.requester_contact && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{orderErrors.requester_contact}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Purpose of Certificate <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orderData.purpose}
                                    onChange={(e) => setOrderData('purpose', e.target.value)}
                                    placeholder="e.g. Marriage License, School Requirement, Personal Copy"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                />
                                {orderErrors.purpose && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{orderErrors.purpose}</p>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderModalOpen(false);
                                        resetOrder();
                                    }}
                                    className="btn-cancel text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={orderProcessing}
                                    className="btn-primary text-xs"
                                >
                                    {orderProcessing ? 'Creating Order...' : 'Create Certificate Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Append Margin Note (Canon 535 §2) */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
                    onClick={() => {
                        setModalOpen(false);
                        resetAnnotation();
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                            <h3 className="font-serif font-bold text-lg text-slate-900">
                                Append Marginal Annotation (Can. 535 §2)
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setModalOpen(false);
                                    resetAnnotation();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={submitAnnotation} className="space-y-4 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Annotation Type
                                </label>
                                <select
                                    value={annotationData.annotation_type}
                                    onChange={(e) => setAnnotationData('annotation_type', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                >
                                    {safeAnnotationTypes.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                    Marginal Note Inscription
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Enter verbatim canonical annotation as inscribed in the physical parish book..."
                                    value={annotationData.note_text}
                                    onChange={(e) => setAnnotationData('note_text', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                />
                                {annotationErrors.note_text && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{annotationErrors.note_text}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 font-semibold mb-1">
                                        Date of Event
                                    </label>
                                    <input
                                        type="date"
                                        value={annotationData.event_date}
                                        onChange={(e) => setAnnotationData('event_date', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-semibold mb-1">
                                        Decree / Protocol Reference
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Curia Decree No. 2026-08"
                                        value={annotationData.decree_reference}
                                        onChange={(e) => setAnnotationData('decree_reference', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            {selectedType?.links_to_record && (
                                <div>
                                    <label className="block text-slate-700 font-semibold mb-1">
                                        Related Register Entry ID
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Target record ID (e.g. 42)"
                                        value={annotationData.reference_record_id}
                                        onChange={(e) => setAnnotationData('reference_record_id', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                    {annotationErrors.reference_record_id && (
                                        <p className="text-rose-600 text-xs mt-1 font-medium">{annotationErrors.reference_record_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalOpen(false);
                                        resetAnnotation();
                                    }}
                                    className="btn-cancel text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={annotationProcessing}
                                    className="btn-primary text-xs"
                                >
                                    {annotationProcessing ? 'Recording...' : 'Inscribe Margin Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
