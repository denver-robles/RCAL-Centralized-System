import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { SacramentalRecord, Parish } from '@/types';
import { BookOpen, Search, Filter, Plus, Calendar, ShieldCheck, ChevronRight } from 'lucide-react';

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

export default function Index({ records, parishes = [], filters }: RecordsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || filters.name || '');
    const [sacramentType, setSacramentType] = useState(filters.sacrament_type || '');
    const [parishId, setParishId] = useState(filters.parish_id || '');
    const [year, setYear] = useState(filters.year || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/records',
            {
                search: searchTerm,
                sacrament_type: sacramentType,
                parish_id: parishId,
                year,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearchTerm('');
        setSacramentType('');
        setParishId('');
        setYear('');
        router.get('/records', {}, { preserveState: true, replace: true });
    };

    const safeParishes = parishes || [];

    return (
        <PortalLayout activeTab="records" title="Canonical Registers">
            <Head title="Canonical Registers — RCAL PIMS" />

            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-sm text-slate-600">
                        Inscribed baptismal, confirmation, marriage, and death folios under Code of Canon Law Can. 535.
                    </p>
                </div>
                <Link href="/records/create" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    <span>Transcribe Entry</span>
                </Link>
            </div>

            {/* Filter Bar (Crisp White) */}
            <form
                onSubmit={handleSearch}
                className="p-4 rounded-xl bg-white border border-slate-200 mb-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
            >
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, citation, spouse..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition-colors"
                    />
                </div>

                <div>
                    <select
                        value={sacramentType}
                        onChange={(e) => setSacramentType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition-colors"
                    >
                        <option value="">All Registers</option>
                        <option value="baptism">Baptism</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="marriage">Marriage</option>
                        <option value="death">Death / Burial</option>
                    </select>
                </div>

                <div>
                    <select
                        value={parishId}
                        onChange={(e) => setParishId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition-colors"
                    >
                        <option value="">All Parishes</option>
                        {safeParishes.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        type="number"
                        placeholder="Year (e.g. 1995)"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button type="submit" className="btn-primary w-full py-2 text-xs">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter</span>
                    </button>
                    {(searchTerm || sacramentType || parishId || year) && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn-cancel py-2 text-xs text-center px-3"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </form>

            {/* Records Data Table (Crisp White) */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3">Subject / Party</th>
                                <th className="px-5 py-3">Register</th>
                                <th className="px-5 py-3">Legal Citation</th>
                                <th className="px-5 py-3">Date of Event</th>
                                <th className="px-5 py-3">Originating Parish</th>
                                <th className="px-5 py-3 text-center">Annotations</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                            {!records?.data || records.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                                        No canonical records match the given filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                records.data.map((record) => (
                                    <tr
                                        key={record.id}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="px-5 py-3.5 font-medium text-slate-900">
                                            <div className="font-semibold">{record.person?.full_name || 'N/A'}</div>
                                            {record.spouse && (
                                                <div className="text-xs text-slate-500 font-normal">
                                                    Spouse: {record.spouse.full_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
                                                {record.sacrament_type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-amber-700 font-medium">
                                            {record.citation}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-600">
                                            {record.event_date}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-600">
                                            {record.originating_parish?.name || `Parish #${record.originating_parish_id}`}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {record.annotations && record.annotations.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                                    {record.annotations.length} Note{record.annotations.length > 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Link
                                                href={`/records/${record.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                                            >
                                                <span>View Folio</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {records && records.last_page > 1 && (
                    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
                        <div>
                            Showing page <span className="font-bold text-slate-900">{records.current_page}</span> of{' '}
                            <span className="font-bold text-slate-900">{records.last_page}</span> (
                            <span className="font-bold text-slate-900">{records.total}</span> records total)
                        </div>
                        <div className="flex gap-2">
                            {records.prev_page_url && (
                                <Link href={records.prev_page_url} preserveScroll preserveState className="btn-cancel py-1 px-3 text-xs">
                                    Previous
                                </Link>
                            )}
                            {records.next_page_url && (
                                <Link href={records.next_page_url} preserveScroll preserveState className="btn-cancel py-1 px-3 text-xs">
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}
