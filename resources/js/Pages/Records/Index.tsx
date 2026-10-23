import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { SacramentalRecord, Parish } from '@/types';
import {
    BookOpen,
    Search,
    Filter,
    Plus,
    Calendar,
    ShieldCheck,
    ChevronRight,
    Sparkles,
    Flame,
    Heart,
    Church,
    User,
    ArrowRight,
    X,
    FileText,
} from 'lucide-react';

interface PaginatedRecords {
    data: SacramentalRecord[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface RecordsIndexProps {
    records: PaginatedRecords;
    parishes?: Parish[];
    filters: {
        search?: string;
        name?: string;
        sacrament_type?: string;
        parish_id?: string;
        year?: string;
    };
}

const SACRAMENT_CONFIG = {
    baptism: {
        label: 'Baptism',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
        accentBar: 'bg-sky-500',
        icon: Sparkles,
    },
    confirmation: {
        label: 'Confirmation',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        accentBar: 'bg-emerald-500',
        icon: Flame,
    },
    marriage: {
        label: 'Holy Matrimony',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
        accentBar: 'bg-rose-500',
        icon: Heart,
    },
    death: {
        label: 'Death / Burial',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        accentBar: 'bg-slate-500',
        icon: ShieldCheck,
    },
};

export default function Index({ records, parishes = [], filters }: RecordsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || filters.name || '');
    const [sacramentType, setSacramentType] = useState(filters.sacrament_type || '');
    const [parishId, setParishId] = useState(filters.parish_id || '');
    const [year, setYear] = useState(filters.year || '');
    const [showAdvanced, setShowAdvanced] = useState(Boolean(parishId || year));

    const executeSearch = (overrideType?: string) => {
        const typeToUse = overrideType !== undefined ? overrideType : sacramentType;
        router.get(
            '/records',
            {
                search: searchTerm,
                sacrament_type: typeToUse,
                parish_id: parishId,
                year,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSearch();
    };

    const handleSacramentSelect = (type: string) => {
        setSacramentType(type);
        executeSearch(type);
    };

    const handleReset = () => {
        setSearchTerm('');
        setSacramentType('');
        setParishId('');
        setYear('');
        setShowAdvanced(false);
        router.get('/records', {}, { preserveState: true, replace: true });
    };

    const safeParishes = parishes || [];

    return (
        <PortalLayout activeTab="records" title="Canonical Registers">
            <Head title="Canonical Registers — RCAL PIMS" />

            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                        Parish Canonical Registers
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                        High-capacity archival ledger of sacramental folios protected under Code of Canon Law Can. 535 immutability.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs text-slate-500 font-mono font-medium hidden sm:inline-block">
                        Total Inscriptions: <strong className="text-slate-900">{records.total}</strong>
                    </span>

                    <Link href="/records/create" className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
                        <Plus className="w-4 h-4" />
                        <span>Transcribe Entry</span>
                    </Link>
                </div>
            </div>

            {/* Smart Search & Quick Sacrament Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-xs space-y-4">
                {/* Search Bar Row */}
                <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by subject name, spouse, book/page citation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    router.get(
                                        '/records',
                                        { sacrament_type: sacramentType, parish_id: parishId, year },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button type="submit" className="btn-primary py-2.5 px-5 text-sm flex items-center gap-1.5 cursor-pointer">
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`px-3.5 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                showAdvanced || parishId || year
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {(parishId || year) && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                            )}
                        </button>

                        {(searchTerm || sacramentType || parishId || year) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium transition cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>

                {/* Collapsible Advanced Filters */}
                {showAdvanced && (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Originating Parish Jurisdiction
                            </label>
                            <select
                                value={parishId}
                                onChange={(e) => {
                                    setParishId(e.target.value);
                                    router.get(
                                        '/records',
                                        { search: searchTerm, sacrament_type: sacramentType, parish_id: e.target.value, year },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                                <option value="">All Parishes (Archdiocese-Wide)</option>
                                {safeParishes.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.city_municipality ? `(${p.city_municipality})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Event Year
                            </label>
                            <input
                                type="number"
                                placeholder="Filter by sacrament year (e.g. 2024)"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                onBlur={() => executeSearch()}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                )}

                {/* Quick 1-Click Sacrament Filter Pills */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0 mr-1">
                        Registers:
                    </span>

                    <button
                        type="button"
                        onClick={() => handleSacramentSelect('')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer shrink-0 ${
                            sacramentType === ''
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        All Folios ({records.total})
                    </button>

                    {(['baptism', 'confirmation', 'marriage', 'death'] as const).map((type) => {
                        const cfg = SACRAMENT_CONFIG[type];
                        const Icon = cfg.icon;
                        const isSelected = sacramentType === type;
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleSacramentSelect(isSelected ? '' : type)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                    isSelected
                                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{cfg.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* High-Capacity Archival Data Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/90 border-b border-slate-200 text-2xs uppercase tracking-wider font-bold text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">Subject &amp; Family Lineage</th>
                                <th className="px-4 py-3.5">Register</th>
                                <th className="px-4 py-3.5">Canon 535 Citation</th>
                                <th className="px-4 py-3.5">Event Date</th>
                                <th className="px-4 py-3.5">Originating Parish</th>
                                <th className="px-3 py-3.5 text-center">Annotations</th>
                                <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                            {!records?.data || records.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500 space-y-2">
                                        <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                                        <p className="font-semibold text-slate-700 text-sm">
                                            No canonical records match the current filter criteria.
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Try modifying your search term, parish jurisdiction, or sacrament type.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                records.data.map((record) => {
                                    const personName =
                                        record.person?.full_name ||
                                        [record.person?.first_name, record.person?.middle_name, record.person?.last_name, record.person?.suffix]
                                            .filter(Boolean)
                                            .join(' ') ||
                                        'N/A';
                                    const citation =
                                        record.citation ||
                                        `Book ${record.book_number}, Page ${record.page_number}, Entry ${record.entry_number}`;

                                    const cfg = SACRAMENT_CONFIG[record.sacrament_type as keyof typeof SACRAMENT_CONFIG] || {
                                        label: record.sacrament_type,
                                        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
                                        accentBar: 'bg-slate-400',
                                        icon: BookOpen,
                                    };

                                    return (
                                        <tr key={record.id} className="hover:bg-amber-50/20 transition-colors group">
                                            <td className="px-5 py-3">
                                                <div className="font-serif font-bold text-slate-900 text-sm group-hover:text-amber-800 transition">
                                                    {personName}
                                                </div>
                                                {record.spouse ? (
                                                    <div className="text-2xs text-rose-700 font-medium mt-0.5 flex items-center gap-1">
                                                        <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                                                        <span>
                                                            Spouse: {record.spouse.full_name || `${record.spouse.first_name} ${record.spouse.last_name}`}
                                                        </span>
                                                    </div>
                                                ) : record.person?.date_of_birth ? (
                                                    <div className="text-2xs text-slate-500 mt-0.5">
                                                        Born {record.person.date_of_birth} {record.person.sex ? `• ${record.person.sex}` : ''}
                                                    </div>
                                                ) : null}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block capitalize px-2.5 py-0.5 rounded-full text-2xs font-bold border ${cfg.badgeClass}`}
                                                >
                                                    {cfg.label}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50/80 text-amber-900 border border-amber-200/70 inline-block">
                                                    {citation}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                                                {record.event_date}
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-700 max-w-[200px] truncate" title={record.originating_parish?.name}>
                                                {record.originating_parish?.name || `Parish #${record.originating_parish_id}`}
                                            </td>

                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                {record.annotations && record.annotations.length > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                        {record.annotations.length} Note{record.annotations.length > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-2xs text-slate-400">—</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/records/${record.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-800 text-xs font-bold border border-slate-200 hover:border-amber-400 transition shadow-2xs group-hover:bg-amber-400 group-hover:text-slate-950"
                                                >
                                                    <span>View Folio</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
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

            {/* Pagination Controls */}
            {records && records.last_page > 1 && (
                <div className="mt-6 px-5 py-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-700 shadow-2xs">
                    <div>
                        Showing page <span className="font-bold text-slate-900">{records.current_page}</span> of{' '}
                        <span className="font-bold text-slate-900">{records.last_page}</span> (
                        <span className="font-bold text-slate-900">{records.total}</span> records total)
                    </div>
                    <div className="flex gap-2">
                        {records.prev_page_url && (
                            <Link href={records.prev_page_url} preserveScroll preserveState className="btn-cancel py-2 px-4 text-sm font-semibold">
                                ← Previous
                            </Link>
                        )}
                        {records.next_page_url && (
                            <Link href={records.next_page_url} preserveScroll preserveState className="btn-cancel py-2 px-4 text-sm font-semibold">
                                Next →
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
