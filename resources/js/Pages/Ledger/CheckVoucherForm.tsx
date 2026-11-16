import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Plus,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    CreditCard,
    Calendar,
    User,
    FileText,
    Building2,
    ShieldAlert,
    X,
    ArrowUpRight,
} from 'lucide-react';
import { ChartOfAccount } from '@/types';
import SearchableAccountSelect from '@/Components/SearchableAccountSelect';

export interface LineItem {
    id: string;
    account_id: number | '';
    amount: number | '';
    notes: string;
}

interface Props {
    accounts: ChartOfAccount[];
    initialReferenceNo?: string;
    submitUrl?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
    className?: string;
}

export default function CheckVoucherForm({
    accounts = [],
    initialReferenceNo = '',
    submitUrl = '/ledger/transactions',
    onCancel,
    onSuccess,
    className = '',
}: Props) {
    // 1. Separate accounts by category
    const { bankAndCashAccounts, expenseAccounts, otherAccounts } = useMemo(() => {
        const banks: ChartOfAccount[] = [];
        const expenses: ChartOfAccount[] = [];
        const others: ChartOfAccount[] = [];

        accounts.forEach(acc => {
            if (acc.type === 'asset') {
                banks.push(acc);
            } else if (acc.type === 'expense') {
                expenses.push(acc);
            } else {
                others.push(acc);
            }
        });

        return {
            bankAndCashAccounts: banks,
            expenseAccounts: expenses,
            otherAccounts: others,
        };
    }, [accounts]);

    // Default Bank Account (prefer Operating Bank account or first asset)
    const defaultBankId =
        bankAndCashAccounts.find(a => a.code.startsWith('102') || a.title.toLowerCase().includes('bank'))?.id ??
        bankAndCashAccounts[0]?.id ??
        '';

    const defaultExpenseId = expenseAccounts[0]?.id ?? '';

    // 2. Header State
    const [sourceAccountId, setSourceAccountId] = useState<number | ''>(defaultBankId);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const { data, setData, post, processing, errors, transform, clearErrors } = useForm({
        reference_no: initialReferenceNo,
        transaction_date: new Date().toISOString().split('T')[0],
        contact_name: '',
        description: '',
        type: 'check' as const,
        status: 'posted' as const,
    });

    useEffect(() => {
        if (initialReferenceNo && !data.reference_no) {
            setData('reference_no', initialReferenceNo);
        }
    }, [initialReferenceNo]);

    useEffect(() => {
        if (!sourceAccountId && defaultBankId) {
            setSourceAccountId(defaultBankId);
        }
    }, [defaultBankId]);

    // 3. Expense Grid (Debits)
    const [expenseLines, setExpenseLines] = useState<LineItem[]>([
        { id: crypto.randomUUID(), account_id: defaultExpenseId, amount: '', notes: '' },
    ]);

    // 4. Auto-Calculating Totals
    const totalExpenses = useMemo(
        () => expenseLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
        [expenseLines]
    );

    const isValid =
        sourceAccountId !== '' &&
        totalExpenses > 0 &&
        expenseLines.every(line => line.account_id !== '' && Number(line.amount) > 0);

    const formatCurrency = (val: number) =>
        '₱ ' +
        val.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // 5. Grid Handlers
    const addLine = () => {
        setExpenseLines(prev => [
            ...prev,
            { id: crypto.randomUUID(), account_id: defaultExpenseId, amount: '', notes: '' },
        ]);
    };

    const updateLine = (id: string, field: keyof LineItem, value: string | number) => {
        setExpenseLines(prev =>
            prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
        );
    };

    const handleSelectExpenseAccount = (id: string, account: ChartOfAccount | null) => {
        setExpenseLines(prev =>
            prev.map(line => {
                if (line.id !== id) return line;
                if (!account) return { ...line, account_id: '' };

                const price =
                    account.default_amount !== undefined && account.default_amount !== null
                        ? Number(account.default_amount)
                        : null;

                const shouldSetAmount =
                    price !== null && (line.amount === '' || line.amount === 0 || Number(line.amount) <= 0);

                const nextAmount = shouldSetAmount ? price : line.amount;
                const nextNotes = line.notes ? line.notes : account.title;

                return {
                    ...line,
                    account_id: account.id,
                    amount: nextAmount,
                    notes: nextNotes,
                };
            })
        );
    };

    const removeLine = (id: string) => {
        setExpenseLines(prev => {
            if (prev.length <= 1) {
                return [{ id: crypto.randomUUID(), account_id: '', amount: '', notes: '' }];
            }
            return prev.filter(line => line.id !== id);
        });
    };

    // 6. Pre-Submission Prompt & Validation
    const handlePreSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!isValid) {
            alert('Please select a source bank/cash account and ensure all expense lines have valid categories and amounts.');
            return;
        }

        if (!data.reference_no.trim()) {
            alert('Please provide a Check Voucher reference number (e.g. CV-2026-0001).');
            return;
        }

        if (!data.contact_name.trim()) {
            alert('Please specify the Payee (Pay To) for this Check Voucher.');
            return;
        }

        setShowConfirmModal(true);
    };

    // 7. Confirmed Atomic Submission (Debits = Expenses, Credits = Source Bank)
    const executeSubmit = () => {
        setShowConfirmModal(false);
        clearErrors();

        // Translate the simplified UI into balanced double-entry logic
        transform((raw) => ({
            ...raw,
            status: 'posted',
            lines: {
                // Debits: What the money was paid for (Expenses)
                debits: expenseLines
                    .filter(l => l.account_id !== '' && Number(l.amount) > 0)
                    .map(l => ({
                        account_id: Number(l.account_id),
                        chart_of_account_id: Number(l.account_id),
                        amount: Number(l.amount),
                        notes: l.notes || '',
                    })),
                // Credits: Where the money was disbursed from (Bank or Cash Asset)
                credits: [
                    {
                        account_id: Number(sourceAccountId),
                        chart_of_account_id: Number(sourceAccountId),
                        amount: totalExpenses,
                        notes: data.description || 'Check disbursement',
                    },
                ],
            },
        }));

        post(submitUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (onSuccess) onSuccess();
            },
        });
    };

    const selectedSourceAccount = bankAndCashAccounts.find(a => a.id === sourceAccountId);

    return (
        <>
            <form
                onSubmit={handlePreSubmit}
                className={`p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200/80 space-y-8 ${className}`}
            >
                {/* HEADER TITLE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-serif">Check Voucher (C.V.) Entry</h2>
                            <p className="text-xs text-slate-500">Parish expense disbursement &bull; Permanent canonical reference</p>
                        </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Cash Outflow / Expense
                    </span>
                </div>

                {/* HEADER SECTION: CHECK METADATA & SOURCE BANK */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/70 p-5 rounded-xl border border-slate-200/70">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            Check Voucher No. <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. CV-2026-0001"
                            value={data.reference_no}
                            onChange={e => setData('reference_no', e.target.value)}
                            className={`w-full text-sm font-mono font-medium rounded-xl border ${
                                errors.reference_no ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                            } px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                            required
                        />
                        {errors.reference_no && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.reference_no}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Voucher Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={data.transaction_date}
                            onChange={e => setData('transaction_date', e.target.value)}
                            className={`w-full text-sm rounded-xl border ${
                                errors.transaction_date ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                            } px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                            required
                        />
                        {errors.transaction_date && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.transaction_date}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            Pay To (Payee / Vendor) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Name of supplier, clergy, or utility"
                            value={data.contact_name}
                            onChange={e => setData('contact_name', e.target.value)}
                            className={`w-full text-sm rounded-xl border ${
                                errors.contact_name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                            } px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                            required
                        />
                        {errors.contact_name && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.contact_name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            Source Bank / Cash Account <span className="text-rose-500">*</span>
                        </label>
                        <SearchableAccountSelect
                            accounts={accounts}
                            value={sourceAccountId}
                            onChange={acc => setSourceAccountId(acc ? acc.id : '')}
                            filterTypes={['asset']}
                            placeholder="-- Search bank or cash account --"
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Particulars / Check Details
                        </label>
                        <input
                            type="text"
                            placeholder="Check number, invoice reference, or payment purpose (e.g. Check #004821 - Rectory utilities for October 2026)"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>

                {/* EXPENSE BREAKDOWN GRID (DEBITS) */}
                <div className="bg-slate-50/50 rounded-2xl p-5 sm:p-6 border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                Expense Breakdown <span className="text-xs font-normal text-slate-500">(Debits)</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Itemize where the funds are applied. The total is automatically credited against the selected bank account.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addLine}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Expense Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {expenseLines.map((line, idx) => (
                            <div
                                key={line.id}
                                className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors"
                            >
                                <div className="sm:w-8 text-center text-xs font-bold text-slate-400">
                                    #{idx + 1}
                                </div>

                                <div className="flex-1 min-w-[260px]">
                                    <SearchableAccountSelect
                                        accounts={accounts}
                                        value={line.account_id}
                                        onChange={account => handleSelectExpenseAccount(line.id, account)}
                                        filterTypes={['expense', 'liability', 'asset']}
                                        placeholder="-- Search expense category (e.g. 520101 Electricity, Supplies) --"
                                    />
                                </div>

                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Item details (e.g. Altar host supply, Rectory power bill)"
                                        value={line.notes}
                                        onChange={e => updateLine(line.id, 'notes', e.target.value)}
                                        className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="w-full sm:w-44 relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        value={line.amount}
                                        onChange={e => updateLine(line.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full text-sm font-mono font-semibold rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    title="Remove item"
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 px-2 border-t border-slate-200/80 gap-2">
                            <span className="text-xs text-slate-500">
                                Expense Items: {expenseLines.length} &bull; Disbursing via:{' '}
                                <strong className="text-slate-700">
                                    {selectedSourceAccount ? `${selectedSourceAccount.code} - ${selectedSourceAccount.title}` : 'No account selected'}
                                </strong>
                            </span>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span>Total Check Disbursement:</span>
                                <span className="font-mono text-base text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                                    {formatCurrency(totalExpenses)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUBMISSION & ACTIONS */}
                <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {isValid ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Double-entry automatically balanced: <strong>{formatCurrency(totalExpenses)}</strong></span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Select a source account and provide amounts for all expense items.</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={processing}
                                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-colors shadow-2xs"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={!isValid || processing}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {processing ? 'Recording...' : 'Record Check Voucher'}
                        </button>
                    </div>
                </div>
            </form>

            {/* CONFIRMATION MODAL (IMMUTABILITY SAFETY PROMPT) */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 font-serif">
                                    Confirm Check Voucher Recording
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Please verify all disbursement details before submitting. In accordance with parish ledger policies, entries are <strong className="text-slate-800">permanent and immutable</strong> once inscribed.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Check Voucher No:</span>
                                <span className="font-mono font-bold text-slate-900">{data.reference_no}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Voucher Date:</span>
                                <span className="font-medium text-slate-900">{data.transaction_date}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Pay To (Payee):</span>
                                <span className="font-medium text-slate-900">{data.contact_name}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Source Bank Account:</span>
                                <span className="font-medium text-slate-900">
                                    {selectedSourceAccount ? `${selectedSourceAccount.code} - ${selectedSourceAccount.title}` : '—'}
                                </span>
                            </div>
                            {data.description && (
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-500">Particulars:</span>
                                    <span className="text-slate-700 max-w-xs truncate">{data.description}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                                <span className="text-slate-700">Total Check Amount:</span>
                                <span className="font-mono text-rose-700">{formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                            <strong>Note:</strong> Are you sure the details entered are correct? This voucher will instantly appear in the parish ledger records for cross-checking and cannot be altered or deleted.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold"
                            >
                                Review &amp; Edit
                            </button>

                            <button
                                type="button"
                                onClick={executeSubmit}
                                disabled={processing}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                                {processing ? 'Recording...' : 'Yes, Confirm & Inscribe'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
