import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { SacramentalRecord, Clergy } from '@/types';
import {
    BookOpen,
    Edit3,
    Printer,
    Sparkles,
    Flame,
    Search,
    Filter,
} from 'lucide-react';
import ChurchLedgerBookModal from './ChurchLedgerBookModal';

interface Props {
    records: SacramentalRecord[];
    clergy: Clergy[];
    activeSacrament: 'baptism' | 'confirmation';
    onSacramentChange: (sacrament: 'baptism' | 'confirmation') => void;
}

export default function ChurchLedgerBookView({
    records,
    clergy,
    activeSacrament,
    onSacramentChange,
}: Props) {
    const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<SacramentalRecord | null>(null);
    const [bookFilter, setBookFilter] = useState<string>('');
    const [pageFilter, setPageFilter] = useState<string>('');
    const [searchFilter, setSearchFilter] = useState<string>('');

    // Filter records for the currently active sacrament book
    const filteredRecords = records.filter((r) => {
        if (r.sacrament_type !== activeSacrament) return false;

        if (bookFilter && String(r.book_number) !== bookFilter) return false;
        if (pageFilter && String(r.page_number) !== pageFilter) return false;

        if (searchFilter) {
            const q = searchFilter.toLowerCase();
            const fullName = r.person?.full_name?.toLowerCase() || '';
            const citation = r.citation?.toLowerCase() || '';
            const bookDataStr = JSON.stringify(r.book_data || {}).toLowerCase();
            if (!fullName.includes(q) && !citation.includes(q) && !bookDataStr.includes(q)) {
                return false;
            }
        }

        return true;
    });

    const isBaptism = activeSacrament === 'baptism';

    // Unique books for fast dropdown filtering
    const availableBooks = Array.from(
        new Set(records.filter((r) => r.sacrament_type === activeSacrament).map((r) => r.book_number))
    ).sort((a, b) => a - b);

    return (
        <div className="space-y-6">
            {/* ── Sub-Navigation: Ledger Tabs & Book Selectors ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Tabs for Book of Baptisms vs Book of Confirmations */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => onSacramentChange('baptism')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                                isBaptism
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Book of Baptisms (Libro de Bautismos)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onSacramentChange('confirmation')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                                !isBaptism
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                        >
                            <Flame className="w-4 h-4" />
                            <span>Book of Confirmations (Libro de Confirmaciones)</span>
                        </button>
                    </div>

                    {/* Book & Page Filter Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Book:
                            </label>
                            <select
                                value={bookFilter}
                                onChange={(e) => setBookFilter(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                            >
                                <option value="">All Books</option>
                                {availableBooks.map((b) => (
                                    <option key={b} value={b}>
                                        Book {b}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Page:
                            </label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Page #"
                                value={pageFilter}
                                onChange={(e) => setPageFilter(e.target.value)}
                                className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                            />
                        </div>

                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search ledger entries..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 w-44 sm:w-56"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Parish Book Header Banner (Clean RCAL Style) ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg tracking-tight">
                            <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
                            <span>
                                {isBaptism
                                    ? 'ST. JOSEPH THE WORKER PARISH — BOOK OF BAPTISMS (LIBRO DE BAUTISMOS)'
                                    : 'ST. JOSEPH THE WORKER PARISH — BOOK OF CONFIRMATIONS (LIBRO DE CONFIRMACIONES)'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Official canonical format recorded according to the physical parish registers • Canon 535 §1
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                            {filteredRecords.length} {filteredRecords.length === 1 ? 'Entry Recorded' : 'Entries Recorded'}
                        </span>

                        <Link
                            href={`/certificate-templates/preview?sacrament_type=${activeSacrament}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Certificate Generator</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Physical Church Ledger Table ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                        {/* ── Table Header with Exact Columns Specified by User ── */}
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-2xs uppercase tracking-wider">
                            {isBaptism ? (
                                <tr>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-12">
                                        No.
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Baptismi (Annus)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Baptismi (Mensis et Dies)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[170px] font-bold text-slate-900">
                                        Baptizatorum
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Nativitatis (Annus)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Nativitatis (Mensis et Dies)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center">
                                        Nativitatis (Legitimitas)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">
                                        Nativitatis (Locus)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[180px]">
                                        Parentum (Nomina et cognomina)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 min-w-[130px]">
                                        Parentum (Originis locus)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">
                                        Parentum (Habitationis locus)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[180px]">
                                        Patrinorum (Nomina et cognomina)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">
                                        Patrinorum (Habitationis locus)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-right w-20">
                                        Stipendium (Pesos)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-16">
                                        Stipendium (Cts.)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[160px]">
                                        Nomen Ministri
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[140px]">
                                        Observanda
                                    </th>
                                    <th className="px-4 py-3 text-center w-28 sticky right-0 bg-slate-50 border-l border-slate-200 font-bold">
                                        Action
                                    </th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-12">
                                        No.
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Confirmationis (Annus)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200">
                                        Confirmationis (Mensis et Dies)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[170px] font-bold text-slate-900">
                                        Confirmatorum
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-16">
                                        Aetas
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[160px]">
                                        Locus Originis (Parochia)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 min-w-[130px]">
                                        Locus Originis (Provincia)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">
                                        Locus Baptismi
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[180px]">
                                        Parentum
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[180px]">
                                        Patrinorum
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-right w-20">
                                        Stipendium (Pesos)
                                    </th>
                                    <th className="px-3 py-3 border-r border-slate-200 text-center w-16">
                                        Stipendium (Cts.)
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[160px]">
                                        Nomen Ministri
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-200 min-w-[140px]">
                                        Observanda
                                    </th>
                                    <th className="px-4 py-3 text-center w-28 sticky right-0 bg-slate-50 border-l border-slate-200 font-bold">
                                        Action
                                    </th>
                                </tr>
                            )}
                        </thead>

                        {/* ── Table Body ── */}
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isBaptism ? 18 : 15}
                                        className="px-6 py-12 text-center text-slate-500 space-y-2"
                                    >
                                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                                        <p className="font-semibold text-slate-700 text-sm">
                                            No canonical records match the current filter criteria in this book.
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Try adjusting the search query or book/page filter.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((rec) => {
                                    const bd = (rec.book_data as Record<string, any>) || {};
                                    const person = rec.person;

                                    if (isBaptism) {
                                        const lineNo = bd.no || rec.entry_number;
                                        const bAnnus = bd.baptismi_annus || (rec.event_date ? rec.event_date.split('-')[0] : '');
                                        const bMensisDies = bd.baptismi_mensis_et_dies || rec.event_date || '—';
                                        const childName = bd.baptizatorum_nomina_et_cognomina || person?.full_name || 'N/A';
                                        const nAnnus = bd.nativitatis_annus || (person?.date_of_birth ? person.date_of_birth.split('-')[0] : '');
                                        const nMensisDies = bd.nativitatis_mensis_et_dies || person?.date_of_birth || '—';
                                        const nLegitimitas = bd.nativitatis_legitimitas || rec.legitimacy || 'LEG.';
                                        const nLocus = bd.nativitatis_locus || person?.place_of_birth || rec.place_of_event || '—';
                                        const parentsName = bd.parentum_nomina_et_cognomina || [person?.father_name, person?.mother_name].filter(Boolean).join(' / ') || '—';
                                        const parentsOrigin = bd.parentum_originis_locus || '—';
                                        const parentsResidence = bd.parentum_habitationis_locus || '—';
                                        const godparentsName = bd.patrinorum_nomina_et_cognomina || rec.godparents || '—';
                                        const godparentsResidence = bd.patrinorum_habitationis_locus || '—';
                                        const stipendPesos = bd.stipendium_pesos ?? '0';
                                        const stipendCts = bd.stipendium_cts ?? '00';
                                        const ministerName = bd.nomen_ministri || rec.performed_by_clergy?.titled_name || '—';
                                        const observanda = bd.observanda || rec.register_notes || '—';

                                        return (
                                            <tr key={rec.id} className="hover:bg-amber-50/20 transition-colors group">
                                                {/* No. */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center font-mono font-bold text-slate-900">
                                                    {lineNo}
                                                </td>

                                                {/* Baptismi (Annus) */}
                                                <td className="px-3 py-3 border-r border-slate-100 font-mono text-slate-700">
                                                    {bAnnus}
                                                </td>

                                                {/* Baptismi (Mensis et Dies) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-slate-700">
                                                    {bMensisDies}
                                                </td>

                                                {/* Baptizatorum */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                                                    {childName}
                                                </td>

                                                {/* Nativitatis (Annus) */}
                                                <td className="px-3 py-3 border-r border-slate-100 font-mono text-slate-700">
                                                    {nAnnus}
                                                </td>

                                                {/* Nativitatis (Mensis et Dies) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-slate-700">
                                                    {nMensisDies}
                                                </td>

                                                {/* Nativitatis (Legitimitas) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-3xs font-extrabold uppercase ${
                                                        nLegitimitas.includes('LEG')
                                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    }`}>
                                                        {nLegitimitas}
                                                    </span>
                                                </td>

                                                {/* Nativitatis (Locus) */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-700 truncate max-w-[160px]" title={nLocus}>
                                                    {nLocus}
                                                </td>

                                                {/* Parentum (Nomina et cognomina) */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">
                                                    {parentsName}
                                                </td>

                                                {/* Parentum (Originis locus) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-slate-600 truncate max-w-[130px]" title={parentsOrigin}>
                                                    {parentsOrigin}
                                                </td>

                                                {/* Parentum (Habitationis locus) */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-600 truncate max-w-[150px]" title={parentsResidence}>
                                                    {parentsResidence}
                                                </td>

                                                {/* Patrinorum (Nomina et cognomina) */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">
                                                    {godparentsName}
                                                </td>

                                                {/* Patrinorum (Habitationis locus) */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-600 truncate max-w-[150px]" title={godparentsResidence}>
                                                    {godparentsResidence}
                                                </td>

                                                {/* Stipendium (Pesos) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-right font-mono text-slate-700">
                                                    ₱{stipendPesos}
                                                </td>

                                                {/* Stipendium (Cts.) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center font-mono text-slate-500">
                                                    .{stipendCts}
                                                </td>

                                                {/* Nomen Ministri */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-800">
                                                    {ministerName}
                                                </td>

                                                {/* Observanda */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-2xs text-slate-500 italic truncate max-w-[140px]" title={observanda}>
                                                    {observanda}
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 text-center whitespace-nowrap space-x-1.5 sticky right-0 bg-white group-hover:bg-amber-50/20 border-l border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRecordForEdit(rec)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-2xs cursor-pointer"
                                                        title="Record to Book / Edit Coordinates"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        <span>Record</span>
                                                    </button>

                                                    <Link
                                                        href={`/certificate-templates/preview?sacrament_type=baptism&record_id=${rec.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                                                        title="Generate Baptismal Certificate"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        // Confirmation Row
                                        const lineNo = bd.no || rec.entry_number;
                                        const cAnnus = bd.annus || (rec.event_date ? rec.event_date.split('-')[0] : '');
                                        const cMensisDies = bd.mensis_et_dies || rec.event_date || '—';
                                        const confirmandName = bd.confirmatorum || person?.full_name || 'N/A';
                                        const aetasStr = bd.aetas ? `${bd.aetas} yrs` : '—';
                                        const parochia = bd.parochia || '—';
                                        const provincia = bd.provincia || '—';
                                        const locusBaptismi = bd.locus_baptismi || '—';
                                        const parentsName = bd.parentum || [person?.father_name, person?.mother_name].filter(Boolean).join(' / ') || '—';
                                        const sponsorsName = bd.patrinorum || rec.godparents || '—';
                                        const stipendPesos = bd.stipendium_pesos ?? '0';
                                        const stipendCts = bd.stipendium_cts ?? '00';
                                        const ministerName = bd.nomen_ministri || rec.performed_by_clergy?.titled_name || '—';
                                        const observanda = bd.observanda || rec.register_notes || '—';

                                        return (
                                            <tr key={rec.id} className="hover:bg-amber-50/20 transition-colors group">
                                                {/* No. */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center font-mono font-bold text-slate-900">
                                                    {lineNo}
                                                </td>

                                                {/* Confirmationis (Annus) */}
                                                <td className="px-3 py-3 border-r border-slate-100 font-mono text-slate-700">
                                                    {cAnnus}
                                                </td>

                                                {/* Confirmationis (Mensis et Dies) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-slate-700">
                                                    {cMensisDies}
                                                </td>

                                                {/* Confirmatorum */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                                                    {confirmandName}
                                                </td>

                                                {/* Aetas */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center font-mono text-slate-700">
                                                    {aetasStr}
                                                </td>

                                                {/* Locus Originis (Parochia) */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-700 truncate max-w-[160px]" title={parochia}>
                                                    {parochia}
                                                </td>

                                                {/* Locus Originis (Provincia) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-slate-700 truncate max-w-[130px]" title={provincia}>
                                                    {provincia}
                                                </td>

                                                {/* Locus Baptismi */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-700 truncate max-w-[150px]" title={locusBaptismi}>
                                                    {locusBaptismi}
                                                </td>

                                                {/* Parentum */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">
                                                    {parentsName}
                                                </td>

                                                {/* Patrinorum */}
                                                <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">
                                                    {sponsorsName}
                                                </td>

                                                {/* Stipendium (Pesos) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-right font-mono text-slate-700">
                                                    ₱{stipendPesos}
                                                </td>

                                                {/* Stipendium (Cts.) */}
                                                <td className="px-3 py-3 border-r border-slate-100 text-center font-mono text-slate-500">
                                                    .{stipendCts}
                                                </td>

                                                {/* Nomen Ministri */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-slate-800">
                                                    {ministerName}
                                                </td>

                                                {/* Observanda */}
                                                <td className="px-4 py-3 border-r border-slate-100 text-2xs text-slate-500 italic truncate max-w-[140px]" title={observanda}>
                                                    {observanda}
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 text-center whitespace-nowrap space-x-1.5 sticky right-0 bg-white group-hover:bg-amber-50/20 border-l border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRecordForEdit(rec)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-2xs cursor-pointer"
                                                        title="Record to Book / Edit Coordinates"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        <span>Record</span>
                                                    </button>

                                                    <Link
                                                        href={`/certificate-templates/preview?sacrament_type=confirmation&record_id=${rec.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                                                        title="Generate Confirmation Certificate"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    }
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal for Editing & Inscribing Book Coordinates & Fields ── */}
            <ChurchLedgerBookModal
                isOpen={Boolean(selectedRecordForEdit)}
                record={selectedRecordForEdit}
                clergy={clergy}
                onClose={() => setSelectedRecordForEdit(null)}
            />
        </div>
    );
}
