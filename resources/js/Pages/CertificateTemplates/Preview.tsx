import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, SacramentalRecord, PageProps } from '@/types';
import axios from 'axios';
import {
    Printer,
    Download,
    ArrowLeft,
    Search,
    RotateCcw,
    Sparkles,
    CheckCircle2,
    Calendar,
    User,
    BookOpen,
    Edit3,
} from 'lucide-react';

interface Props extends PageProps {
    template?: CertificateTemplate | null;
    selectedSacrament: 'baptism' | 'confirmation';
    records: SacramentalRecord[];
    populatedData: Record<string, string>;
    selectedRecord: number | null;
}

export default function Preview({
    auth,
    template,
    selectedSacrament,
    records,
    populatedData,
    selectedRecord,
}: Props) {
    const [sacrament, setSacrament] = useState<'baptism' | 'confirmation'>(selectedSacrament);
    const [recordId, setRecordId] = useState<string>(selectedRecord ? String(selectedRecord) : '');
    const [recordSearch, setRecordSearch] = useState('');
    const [certData, setCertData] = useState<Record<string, string>>(populatedData || {});
    const [isPrinting, setIsPrinting] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState<boolean>(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadPdfPreview = async () => {
        // Abort previous in-flight request if user triggered a new change
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsRendering(true);
        setRenderError(null);
        try {
            const response = await axios.post(
                '/certificate-templates/preview-pdf',
                {
                    template_id: template?.id ?? null,
                    record_id: recordId ? Number(recordId) : null,
                    sacrament_type: sacrament,
                    overrides: certData,
                },
                {
                    responseType: 'blob',
                    signal: controller.signal,
                }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
            setPdfUrl(URL.createObjectURL(blob));
        } catch (error: any) {
            // Ignore cancelled requests
            if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') {
                return;
            }

            console.error('Failed to load certificate PDF preview', error);
            let msg = 'Failed to generate PDF preview via Carbone.';

            if (error.response?.data instanceof Blob) {
                try {
                    const errText = await error.response.data.text();
                    try {
                        const parsed = JSON.parse(errText);
                        if (parsed.error) {
                            msg = parsed.error;
                        }
                    } catch {
                        if (errText.includes('Maximum execution time')) {
                            msg = 'Server timed out while rendering PDF (exceeded PHP execution time). Please try again.';
                        } else if (errText.includes('cURL error 60')) {
                            msg = 'SSL connection error to Carbone API. Check CARBONE_VERIFY_SSL in .env.';
                        } else if (errText.includes('cURL error 28')) {
                            msg = 'Carbone API timed out. Please check your internet connection.';
                        } else if (errText.length > 0 && errText.length < 250) {
                            msg = errText;
                        }
                    }
                } catch {
                    // Fallback to default message
                }
            } else if (error.response?.data?.error) {
                msg = error.response.data.error;
            } else if (error.message) {
                msg = error.message;
            }
            setRenderError(msg);
        } finally {
            setIsRendering(false);
        }
    };

    // Automatically fetch the PDF preview when sacrament, record, or fields change
    useEffect(() => {
        const timer = setTimeout(() => {
            loadPdfPreview();
        }, 800); // 800ms debounce
        return () => clearTimeout(timer);
    }, [sacrament, recordId, certData]);
    // Sync certData when populatedData prop updates
    useEffect(() => {
        setCertData(populatedData || {});
    }, [populatedData]);

    // Handle switching between Baptismal and Confirmation
    const handleSacramentChange = (newSacrament: 'baptism' | 'confirmation') => {
        setSacrament(newSacrament);
        setRecordId('');
        router.get(
            '/certificate-templates/preview',
            { sacrament_type: newSacrament },
            { preserveState: false }
        );
    };

    // Handle selecting a record for auto-population
    const handleRecordChange = (newRecordId: string) => {
        setRecordId(newRecordId);
        router.get(
            '/certificate-templates/preview',
            {
                sacrament_type: sacrament,
                record_id: newRecordId || undefined,
            },
            { preserveState: false }
        );
    };

    // Handle manual inline input updates
    const handleFieldChange = (key: string, value: string) => {
        setCertData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // Filter available records by search query
    const filteredRecords = records.filter((r) => {
        if (!recordSearch) {
            return true;
        }
        const q = recordSearch.toLowerCase();
        return (
            r.person?.full_name?.toLowerCase().includes(q) ||
            r.citation?.toLowerCase().includes(q) ||
            String(r.book_number).includes(q) ||
            String(r.page_number).includes(q)
        );
    });

    const isBaptism = sacrament === 'baptism';
    const borderColorClass = isBaptism ? 'border-[#2d8a4e]' : 'border-[#d4a017]';
    const themeBgAccent = isBaptism ? 'bg-emerald-500' : 'bg-amber-500';

    return (
        <PortalLayout activeTab="certificate_templates">
            <Head title={`Generate ${isBaptism ? 'Baptismal' : 'Confirmation'} Certificate`} />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 print:p-0">
                {/* ── Top Control & Dropdown Bar (Hidden when printing) ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6 print:hidden">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Back + Sacrament Dropdown */}
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href="/certificate-templates"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Templates
                            </Link>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Certificate:
                                </label>
                                <select
                                    value={sacrament}
                                    onChange={(e) =>
                                        handleSacramentChange(e.target.value as 'baptism' | 'confirmation')
                                    }
                                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                >
                                    <option value="baptism">Baptismal Certificate</option>
                                    <option value="confirmation">Confirmation Certificate</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                            {/* Record Auto-populate Dropdown */}
                            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                    Auto-Populate:
                                </label>
                                <select
                                    value={recordId}
                                    onChange={(e) => handleRecordChange(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none truncate"
                                >
                                    <option value="">— Select a Completed {isBaptism ? 'Baptism' : 'Confirmation'} Record —</option>
                                    {filteredRecords.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.person?.full_name || 'Record #' + r.id} ({r.citation || `Book ${r.book_number}, Page ${r.page_number}`})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Print / Action Buttons */}
                        <div className="flex items-center gap-3 justify-end shrink-0">
                            {pdfUrl && (
                                <a
                                    href={pdfUrl}
                                    download={`${sacrament}_certificate.pdf`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition text-sm"
                                    title="Download the rendered PDF"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    if (iframeRef.current?.contentWindow) {
                                        iframeRef.current.contentWindow.print();
                                    } else {
                                        window.print();
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-sm text-sm"
                            >
                                <Printer className="w-4 h-4" />
                                Print Certificate
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Main Two-Column Layout (Form on Left, Canvas on Right) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ── Left Editor Column (Hidden when printing) ── */}
                    <div className="lg:col-span-4 space-y-4 print:hidden">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-amber-500" />
                                    Manual Field Editor
                                </h3>
                                <span className="text-xs font-semibold text-slate-400">
                                    Live Updates
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                All changes made below reflect instantly on the certificate canvas.
                            </p>

                            <div className="space-y-3.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {/* Recipient Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Recipient Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['recipient_name'] || ''}
                                        onChange={(e) => handleFieldChange('recipient_name', e.target.value.toUpperCase())}
                                        placeholder="e.g. WESLYNN PIERRE P. ARQUINES"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none uppercase font-bold text-red-600"
                                    />
                                </div>

                                {/* Parents */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Parents Citation
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['parents'] || ''}
                                        onChange={(e) => handleFieldChange('parents', e.target.value)}
                                        placeholder="e.g. Child of John Patrick Arquines & Lovely M. Parcon"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['formatted_birth_date'] || ''}
                                        onChange={(e) => handleFieldChange('formatted_birth_date', e.target.value)}
                                        placeholder="e.g. Born on the 21st day of October 2024"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Place of Birth */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Place of Birth
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['place_of_birth'] || ''}
                                        onChange={(e) => handleFieldChange('place_of_birth', e.target.value)}
                                        placeholder="e.g. In RMD Maternity Clinic Lipa City, Batangas"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Date of Sacrament */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Sacrament Date
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['formatted_event_date'] || ''}
                                        onChange={(e) => handleFieldChange('formatted_event_date', e.target.value)}
                                        placeholder="e.g. On the 19th day of October, year of our Lord 2025"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Minister */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Presiding Minister
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['minister_name'] || ''}
                                        onChange={(e) => handleFieldChange('minister_name', e.target.value)}
                                        placeholder="e.g. Rev. Fr. Aren Bejasa, OSJ"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Parish Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Parish of Administration
                                    </label>
                                    <input
                                        type="text"
                                        value={certData['parish_name'] || ''}
                                        onChange={(e) => handleFieldChange('parish_name', e.target.value)}
                                        placeholder="e.g. St. Joseph the Worker Parish"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                {/* Sponsors */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Sponsors / Godparents
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={certData['sponsors'] || ''}
                                        onChange={(e) => handleFieldChange('sponsors', e.target.value)}
                                        placeholder="e.g. Red Jenn Lee T. Gasoc and Rosemarie D. Villena"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none resize-none"
                                    />
                                </div>

                                {/* Book, Page, Line Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Book No.</label>
                                        <input
                                            type="text"
                                            value={certData['book_number'] || ''}
                                            onChange={(e) => handleFieldChange('book_number', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-center font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Page No.</label>
                                        <input
                                            type="text"
                                            value={certData['page_number'] || ''}
                                            onChange={(e) => handleFieldChange('page_number', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-center font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Line/Entry</label>
                                        <input
                                            type="text"
                                            value={certData['line_number'] || ''}
                                            onChange={(e) => handleFieldChange('line_number', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-center font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Parish Clerk */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Parish Clerk</label>
                                    <input
                                        type="text"
                                        value={certData['clerk_name'] || ''}
                                        onChange={(e) => handleFieldChange('clerk_name', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>

                                {/* Parish Priest */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Parish Priest</label>
                                    <input
                                        type="text"
                                        value={certData['priest_name'] || ''}
                                        onChange={(e) => handleFieldChange('priest_name', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                    />
                                </div>

                                {/* Date Issued & Purpose */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Date Issued</label>
                                        <input
                                            type="text"
                                            value={certData['issue_date'] || ''}
                                            onChange={(e) => handleFieldChange('issue_date', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Purpose</label>
                                        <input
                                            type="text"
                                            value={certData['purpose'] || ''}
                                            onChange={(e) => handleFieldChange('purpose', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ── Right Column: Carbone Native PDF Viewer ── */}
                    <div className="lg:col-span-8 flex flex-col items-center print:col-span-12 print:w-full">
                        {/* Status bar */}
                        <div className="w-full bg-white border border-slate-200 rounded-t-2xl px-5 py-3 flex items-center justify-between print:hidden shadow-xs">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 leading-none">
                                    Carbone PDF Preview
                                </h2>
                                <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                                    High-fidelity in-browser PDF • Watermark & signatures preserved
                                </span>
                            </div>
                            {isRendering && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-pulse">
                                    Rendering PDF via Carbone...
                                </span>
                            )}
                        </div>

                        {/* Viewer Stage */}
                        <div className="w-full bg-slate-100 border-x border-b border-slate-200 rounded-b-2xl p-4 sm:p-6 flex flex-col items-center min-h-[820px] relative print:bg-white print:border-none print:p-0">
                            {renderError ? (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md my-auto">
                                    <p className="text-sm font-bold text-red-900 mb-1">Preview Generation Failed</p>
                                    <p className="text-xs text-red-600 mb-4">{renderError}</p>
                                    <button
                                        type="button"
                                        onClick={loadPdfPreview}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : pdfUrl ? (
                                <object
                                    data={`${pdfUrl}#toolbar=1&navpanes=0`}
                                    type="application/pdf"
                                    className="w-full h-[880px] bg-white rounded-xl border border-slate-300 shadow-xl print:h-screen print:border-none"
                                >
                                    <iframe
                                        ref={iframeRef}
                                        src={`${pdfUrl}#toolbar=1&navpanes=0`}
                                        className="w-full h-full rounded-xl border-none"
                                        title="Certificate PDF Preview"
                                    />
                                </object>
                            ) : (
                                <div className="w-full h-[600px] border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 my-auto">
                                    <span className="text-sm font-semibold">Generating document preview...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Strict Print-Only CSS ── */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    header, aside, nav, footer, .print\\:hidden {
                        display: none !important;
                    }
                    #certificate-print-canvas {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        min-height: 100vh !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 2.5rem !important;
                        background: #ffffff !important;
                    }
                    @page {
                        size: portrait;
                        margin: 0.5in;
                    }
                }
            `}</style>
        </PortalLayout>
    );
}
