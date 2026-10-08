import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { AuditLog, PageProps, User } from '@/types';
import { ShieldCheck, Search, Database, X, Trash2, AlertTriangle, Clock } from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface AccessLogItem {
    id: number;
    user_id?: number | null;
    user?: User | null;
    resource_type: string;
    resource_id?: number | null;
    resource_identifier?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    accessed_at: string;
}

interface Props extends PageProps {
    auditLogs?: PaginatedData<AuditLog> | null;
    accessLogs?: PaginatedData<AccessLogItem> | null;
    filters: {
        tab: string;
        action: string;
        search: string;
    };
}

export default function Index({ auditLogs, accessLogs, filters, auth }: Props) {
    const [activeTab, setActiveTab] = useState<'audit' | 'access'>(
        filters.tab === 'access' ? 'access' : 'audit'
    );
    const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
    const [pruneModalOpen, setPruneModalOpen] = useState(false);
    const [isPruning, setIsPruning] = useState(false);

    const handlePrune = () => {
        setIsPruning(true);
        router.post('/audit/prune', {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsPruning(false);
                setPruneModalOpen(false);
            },
        });
    };

    // ESC key listener for Diff Modal and Prune Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedAuditLog(null);
                setPruneModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleFilter = (updates: Partial<typeof filters>) => {
        router.get(
            '/audit',
            { ...filters, ...updates, tab: activeTab },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const getActionBadgeClass = (action: string) => {
        switch (action) {
            case 'CREATE':
                return 'bg-emerald-50 border-emerald-200 text-emerald-800';
            case 'ANNOTATE':
                return 'bg-amber-50 border-amber-200 text-amber-800';
            case 'STATUS_CHANGE':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            case 'LOGIN_FAILED':
                return 'bg-rose-50 border-rose-200 text-rose-800';
            case 'PRINT':
                return 'bg-purple-50 border-purple-200 text-purple-800';
            default:
                return 'bg-slate-100 border-slate-200 text-slate-700';
        }
    };

    return (
        <PortalLayout
            title="Chancery Curia Audit & Privacy Trail"
            subtitle="Immutable event logs and Data Privacy Act of 2012 (RA 10173) telemetry monitoring"
        >
            <Head title="Audit Trail - RCAL PIMS" />

            {/* Filter controls and Instant Client-Side Tabs */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Instant Tab Switcher (client-side state with zero flash) */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('audit')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                activeTab === 'audit'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            System Events & Mutations
                            {auditLogs && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                                    {auditLogs.total}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('access')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                activeTab === 'access'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            Confidential Record Access (RA 10173)
                            {accessLogs && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                                    {accessLogs.total}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search & Actions Filter & Prune Action */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search by user, IP, or record..."
                                defaultValue={filters.search}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFilter({ search: (e.target as HTMLInputElement).value });
                                    }
                                }}
                                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs w-64 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                            />
                        </div>

                        {activeTab === 'audit' && (
                            <select
                                value={filters.action}
                                onChange={(e) => handleFilter({ action: e.target.value })}
                                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                            >
                                <option value="all">All Actions</option>
                                <option value="CREATE">CREATE</option>
                                <option value="ANNOTATE">ANNOTATE</option>
                                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                                <option value="PRINT">PRINT</option>
                            </select>
                        )}

                        {auth?.user?.is_archdiocese_wide && (
                            <button
                                type="button"
                                onClick={() => setPruneModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition shadow-sm"
                                title="Prune audit records older than 30 days to optimize storage"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                Prune Logs (&gt; 30d)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Audit Logs Table */}
            {activeTab === 'audit' && auditLogs && (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Actor</th>
                                    <th className="py-3 px-4">Target Resource</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4">IP Address</th>
                                    <th className="py-3 px-4 text-right">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {auditLogs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-slate-500">
                                            No audit log entries match your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    auditLogs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                                {log.created_at.slice(0, 19).replace('T', ' ')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-block border px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadgeClass(
                                                        log.action
                                                    )}`}
                                                >
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-900 font-semibold">
                                                {log.actor_username || 'System / Guest'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                                {log.subject_type ? `${log.subject_type} #${log.subject_id}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                                                {log.note || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                                {log.ip_address || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {(log.old_values || log.new_values) && (
                                                    <button
                                                        onClick={() => setSelectedAuditLog(log)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-all duration-150"
                                                    >
                                                        <Database className="w-3 h-3 text-amber-600" />
                                                        Diff
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {auditLogs.links && auditLogs.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-xs text-slate-500">
                                Showing page {auditLogs.current_page} of {auditLogs.last_page} ({auditLogs.total} total)
                            </span>
                            <div className="flex gap-1">
                                {auditLogs.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll
                                        className={`px-3 py-1 rounded text-xs transition ${
                                            link.active
                                                ? 'bg-slate-900 text-white font-semibold'
                                                : link.url
                                                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                : 'text-slate-400 opacity-50 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Access Logs Table (RA 10173) */}
            {activeTab === 'access' && accessLogs && (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Access Timestamp</th>
                                    <th className="py-3 px-4">Authorized User</th>
                                    <th className="py-3 px-4">Resource Accessed</th>
                                    <th className="py-3 px-4">Legal Citation Identifier</th>
                                    <th className="py-3 px-4">Client IP Address</th>
                                    <th className="py-3 px-4">Browser User Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {accessLogs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-500">
                                            No confidential access entries found.
                                        </td>
                                    </tr>
                                ) : (
                                    accessLogs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                                {log.accessed_at.slice(0, 19).replace('T', ' ')}
                                            </td>
                                            <td className="py-3 px-4 text-slate-900 font-semibold">
                                                {log.user?.display_name || log.user?.username || `User #${log.user_id}`}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 capitalize">
                                                {log.resource_type.replace('_', ' ')} #{log.resource_id}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-medium text-amber-800">
                                                {log.resource_identifier || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                                {log.ip_address || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 text-[10px] max-w-xs truncate">
                                                {log.user_agent || '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {accessLogs.links && accessLogs.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-xs text-slate-500">
                                Showing page {accessLogs.current_page} of {accessLogs.last_page} ({accessLogs.total} total)
                            </span>
                            <div className="flex gap-1">
                                {accessLogs.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll
                                        className={`px-3 py-1 rounded text-xs transition ${
                                            link.active
                                                ? 'bg-slate-900 text-white font-semibold'
                                                : link.url
                                                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                : 'text-slate-400 opacity-50 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Accessible Diff Modal with ESC & Backdrop Click Dismissal */}
            {selectedAuditLog && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
                    onClick={() => setSelectedAuditLog(null)}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                                <Database className="w-4 h-4 text-amber-600" />
                                Audit Log Payload #{selectedAuditLog.id}
                            </h3>
                            <button
                                onClick={() => setSelectedAuditLog(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="font-semibold text-slate-700 block mb-1">Old Values (Previous State)</span>
                                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] font-mono text-slate-700 overflow-x-auto max-h-60">
                                    {JSON.stringify(selectedAuditLog.old_values, null, 2) || 'null'}
                                </pre>
                            </div>

                            <div>
                                <span className="font-semibold text-slate-700 block mb-1">New Values (Mutated State)</span>
                                <pre className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-lg text-[11px] font-mono text-emerald-900 overflow-x-auto max-h-60">
                                    {JSON.stringify(selectedAuditLog.new_values, null, 2) || 'null'}
                                </pre>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedAuditLog(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prune Confirmation Modal */}
            {pruneModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200"
                    onClick={() => !isPruning && setPruneModalOpen(false)}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    Prune Audit Trail Retention (&gt; 30 Days)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Archdiocesan Data Retention Policy & Database Optimization
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs text-amber-900">
                            <p className="leading-relaxed">
                                This action permanently purges all immutable system event and mutation audit records older than <strong>30 days</strong> to prevent database storage bloat.
                            </p>
                            <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                Confidential access trail logs (RA 10173) are retained and will not be affected.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                disabled={isPruning}
                                onClick={() => setPruneModalOpen(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isPruning}
                                onClick={handlePrune}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {isPruning ? 'Pruning Records...' : 'Execute 30-Day Retention Prune'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
