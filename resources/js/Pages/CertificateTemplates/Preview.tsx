import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, SacramentalRecord, PageProps } from '@/types';
import SearchableSacramentalRecordSelect from '@/Components/SearchableSacramentalRecordSelect';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
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
    Layers,
    FileText,
    CheckSquare,
    Square,
    Loader2,
    AlertCircle,
    X,
    Filter,
    ChevronDown,
    ChevronUp,
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
    // URL query mode (single or batch)
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialMode = urlParams?.get('mode') === 'batch' ? 'batch' : 'single';

    const [mode, setMode] = useState<'single' | 'batch'>(initialMode);
    const [sacrament, setSacrament] = useState<'baptism' | 'confirmation'>(selectedSacrament);

    // ── Single Mode State ──
    const [recordId, setRecordId] = useState<string>(selectedRecord ? String(selectedRecord) : '');
    const [certData, setCertData] = useState<Record<string, string>>(populatedData || {});
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState<boolean>(false);
    const [renderError, setRenderError] = useState<string | null>(null);

    // ── Batch Mode State ──
    const [batchRecordsList, setBatchRecordsList] = useState<SacramentalRecord[]>(records || []);
    const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
    const [batchSearch, setBatchSearch] = useState<string>('');
    const [isSearchingBatch, setIsSearchingBatch] = useState<boolean>(false);
    const [batchPdfUrl, setBatchPdfUrl] = useState<string | null>(null);
    const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; status: string } | null>(null);
    const [batchError, setBatchError] = useState<string | null>(null);
    const [showBatchSettings, setShowBatchSettings] = useState<boolean>(true);
    const [batchSharedOverrides, setBatchSharedOverrides] = useState<Record<string, string>>({
        priest_name: 'Rev. Fr. Dale Anthony Q. Barretto Ko',
        priest_title: 'Parish Priest',
        clerk_name: 'Elsie Balita',
        clerk_title: 'Parish Clerk',
        purpose: 'FOR REFERENCE',
        issue_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Keep a dictionary of all known records (initial + fetched via search)
    const allRecordsMap = useMemo(() => {
        const map = new Map<number, SacramentalRecord>();
        records.forEach((r) => map.set(r.id, r));
        batchRecordsList.forEach((r) => map.set(r.id, r));
        return map;
    }, [records, batchRecordsList]);

    // ── Single Certificate Render ──
    const loadPdfPreview = async () => {
        if (mode !== 'single') return;

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
                        if (parsed.error) msg = parsed.error;
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
                    // Fallback
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

    useEffect(() => {
        if (mode === 'single') {
            const timer = setTimeout(() => {
                loadPdfPreview();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [sacrament, recordId, certData, mode]);

    useEffect(() => {
        setCertData(populatedData || {});
    }, [populatedData]);

    // Handle switching sacrament
    const handleSacramentChange = (newSacrament: 'baptism' | 'confirmation') => {
        setSacrament(newSacrament);
        setRecordId('');
        setSelectedBatchIds([]);
        if (batchPdfUrl) {
            URL.revokeObjectURL(batchPdfUrl);
            setBatchPdfUrl(null);
        }
        router.get(
            '/certificate-templates/preview',
            { sacrament_type: newSacrament, mode },
            { preserveState: false }
        );
    };

    // Handle single record auto-populate change
    const handleRecordChange = (newRecordId: string) => {
        setRecordId(newRecordId);
        router.get(
            '/certificate-templates/preview',
            {
                sacrament_type: sacrament,
                record_id: newRecordId || undefined,
                mode: 'single',
            },
            { preserveState: false }
        );
    };

    // Handle single field input updates
    const handleFieldChange = (key: string, value: string) => {
        setCertData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // ── Batch Mode: Search records across database ──
    useEffect(() => {
        const q = batchSearch.trim();
        if (!q) {
            setBatchRecordsList(records);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingBatch(true);
            try {
                const response = await axios.get('/certificate-templates/search-records', {
                    params: {
                        sacrament_type: sacrament,
                        q,
                    },
                });
                if (response.data && Array.isArray(response.data.records)) {
                    setBatchRecordsList(response.data.records);
                }
            } catch (err) {
                console.error('Failed to search records:', err);
            } finally {
                setIsSearchingBatch(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [batchSearch, sacrament, records]);

    // Filtered batch records list
    const filteredBatchRecords = useMemo(() => {
        const q = batchSearch.toLowerCase().trim();
        if (!q) return batchRecordsList;

        return batchRecordsList.filter((r) => {
            const name = r.person?.full_name?.toLowerCase() || '';
            const citation = r.citation?.toLowerCase() || '';
            const book = String(r.book_number || '');
            const page = String(r.page_number || '');
            const parents = (r.person?.father_name || '') + ' ' + (r.person?.mother_name || '');

            return (
                name.includes(q) ||
                citation.includes(q) ||
                book.includes(q) ||
                page.includes(q) ||
                parents.toLowerCase().includes(q)
            );
        });
    }, [batchRecordsList, batchSearch]);

    // Batch selection toggles
    const toggleRecordSelection = (id: number) => {
        setSelectedBatchIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredBatchRecords.map((r) => r.id);
        const allSelected = filteredIds.every((id) => selectedBatchIds.includes(id));

        if (allSelected) {
            setSelectedBatchIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            setSelectedBatchIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    // ── Generate and Compile Multiple Certificates into One PDF (Option A: pdf-lib) ──
    const handleGenerateBatch = async () => {
        if (selectedBatchIds.length === 0) return;

        setIsBatchGenerating(true);
        setBatchError(null);
        setBatchProgress({
            current: 0,
            total: selectedBatchIds.length,
            status: 'Initializing PDF document compiler...',
        });

        try {
            const mergedPdf = await PDFDocument.create();
            const total = selectedBatchIds.length;

            for (let i = 0; i < total; i++) {
                const recId = selectedBatchIds[i];
                const rec = allRecordsMap.get(recId);
                const recipientName = rec?.person?.full_name || `Record #${recId}`;

                setBatchProgress({
                    current: i + 1,
                    total,
                    status: `Rendering ${i + 1} of ${total}: ${recipientName}...`,
                });

                // Request PDF binary for this certificate from Carbone
                const response = await axios.post(
                    '/certificate-templates/preview-pdf',
                    {
                        template_id: template?.id ?? null,
                        record_id: recId,
                        sacrament_type: sacrament,
                        overrides: batchSharedOverrides,
                    },
                    {
                        responseType: 'arraybuffer',
                    }
                );

                // Load and merge into compiled document
                const certPdf = await PDFDocument.load(response.data);
                const copiedPages = await mergedPdf.copyPages(certPdf, certPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            setBatchProgress({
                current: total,
                total,
                status: 'Finalizing compiled multi-page PDF...',
            });

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

            if (batchPdfUrl) {
                URL.revokeObjectURL(batchPdfUrl);
            }
            const newUrl = URL.createObjectURL(blob);
            setBatchPdfUrl(newUrl);
        } catch (err: any) {
            console.error('Failed to generate batch PDF:', err);
            let msg = 'Failed to compile batch certificate PDF.';
            if (err.response?.data) {
                try {
                    const dec = new TextDecoder().decode(err.response.data);
                    const parsed = JSON.parse(dec);
                    if (parsed.error) msg = parsed.error;
                } catch {
                    // Fallback
                }
            } else if (err.message) {
                msg = err.message;
            }
            setBatchError(msg);
        } finally {
            setIsBatchGenerating(false);
            setBatchProgress(null);
        }
    };

    const isBaptism = sacrament === 'baptism';
    const activeViewerPdfUrl = mode === 'batch' ? batchPdfUrl : pdfUrl;

    return (
        <PortalLayout activeTab="certificate_templates">
            <Head title={`Generate ${isBaptism ? 'Baptismal' : 'Confirmation'} Certificate`} />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 print:p-0">
                {/* ── Top Control & Dropdown Bar ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6 print:hidden">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Left Group: Back, Mode Selector, Sacrament Selector */}
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href="/certificate-templates"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Templates
                            </Link>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                            {/* Mode Switcher Tabs */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setMode('single')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                        mode === 'single'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                                    Single Certificate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('batch')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                        mode === 'batch'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                    Batch Generation
                                    {selectedBatchIds.length > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-2xs bg-amber-500 text-slate-950 font-extrabold">
                                            {selectedBatchIds.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                            {/* Sacrament Dropdown */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Sacrament:
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

                            {/* Single Mode: Searchable Auto-populate Picker */}
                            {mode === 'single' && (
                                <>
                                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                                    <div className="flex items-center gap-2 flex-1 min-w-[320px]">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                            Auto-Populate:
                                        </label>
                                        <div className="flex-1">
                                            <SearchableSacramentalRecordSelect
                                                records={records}
                                                value={recordId}
                                                onChange={handleRecordChange}
                                                sacramentType={sacrament}
                                                placeholder={`— Search & select a ${isBaptism ? 'Baptism' : 'Confirmation'} record —`}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right Group: Action / Download / Print Buttons */}
                        <div className="flex items-center gap-3 justify-end shrink-0">
                            {activeViewerPdfUrl && (
                                <a
                                    href={activeViewerPdfUrl}
                                    download={
                                        mode === 'batch'
                                            ? `batch_${sacrament}_certificates_${selectedBatchIds.length}records.pdf`
                                            : `${sacrament}_certificate.pdf`
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition text-sm shadow-2xs"
                                    title="Download the compiled PDF"
                                >
                                    <Download className="w-4 h-4" />
                                    {mode === 'batch' ? `Download Compiled PDF (${selectedBatchIds.length} Pages)` : 'Download PDF'}
                                </a>
                            )}

                            {activeViewerPdfUrl && (
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
                                    {mode === 'batch' ? `Print All (${selectedBatchIds.length} Pages)` : 'Print Certificate'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Main Two-Column Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ══════════════ LEFT COLUMN ══════════════ */}
                    <div className="lg:col-span-5 space-y-4 print:hidden">
                        {mode === 'single' ? (
                            /* ── Single Certificate Field Editor ── */
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-amber-500" />
                                        Manual Field Editor
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-400">
                                        Live Carbone Updates
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4">
                                    All modifications below update the high-fidelity preview canvas in real time.
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
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none uppercase font-bold text-slate-900"
                                        />
                                    </div>

                                    {/* Parents Citation */}
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
                                            Formatted Date of Birth
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

                                    {/* Event Date Formatted */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Sacrament Date Citation
                                        </label>
                                        <input
                                            type="text"
                                            value={certData['formatted_event_date'] || ''}
                                            onChange={(e) => handleFieldChange('formatted_event_date', e.target.value)}
                                            placeholder="e.g. On the 19th day of October, year of our Lord 2025"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none font-medium"
                                        />
                                    </div>

                                    {/* Minister / Officiant */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Officiating Minister
                                        </label>
                                        <input
                                            type="text"
                                            value={certData['minister_name'] || ''}
                                            onChange={(e) => handleFieldChange('minister_name', e.target.value)}
                                            placeholder="e.g. Rev. Fr. Aren Bejasa, OSJ"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                        />
                                    </div>

                                    {/* Sponsors / Godparents */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Sponsors / Godparents
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={certData['sponsors'] || ''}
                                            onChange={(e) => handleFieldChange('sponsors', e.target.value)}
                                            placeholder="e.g. Red Jenn Lee T. Gasoc and Rosemarie D. Villena"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                        />
                                    </div>

                                    {/* Canonical Book, Page, Line */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Book No.</label>
                                            <input
                                                type="text"
                                                value={certData['book_number'] || ''}
                                                onChange={(e) => handleFieldChange('book_number', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Page No.</label>
                                            <input
                                                type="text"
                                                value={certData['page_number'] || ''}
                                                onChange={(e) => handleFieldChange('page_number', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Line No.</label>
                                            <input
                                                type="text"
                                                value={certData['line_number'] || ''}
                                                onChange={(e) => handleFieldChange('line_number', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {/* Citation */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Canonical Citation String
                                        </label>
                                        <input
                                            type="text"
                                            value={certData['citation'] || ''}
                                            onChange={(e) => handleFieldChange('citation', e.target.value)}
                                            placeholder="e.g. Book 1 Page 89 Line 6"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono text-xs"
                                        />
                                    </div>

                                    {/* Priest & Clerk */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Parish Priest</label>
                                            <input
                                                type="text"
                                                value={certData['priest_name'] || ''}
                                                onChange={(e) => handleFieldChange('priest_name', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Parish Clerk</label>
                                            <input
                                                type="text"
                                                value={certData['clerk_name'] || ''}
                                                onChange={(e) => handleFieldChange('clerk_name', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                                            />
                                        </div>
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
                        ) : (
                            /* ── Batch Generation Record Selection Panel ── */
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-blue-600" />
                                                Select Records for Batch Print
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Choose {isBaptism ? 'Baptismal' : 'Confirmation'} records to compile into a single PDF document.
                                            </p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                            {selectedBatchIds.length} Selected
                                        </span>
                                    </div>

                                    {/* Search Box */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={batchSearch}
                                            onChange={(e) => setBatchSearch(e.target.value)}
                                            placeholder="Search by candidate, parents, citation..."
                                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        {isSearchingBatch ? (
                                            <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 text-blue-500 animate-spin" />
                                        ) : batchSearch ? (
                                            <button
                                                type="button"
                                                onClick={() => setBatchSearch('')}
                                                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        ) : null}
                                    </div>

                                    {/* Action Header: Select All / Clear */}
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-2xs text-slate-600 font-semibold">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllFiltered}
                                            className="hover:text-blue-600 transition flex items-center gap-1.5"
                                        >
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            {filteredBatchRecords.length > 0 &&
                                            filteredBatchRecords.every((r) => selectedBatchIds.includes(r.id))
                                                ? 'Deselect Filtered'
                                                : `Select All Filtered (${filteredBatchRecords.length})`}
                                        </button>

                                        {selectedBatchIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBatchIds([])}
                                                className="text-rose-600 hover:text-rose-800 transition"
                                            >
                                                Clear Selection
                                            </button>
                                        )}
                                    </div>

                                    {/* Scrollable Records List */}
                                    <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                                        {filteredBatchRecords.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-slate-400">
                                                No sacramental records match your filter.
                                            </div>
                                        ) : (
                                            filteredBatchRecords.map((r) => {
                                                const isChecked = selectedBatchIds.includes(r.id);
                                                const father = r.person?.father_name;
                                                const mother = r.person?.mother_name;
                                                const parents = father && mother ? `${father} & ${mother}` : father || mother || '';

                                                return (
                                                    <div
                                                        key={r.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => toggleRecordSelection(r.id)}
                                                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-start gap-3 ${
                                                            isChecked
                                                                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/20 shadow-2xs'
                                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                                        }`}
                                                    >
                                                        <div className="mt-0.5 shrink-0">
                                                            {isChecked ? (
                                                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-bold text-slate-900 text-xs truncate">
                                                                    {r.person?.full_name || `Record #${r.id}`}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                                    {r.citation || `Book ${r.book_number}, P.${r.page_number}`}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-3 text-2xs text-slate-500 mt-1">
                                                                {r.event_date && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                                        {r.event_date}
                                                                    </span>
                                                                )}
                                                                {parents && (
                                                                    <span className="truncate max-w-[180px] flex items-center gap-1">
                                                                        <User className="w-3 h-3 text-slate-400" />
                                                                        {parents}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Shared Batch Settings (Collapsible) */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowBatchSettings(!showBatchSettings)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-slate-800"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            Shared Batch Certificate Overrides
                                        </span>
                                        {showBatchSettings ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>

                                    {showBatchSettings && (
                                        <div className="space-y-3 mt-3 pt-3 border-t border-slate-100">
                                            <p className="text-2xs text-slate-500">
                                                These details apply to every certificate compiled in this batch:
                                            </p>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-2xs font-bold text-slate-600 mb-1">
                                                        Parish Priest
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={batchSharedOverrides['priest_name'] || ''}
                                                        onChange={(e) =>
                                                            setBatchSharedOverrides((prev) => ({
                                                                ...prev,
                                                                priest_name: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-2xs font-bold text-slate-600 mb-1">
                                                        Parish Clerk
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={batchSharedOverrides['clerk_name'] || ''}
                                                        onChange={(e) =>
                                                            setBatchSharedOverrides((prev) => ({
                                                                ...prev,
                                                                clerk_name: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-2xs font-bold text-slate-600 mb-1">
                                                        Issue Date
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={batchSharedOverrides['issue_date'] || ''}
                                                        onChange={(e) =>
                                                            setBatchSharedOverrides((prev) => ({
                                                                ...prev,
                                                                issue_date: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-2xs font-bold text-slate-600 mb-1">
                                                        Purpose
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={batchSharedOverrides['purpose'] || ''}
                                                        onChange={(e) =>
                                                            setBatchSharedOverrides((prev) => ({
                                                                ...prev,
                                                                purpose: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Generate & Compile Button */}
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleGenerateBatch}
                                        disabled={selectedBatchIds.length === 0 || isBatchGenerating}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition shadow-md text-sm"
                                    >
                                        {isBatchGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                                <span>Compiling Certificates...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Layers className="w-4 h-4 text-slate-950" />
                                                <span>
                                                    Generate & Compile PDF (
                                                    {selectedBatchIds.length} {selectedBatchIds.length === 1 ? 'Record' : 'Records'}
                                                    )
                                                </span>
                                            </>
                                        )}
                                    </button>

                                    {/* Progress Banner */}
                                    {isBatchGenerating && batchProgress && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                                                <span>{batchProgress.status}</span>
                                                <span>
                                                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.round(
                                                            (batchProgress.current / batchProgress.total) * 100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ══════════════ RIGHT COLUMN: PDF VIEWER ══════════════ */}
                    <div className="lg:col-span-7 flex flex-col items-center print:col-span-12 print:w-full">
                        {/* Status bar */}
                        <div className="w-full bg-white border border-slate-200 rounded-t-2xl px-5 py-3 flex items-center justify-between print:hidden shadow-xs">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 leading-none">
                                    {mode === 'batch'
                                        ? batchPdfUrl
                                            ? `Compiled Batch PDF • ${selectedBatchIds.length} Certificates (${selectedBatchIds.length} Pages)`
                                            : 'Batch Certificate Preview'
                                        : 'Carbone High-Fidelity PDF Preview'}
                                </h2>
                                <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                                    {mode === 'batch'
                                        ? 'Single combined multi-page PDF compiled via OnlyOffice & pdf-lib'
                                        : 'In-browser PDF preview rendered with OnlyOffice engine'}
                                </span>
                            </div>

                            {mode === 'single' && isRendering && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-pulse">
                                    Rendering PDF via Carbone...
                                </span>
                            )}
                        </div>

                        {/* Viewer Stage */}
                        <div className="w-full bg-slate-100 border-x border-b border-slate-200 rounded-b-2xl p-4 sm:p-6 flex flex-col items-center min-h-[820px] relative print:bg-white print:border-none print:p-0">
                            {mode === 'batch' ? (
                                batchError ? (
                                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md my-auto">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-red-900 mb-1">Batch Compilation Failed</p>
                                        <p className="text-xs text-red-600 mb-4">{batchError}</p>
                                        <button
                                            type="button"
                                            onClick={handleGenerateBatch}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : batchPdfUrl ? (
                                    <object
                                        data={`${batchPdfUrl}#toolbar=1&navpanes=0`}
                                        type="application/pdf"
                                        className="w-full h-[880px] bg-white rounded-xl border border-slate-300 shadow-xl print:h-screen print:border-none"
                                    >
                                        <iframe
                                            ref={iframeRef}
                                            src={`${batchPdfUrl}#toolbar=1&navpanes=0`}
                                            className="w-full h-full rounded-xl border-none"
                                            title="Compiled Batch Certificate PDF"
                                        />
                                    </object>
                                ) : (
                                    <div className="w-full h-[600px] border border-dashed border-slate-300 bg-white/70 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-3 my-auto p-8 text-center max-w-lg mx-auto">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                                            <Layers className="w-7 h-7" />
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-base">
                                            Batch Certificate Compiler
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                                            Select the {isBaptism ? 'Baptism' : 'Confirmation'} candidate records on the left, customize any shared details (Priest, Clerk, Issue Date), and click <strong>Generate & Compile PDF</strong>.
                                        </p>
                                        <div className="pt-2 text-2xs text-slate-400">
                                            All selected records will be processed and assembled into one continuous PDF file for instant printing and downloading.
                                        </div>
                                        {selectedBatchIds.length > 0 && (
                                            <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                                                {selectedBatchIds.length} records currently selected and ready to compile
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : renderError ? (
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
                    @page {
                        size: portrait;
                        margin: 0.5in;
                    }
                }
            `}</style>
        </PortalLayout>
    );
}
