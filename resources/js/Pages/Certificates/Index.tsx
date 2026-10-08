import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { CertificateRequest, DocumentRequest, PageProps, SacramentalRecord } from '@/types';
import { Award, FileText, CheckCircle2, Clock, AlertCircle, Search, Filter, X, Link as LinkIcon } from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props extends PageProps {
    certificateRequests: PaginatedData<CertificateRequest>;
    documentRequests: PaginatedData<DocumentRequest>;
    availableRecords?: SacramentalRecord[];
    filters: {
        tab: string;
        status: string;
        search: string;
    };
    stats: {
        open: number;
        issued: number;
        pending: number;
        rejected: number;
        total: number;
        cert_total: number;
        doc_total: number;
    };
}

export default function Index({ certificateRequests, documentRequests, availableRecords = [], filters, stats }: Props) {
    const [currentTab, setCurrentTab] = useState<'all' | 'internal' | 'parishioner'>(
        (filters.tab as any) || 'all'
    );
    const [matchModalDoc, setMatchModalDoc] = useState<DocumentRequest | null>(null);
    const [selectedRecordId, setSelectedRecordId] = useState<string>('');
    const [recordSearch, setRecordSearch] = useState<string>('');
    const [isMatching, setIsMatching] = useState(false);

    const handleFilter = (updates: Partial<typeof filters>) => {
        router.get('/certificates', { ...filters, tab: currentTab, ...updates }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleMatchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!matchModalDoc || !selectedRecordId) return;

        setIsMatching(true);
        router.post('/certificates/match-claim', {
            document_request_id: matchModalDoc.id,
            record_id: parseInt(selectedRecordId),
        }, {
            onFinish: () => {
                setIsMatching(false);
                setMatchModalDoc(null);
            },
        });
    };

    return (
        <PortalLayout
            title="Certificate Orders & Document Claims"
            subtitle="Processing queue for canonical certificates, public claims, and Archdiocesan seal issuance"
            activeTab="certificates"
        >
            <Head title="Certificate Orders & Claims - RCAL PIMS" />

            {/* Metric KPI Cards (Crisp White) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-serif font-bold text-slate-900">{stats.open}</div>
                        <div className="text-xs text-slate-500 font-medium">Open In-Flight</div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-serif font-bold text-slate-900">{stats.pending}</div>
                        <div className="text-xs text-slate-500 font-medium">Pending Review</div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-serif font-bold text-slate-900">{stats.issued}</div>
                        <div className="text-xs text-slate-500 font-medium">Issued & Released</div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-serif font-bold text-slate-900">{stats.rejected}</div>
                        <div className="text-xs text-slate-500 font-medium">Rejected / Cancelled</div>
                    </div>
                </div>
            </div>

            {/* Filter controls and Instant Client-side Tabs */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Instant Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => setCurrentTab('all')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                currentTab === 'all'
                                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All Orders ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentTab('internal')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                currentTab === 'internal'
                                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Staff Orders ({stats.cert_total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentTab('parishioner')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                currentTab === 'parishioner'
                                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Parishioner Claims ({stats.doc_total})
                        </button>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search by name or tracking #..."
                                defaultValue={filters.search}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFilter({ search: (e.target as HTMLInputElement).value });
                                    }
                                }}
                                className="bg-white border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3 py-1.5 text-xs w-64 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>

                        <select
                            value={filters.status}
                            onChange={(e) => handleFilter({ status: e.target.value })}
                            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="approved">Approved</option>
                            <option value="processing">Processing</option>
                            <option value="ready">Ready</option>
                            <option value="issued">Issued</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List Table: Staff Certificate Orders */}
            {(currentTab === 'all' || currentTab === 'internal') && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
                            <Award className="w-4 h-4 text-amber-600" />
                            Official Certificate Orders (Staff Queue)
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Total: {certificateRequests.total}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Cert / Order #</th>
                                    <th className="py-3 px-4">Subject Person</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Requester</th>
                                    <th className="py-3 px-4">Parish Jurisdiction</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {certificateRequests.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-slate-400">
                                            No certificate orders matching current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    certificateRequests.data.map((cert) => (
                                        <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-medium text-amber-700">
                                                {cert.certificate_number || `#ORD-${cert.id}`}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-900">
                                                {cert.record?.person?.full_name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 capitalize text-slate-700">
                                                {cert.record?.sacrament_type || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700">{cert.requester_name}</td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {cert.record?.originating_parish?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <StatusBadge status={cert.status} />
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link
                                                    href={`/certificates/${cert.id}`}
                                                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors border border-slate-200 shadow-2xs"
                                                >
                                                    Inspect
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* List Table: Public Parishioner Document Claims */}
            {(currentTab === 'all' || currentTab === 'parishioner') && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Parishioner Document Claims (Public Portal)
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Total: {documentRequests.total}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Tracking Code</th>
                                    <th className="py-3 px-4">Name on Record</th>
                                    <th className="py-3 px-4">Sacrament</th>
                                    <th className="py-3 px-4">Target Parish</th>
                                    <th className="py-3 px-4">Date Filed</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {documentRequests.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-slate-400">
                                            No parishioner claims matching current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    documentRequests.data.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-medium text-amber-700">
                                                {doc.tracking_code}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-900">{doc.name_on_record}</td>
                                            <td className="py-3 px-4 capitalize text-slate-700">{doc.sacrament_type}</td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {doc.targeted_parish?.name || 'Curia Chancery'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {doc.created_at.slice(0, 10)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <StatusBadge status={doc.status} />
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {doc.certificate_request_id ? (
                                                    <Link
                                                        href={`/certificates/${doc.certificate_request_id}`}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors border border-slate-200 shadow-2xs"
                                                    >
                                                        View Order
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMatchModalDoc(doc);
                                                            setSelectedRecordId('');
                                                            setRecordSearch(doc.name_on_record || '');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition border border-amber-300 shadow-2xs"
                                                    >
                                                        <LinkIcon className="w-3 h-3 text-amber-600" />
                                                        Match & Order
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Match Parishioner Claim to Canonical Record */}
            {matchModalDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMatchModalDoc(null)}
                >
                    <div
                        className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-amber-600" />
                                    Match Claim & Initialize Certificate Order
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Direct parishioner claim <span className="font-mono font-bold text-amber-700">{matchModalDoc.tracking_code}</span> to a certified ledger entry
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMatchModalDoc(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Claim Summary */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500 block text-[11px]">Subject Name:</span>
                                <strong className="text-slate-900">{matchModalDoc.name_on_record}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-[11px]">Sacrament:</span>
                                <strong className="text-slate-900 capitalize">{matchModalDoc.sacrament_type}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-[11px]">Date of Birth:</span>
                                <span className="text-slate-700">{matchModalDoc.date_of_birth || 'Not specified'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-[11px]">Parishioner User:</span>
                                <span className="text-slate-700">{matchModalDoc.parishioner?.display_name || matchModalDoc.parishioner?.username || 'Guest'}</span>
                            </div>
                        </div>

                        {/* Select or Search Canonical Register Record */}
                        <form onSubmit={handleMatchSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    Select Canonical Register Entry to Link <span className="text-rose-600">*</span>
                                </label>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            value={recordSearch}
                                            onChange={(e) => setRecordSearch(e.target.value)}
                                            placeholder="Filter candidate records by person name or citation..."
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                        />
                                    </div>

                                    <select
                                        required
                                        size={5}
                                        value={selectedRecordId}
                                        onChange={(e) => setSelectedRecordId(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs font-mono text-xs"
                                    >
                                        <option value="" disabled>-- Select matching ledger record below --</option>
                                        {availableRecords
                                            .filter((r) => {
                                                if (!recordSearch) return true;
                                                const s = recordSearch.toLowerCase();
                                                const name = (r.person?.full_name || `${r.person?.first_name} ${r.person?.last_name}`).toLowerCase();
                                                const citation = `book ${r.book_number} page ${r.page_number} entry ${r.entry_number}`.toLowerCase();
                                                return name.includes(s) || citation.includes(s);
                                            })
                                            .map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    #{r.id} • {r.person?.first_name} {r.person?.last_name} — {r.sacrament_type?.toUpperCase()} (Bk {r.book_number}, Pg {r.page_number}, Entry {r.entry_number})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                    Matching links this claim directly to the canonical inscription and generates an active Certificate Order in the staff pipeline.
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setMatchModalDoc(null)}
                                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedRecordId || isMatching}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                                >
                                    {isMatching ? 'Linking Order...' : 'Confirm Match & Initialize Certificate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
