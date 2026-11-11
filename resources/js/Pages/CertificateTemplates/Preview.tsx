import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, SacramentalRecord, PageProps } from '@/types';
import {
    Printer,
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
                            <button
                                type="button"
                                onClick={() => window.print()}
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

                    {/* ── Right Canvas Column: The Exact Certificate ── */}
                    <div className="lg:col-span-8 flex justify-center print:col-span-12 print:w-full">
                        <div
                            id="certificate-print-canvas"
                            className="w-[8.5in] min-h-[11in] bg-white text-slate-900 shadow-xl border border-slate-300 p-8 sm:p-12 relative flex flex-col justify-between font-serif selection:bg-amber-200 print:shadow-none print:border-none print:m-0 print:p-8 print:w-full print:min-h-screen"
                            style={{
                                fontFamily: "'Times New Roman', Times, Georgia, serif",
                            }}
                        >
                            {/* Watermark in background */}
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] select-none z-0"
                                style={{
                                    backgroundImage: 'url(/images/certificate/watermark.png)',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center 56%',
                                    backgroundSize: '580px auto',
                                }}
                            />

                            {/* ── Top Header Box with Double Line Border ── */}
                            <div className="relative z-10 mb-8">
                                <div
                                    className={`border-[3px] ${borderColorClass} p-3 rounded-xs flex items-center justify-between gap-4`}
                                    style={{
                                        boxShadow: '0 0 0 2px #ffffff, 0 0 0 3px ' + (isBaptism ? '#2d8a4e' : '#d4a017'),
                                    }}
                                >
                                    {/* Left Parish Seal */}
                                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/images/certificate/seal_parish.jpg"
                                            alt="Parish Seal"
                                            className="w-18 h-18 object-contain rounded-full shadow-xs"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>

                                    {/* Center Header Details */}
                                    <div className="text-center flex-1">
                                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-serif leading-tight">
                                            {certData['parish_name'] || 'St. Joseph the Worker Parish'}
                                        </h1>
                                        <p className="text-xs sm:text-sm font-semibold text-slate-800 tracking-wide mt-0.5">
                                            Archdiocese of Lipa
                                        </p>
                                        <p className="text-xs text-slate-700">
                                            {certData['parish_address'] || 'Inosluban Lipa City Batangas'}
                                        </p>
                                        <p className="text-[11px] text-slate-700 mt-0.5">
                                            Gmail: {certData['parish_email'] || 'stjosephtheworker.rcal@gmail.com'}
                                        </p>
                                        <p className="text-[11px] text-slate-700">
                                            Contact Nos. {certData['parish_contact'] || '(043)-321-9447/ 0975-897-8022'}
                                        </p>
                                    </div>

                                    {/* Right Diocesan Coat of Arms */}
                                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/images/certificate/seal_diocese.png"
                                            alt="Diocese Coat of Arms"
                                            className="w-18 h-18 object-contain rounded-full shadow-xs"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Certificate Body Content ── */}
                            <div className="relative z-10 text-center space-y-4 my-auto px-4 sm:px-8">
                                {/* Certificate Title */}
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-[0.18em] text-slate-950 uppercase font-serif">
                                        {isBaptism ? 'CERTIFICATE OF BAPTISM' : 'CERTIFICATE OF CONFIRMATION'}
                                    </h2>
                                    <p className="text-xs sm:text-sm italic text-slate-700 tracking-[0.25em] font-serif uppercase mt-1">
                                        THIS IS TO CERTIFY
                                    </p>
                                </div>

                                {/* Recipient Name (Red bold with underline) */}
                                <div className="py-2">
                                    <span
                                        className="text-2xl sm:text-3xl font-black text-[#c02626] font-serif tracking-wider uppercase inline-block pb-1"
                                        style={{
                                            borderBottom: '3px solid #c02626',
                                        }}
                                    >
                                        {certData['recipient_name'] || (isBaptism ? 'WESLYNN PIERRE P. ARQUINES' : 'JAMAICA J. ROGANDO')}
                                    </span>
                                </div>

                                {/* Parents */}
                                <div>
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        {certData['parents'] || 'Child of Parents'}
                                    </p>
                                </div>

                                {/* Birth info */}
                                <div className="space-y-0.5">
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        {certData['formatted_birth_date'] || 'Born on the 21st day of October 2024'}
                                    </p>
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        {certData['place_of_birth'] || 'In Lipa City, Batangas'}
                                    </p>
                                </div>

                                {/* Has Received */}
                                <div className="pt-2">
                                    <p className="text-sm sm:text-base italic text-slate-800 font-serif">
                                        Has Received the
                                    </p>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 font-serif mt-1">
                                        {isBaptism ? 'Holy Sacrament of Baptism' : 'Holy Sacrament of Confirmation'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-800 font-serif mt-1">
                                        According to the Rite of the Roman Catholic Church
                                    </p>
                                </div>

                                {/* Event Date & Minister */}
                                <div className="space-y-1 pt-1">
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        {certData['formatted_event_date'] || 'On the 19th day of October, year of our Lord 2025'}
                                    </p>
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        By the <span className="font-bold">{certData['minister_name'] || 'Rev. Fr. Aren Bejasa, OSJ'}</span>
                                    </p>
                                    <p className="text-sm sm:text-base text-slate-900 font-serif">
                                        At <span className="font-semibold">{certData['parish_name'] || 'St. Joseph the Worker Parish'}</span>
                                    </p>
                                </div>

                                {/* Sponsors */}
                                <div className="pt-2">
                                    <p className="text-sm italic text-slate-800 font-serif">
                                        The Sponsor being are
                                    </p>
                                    <p className="text-sm sm:text-base font-bold text-slate-950 font-serif mt-0.5">
                                        {certData['sponsors'] || 'Red Jenn Lee T. Gasoc and Rosemarie D. Villena'}
                                    </p>
                                </div>

                                {/* Book, Page, Line Citation */}
                                <div className="pt-2 text-xs sm:text-sm text-slate-800 font-serif">
                                    <p>
                                        As manifested on The {isBaptism ? 'Baptismal' : 'Confirmation'} Book of this Church,
                                    </p>
                                    <p className="mt-0.5 font-semibold">
                                        Book <span className="font-bold underline">{certData['book_number'] || '1'}</span>{' '}
                                        Page <span className="font-bold underline">{certData['page_number'] || (isBaptism ? '89' : '50')}</span>{' '}
                                        Line <span className="font-bold underline">{certData['line_number'] || (isBaptism ? '6' : '7')}</span>
                                    </p>
                                </div>
                            </div>

                            {/* ── Signatories & Seals Row ── */}
                            <div className="relative z-10 pt-8 mt-4">
                                <div className="grid grid-cols-2 gap-8 items-end mb-8 px-4">
                                    {/* Left Signatory: Parish Clerk */}
                                    <div className="text-center">
                                        <div className="h-10 flex items-center justify-center" />
                                        <p className="font-bold text-sm text-slate-950 border-t border-slate-900 pt-1 inline-block min-w-[180px]">
                                            {certData['clerk_name'] || 'Elsie E. Balita'}
                                        </p>
                                        <p className="text-xs text-slate-700 block">Parish Clerk</p>
                                    </div>

                                    {/* Right Signatory: Parish Priest with Signature Image */}
                                    <div className="text-center">
                                        <div className="h-10 flex items-center justify-center -mb-2">
                                            <img
                                                src="/images/certificate/signature.png"
                                                alt="Priest Signature"
                                                className="h-12 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <p className="font-bold text-sm text-slate-950 border-t border-slate-900 pt-1 inline-block min-w-[220px]">
                                            {certData['priest_name'] || 'Rev. Fr. Dale Anthony Q. Barretto Ko'}
                                        </p>
                                        <p className="text-xs text-slate-700 block">Parish Priest</p>
                                    </div>
                                </div>

                                {/* Bottom Metadata & Green Rosette Parish Seal */}
                                <div className="flex items-end justify-between px-2 pt-2 border-t border-slate-200">
                                    {/* Date & Purpose */}
                                    <div className="text-xs text-slate-800 space-y-0.5">
                                        <p>
                                            <span className="font-semibold">Date Issued:</span> {certData['issue_date'] || 'November 5, 2026'}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Purpose:</span>{' '}
                                            <span className="font-bold">{certData['purpose'] || 'FOR REFERENCE'}</span>
                                        </p>
                                    </div>

                                    {/* Green Rosette Parish Seal Graphic */}
                                    <div className="relative flex flex-col items-center">
                                        <svg
                                            className="w-20 h-20 text-emerald-500"
                                            viewBox="0 0 100 100"
                                            fill="currentColor"
                                        >
                                            <polygon points="50,0 59,10 72,5 77,18 90,18 90,32 100,38 95,50 100,62 90,68 90,82 77,82 72,95 59,90 50,100 41,90 28,95 23,82 10,82 10,68 0,62 5,50 0,38 10,32 10,18 23,18 28,5 41,10" />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider text-center px-2">
                                            Parish<br />Seal
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Warning Note */}
                                <div className="mt-4 text-[10px] text-slate-600 text-center font-sans tracking-wide">
                                    <strong>Note:</strong> Any erasure or alteration and/or without the Parish Seal will invalidate this document.
                                </div>
                            </div>
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
