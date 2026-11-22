import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import OfficialReceiptForm from './OfficialReceiptForm';
import CheckVoucherForm from './CheckVoucherForm';
import {
    Receipt,
    Plus,
    Search,
    CheckCircle2,
    Calendar,
    Coins,
    X,
    Eye,
    TrendingUp,
    BookmarkCheck,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
} from 'lucide-react';
import { ChartOfAccount, Transaction, PageProps, Parish } from '@/types';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props extends PageProps {
    transactions: {
        data: Transaction[];
        links: PaginationLink[];
        total: number;
        current_page: number;
        last_page: number;
    };
    accounts: ChartOfAccount[];
    suggestedOr: string;
    suggestedCv: string;
    filters: {
        search: string;
        type: string;
    };
    kpis: {
        totalReceipts: number;
        totalExpenses: number;
        totalTransactions: number;
        totalReceiptsCount: number;
        totalChecksCount: number;
        thisMonthInflows: number;
        thisMonthOutflows: number;
        netCashFlow: number;
    };
    currentParish?: Parish | null;
}

export default function LedgerIndex({
    auth,
    transactions,
    accounts,
    suggestedOr,
    suggestedCv,
    filters,
    kpis,
    currentParish,
}: Props) {
    const user = auth.user;
    const [search, setSearch] = useState(filters?.search || '');
    const [selectedType, setSelectedType] = useState(filters?.type || 'all');
    const [activeForm, setActiveForm] = useState<'receipt' | 'check' | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);

    // Filter handling
    const applyFilters = (newType = selectedType, newSearch = search) => {
        router.get(
            '/ledger',
            {
                search: newSearch || undefined,
                type: newType !== 'all' ? newType : undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(selectedType, search);
    };

    const formatCurrency = (amount: number | string | undefined) => {
        const val = Number(amount) || 0;
        return (
            '₱ ' +
            val.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
        );
    };

    // Calculate total amount for a transaction (dynamically calculated from total_amount or lines)
    const getTransactionTotal = (txn: Transaction): number => {
        if (txn.total_amount !== undefined && txn.total_amount !== null) {
            return Number(txn.total_amount);
        }
        if (!txn.lines || txn.lines.length === 0) return 0;
        return txn.lines.reduce((sum, line) => sum + (Number(line.credit_amount) || Number(line.debit_amount) || 0), 0);
    };

    return (
        <PortalLayout
            activeTab="ledger"
            title="Parish Financial Ledger"
            subtitle={`${currentParish?.name || 'Parish'} Reference & Cross-Checking Register`}
        >
            <Head title="Parish Financial Ledger - RCAL PIMS" />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* ── TOP KPI OVERVIEW CARDS ── */}
                {kpis && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* INFLOWS */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recorded Inflow</p>
                                <p className="text-2xl font-bold font-serif text-slate-900 mt-1">
                                    {formatCurrency(kpis.totalReceipts)}
                                </p>
                                <p className="text-2xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" /> {kpis.totalReceiptsCount} O.R. collections
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Coins className="w-6 h-6" />
                            </div>
                        </div>

                        {/* OUTFLOWS / EXPENSES */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recorded Outflow</p>
                                <p className="text-2xl font-bold font-serif text-slate-900 mt-1">
                                    {formatCurrency(kpis.totalExpenses)}
                                </p>
                                <p className="text-2xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> {kpis.totalChecksCount} C.V. disbursements
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                <CreditCard className="w-6 h-6" />
                            </div>
                        </div>

                        {/* NET POSITION */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Position</p>
                                <p className={`text-2xl font-bold font-serif mt-1 ${kpis.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {formatCurrency(kpis.netCashFlow)}
                                </p>
                                <p className="text-2xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-amber-600" />
                                    Mo: +{formatCurrency(kpis.thisMonthInflows)} / -{formatCurrency(kpis.thisMonthOutflows)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <Wallet className="w-6 h-6" />
                            </div>
                        </div>

                        {/* TOTAL RECORDS */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Folio Records</p>
                                <p className="text-2xl font-bold font-serif text-slate-900 mt-1">
                                    {transactions.total}
                                </p>
                                <p className="text-2xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Permanent &amp; immutable
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                <BookmarkCheck className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── HEADER TOOLBAR & ACTION BUTTONS ── */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                placeholder="Search Ref No, Payee, Particulars..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full text-sm rounded-xl border border-slate-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        <select
                            value={selectedType}
                            onChange={e => {
                                setSelectedType(e.target.value);
                                applyFilters(e.target.value, search);
                            }}
                            className="text-sm rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        >
                            <option value="all">All Types</option>
                            <option value="receipt">Official Receipt (Inflow)</option>
                            <option value="check">Check Voucher (Expense)</option>
                            <option value="deposit">Deposit</option>
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Search
                        </button>
                    </form>

                    {/* DUAL ACTION BUTTONS (REVENUE / EXPENSE) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveForm('receipt')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                            title="Record Cash Inflow (Revenues / Assets)"
                        >
                            <Plus className="w-4 h-4" /> New Official Receipt
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveForm('check')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                            title="Record Check Disbursement (Bank / Expenses)"
                        >
                            <CreditCard className="w-4 h-4" /> New Check Voucher
                        </button>
                    </div>
                </div>

                {/* ── ACTIVE FORM AREA (SLIDE-OVER / MODAL HOUSING) ── */}
                {activeForm === 'receipt' && (
                    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
                        <div className="relative w-full max-w-4xl my-3 sm:my-8">
                            <OfficialReceiptForm
                                accounts={accounts}
                                initialReferenceNo={suggestedOr}
                                submitUrl="/ledger/transactions"
                                onCancel={() => setActiveForm(null)}
                                onSuccess={() => setActiveForm(null)}
                            />
                        </div>
                    </div>
                )}

                {activeForm === 'check' && (
                    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
                        <div className="relative w-full max-w-4xl my-3 sm:my-8">
                            <CheckVoucherForm
                                accounts={accounts}
                                initialReferenceNo={suggestedCv}
                                submitUrl="/ledger/transactions"
                                onCancel={() => setActiveForm(null)}
                                onSuccess={() => setActiveForm(null)}
                            />
                        </div>
                    </div>
                )}

                {/* ── TRANSACTION RECORD TABLE ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4 font-bold">Date</th>
                                    <th className="py-3 px-4 font-bold">Ref No</th>
                                    <th className="py-3 px-4 font-bold">Type</th>
                                    <th className="py-3 px-4 font-bold">Entity / Payee</th>
                                    <th className="py-3 px-4 font-bold text-right">Amount</th>
                                    <th className="py-3 px-4 font-bold text-center">Status</th>
                                    <th className="py-3 px-4 font-bold">Recorded By</th>
                                    <th className="py-3 px-4 font-bold text-right">Cross-Check</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                            <p className="font-semibold text-slate-600">No ledger entries recorded</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Click "+ New Official Receipt" or "+ New Check Voucher" above to record a transaction for cross-checking.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((trx: Transaction) => {
                                        const total = getTransactionTotal(trx);
                                        const isCheck = trx.type === 'check';
                                        const isReceipt = trx.type === 'receipt';

                                        return (
                                            <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                                    {trx.transaction_date ? String(trx.transaction_date).slice(0, 10) : '—'}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap text-sm font-mono font-bold text-slate-900">
                                                    {trx.reference_no}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-2xs font-bold rounded-full ${
                                                        isReceipt
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : isCheck
                                                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                    }`}>
                                                        {isReceipt && <ArrowDownRight className="w-3 h-3" />}
                                                        {isCheck && <ArrowUpRight className="w-3 h-3" />}
                                                        {trx.type.toUpperCase()}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-sm text-slate-900">
                                                    <span className="font-semibold block text-slate-900">
                                                        {trx.contact_name || '—'}
                                                    </span>
                                                    {trx.description && (
                                                        <div className="text-xs text-slate-500 truncate max-w-xs">
                                                            {trx.description}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                                                    {isCheck ? (
                                                        <span className="text-rose-700">
                                                            - {formatCurrency(total)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-700">
                                                            + {formatCurrency(total)}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-2xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        {(trx.status || 'POSTED').toUpperCase()}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                                                    <span className="font-medium text-slate-800 block">
                                                        {trx.preparer?.display_name || trx.preparer?.username || 'Parish Secretariat'}
                                                    </span>
                                                    <span className="text-2xs text-slate-400">
                                                        {trx.created_at ? new Date(trx.created_at).toLocaleDateString() : ''}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingTransaction(trx)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 transition-colors cursor-pointer"
                                                        title="Cross-check debit and credit accounts"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                            <div>
                                Showing page {transactions.current_page} of {transactions.last_page} ({transactions.total} records)
                            </div>
                            <div className="flex gap-1">
                                {transactions.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs ${
                                            link.active
                                                ? 'bg-amber-600 text-white border-amber-600 font-bold'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MODAL: CROSS-CHECKING & DOUBLE-ENTRY BREAKDOWN ── */}
            {viewingTransaction && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 font-serif">
                                        Cross-Check Folio: {viewingTransaction.reference_no}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded text-2xs font-bold ${
                                        viewingTransaction.type === 'check'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        {viewingTransaction.type === 'check' ? 'Check Voucher' : 'Official Receipt'} &bull; Permanent
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {viewingTransaction.transaction_date ? String(viewingTransaction.transaction_date).slice(0, 10) : ''} &bull;{' '}
                                    {viewingTransaction.type === 'check' ? 'Payee:' : 'Received from:'}{' '}
                                    <strong className="text-slate-700">{viewingTransaction.contact_name}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingTransaction(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {viewingTransaction.description && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                <span className="font-semibold text-slate-800">Particulars:</span> {viewingTransaction.description}
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Account Code &amp; Title</th>
                                        <th className="p-3">Reference / Notes</th>
                                        <th className="p-3 text-right">Debit (Payment Mode / Expense)</th>
                                        <th className="p-3 text-right">Credit (Payment For / Bank Disbursed)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {viewingTransaction.lines?.map(line => (
                                        <tr key={line.id}>
                                            <td className="p-3 font-medium text-slate-900">
                                                {line.account?.code} - {line.account?.title}
                                            </td>
                                            <td className="p-3 text-slate-500">{line.notes || '—'}</td>
                                            <td className="p-3 text-right font-mono text-blue-700 font-semibold">
                                                {Number(line.debit_amount) > 0 ? formatCurrency(line.debit_amount) : '—'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                                                {Number(line.credit_amount) > 0 ? formatCurrency(line.credit_amount) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-2xs text-slate-400">
                                Recorded by {viewingTransaction.preparer?.display_name || viewingTransaction.preparer?.username || 'Staff'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setViewingTransaction(null)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
