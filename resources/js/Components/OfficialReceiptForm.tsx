import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Plus,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Receipt,
    Calendar,
    User,
    FileText,
    Coins,
    ArrowDownRight,
    ArrowUpRight,
    Sparkles,
    ShieldAlert,
    X,
} from 'lucide-react';
import { ChartOfAccount } from '@/types';
import SearchableAccountSelect from './SearchableAccountSelect';

export const SACRAMENT_PRICING_MAP: Record<string, number> = {
    // Sacraments / Stole Fees
    '4201': 800,    // Baptisms (Stole Fees)
    '4202': 800,    // Confirmations (Stole Fees)
    '4211': 7210,   // Nuptial Rites - Poblacion
    '4212': 2000,   // Nuptial Rites - Barrio
    '4231': 1000,   // Funerals (Stole Fees)
    // Mass Intentions
    '230101': 100,  // Poblacion Mass (Multiple Intentions)
    '230102': 50,   // Barrio Mass (Multiple Intentions)
    '230103': 50,   // Novena Mass (Multiple Intentions)
    '230111': 500,  // Poblacion Mass (Single Intention)
    '230112': 300,  // Barrio Mass (Single Intention)
    '230113': 300,  // Novena Mass (Single Intention)
    '230121': 1500, // Funeral Mass - CTDA
    '230122': 1500, // Funeral Mass - RZDA
    '230123': 2000, // Funeral Mass (more than one corpse)
    '230131': 7210, // Nuptial Mass - CTDA
    '230132': 7210, // Nuptial Mass - RZDA
    '230141': 2000, // Nuptial Mass Barrio - CTDA
    '230142': 2000, // Nuptial Mass Barrio - RZDA
    '230151': 1000, // Home/Office Mass
    // Certificates & Permits
    '440001': 150,  // Baptismal Certificate
    '440002': 150,  // Confirmation Certificate
    '440003': 300,  // Banns/Dispensation/Marriage Permit
};

export const getSacramentDefaultPricing = (code: string): number | null => {
    return SACRAMENT_PRICING_MAP[code] ?? null;
};

export interface LineItem {
    id: string; // Temporary unique ID for frontend tracking
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

export default function OfficialReceiptForm({
    accounts = [],
    initialReferenceNo = '',
    submitUrl = '/ledger/transactions',
    onCancel,
    onSuccess,
    className = '',
}: Props) {
    // 1. Separate accounts by category to enforce correct double-entry selection
    const { revenueAccounts, assetAccounts, otherAccounts } = useMemo(() => {
        const revenues: ChartOfAccount[] = [];
        const assets: ChartOfAccount[] = [];
        const others: ChartOfAccount[] = [];

        accounts.forEach(acc => {
            if (acc.type === 'revenue' || acc.type === 'liability') {
                revenues.push(acc);
            } else if (acc.type === 'asset') {
                assets.push(acc);
            } else {
                others.push(acc);
            }
        });

        return {
            revenueAccounts: revenues,
            assetAccounts: assets,
            otherAccounts: others,
        };
    }, [accounts]);

    const defaultRevenueAccountId = revenueAccounts[0]?.id ?? '';
    const defaultAssetAccountId =
        assetAccounts.find(a => a.code.startsWith('1102') || a.code.startsWith('101') || a.title.toLowerCase().includes('cash'))?.id ??
        assetAccounts[0]?.id ??
        '';

    // 2. Inertia Form State for the Header & Payload
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const { data, setData, post, processing, errors, transform, clearErrors } = useForm({
        reference_no: initialReferenceNo,
        transaction_date: new Date().toISOString().split('T')[0],
        contact_name: '',
        description: '',
        type: 'receipt' as const,
        status: 'posted' as const,
    });

    // 3. Dynamic Grids: Credits (Revenues/Payment For) & Debits (Assets/Payment Mode)
    const [creditLines, setCreditLines] = useState<LineItem[]>([
        { id: crypto.randomUUID(), account_id: defaultRevenueAccountId, amount: '', notes: '' },
    ]);

    const [debitLines, setDebitLines] = useState<LineItem[]>([
        { id: crypto.randomUUID(), account_id: defaultAssetAccountId, amount: '', notes: 'Cash' },
    ]);

    useEffect(() => {
        if (initialReferenceNo && !data.reference_no) {
            setData('reference_no', initialReferenceNo);
        }
    }, [initialReferenceNo]);

    // 4. Auto-Calculating Totals & Double-Entry Equality
    const totalCredits = useMemo(
        () => creditLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
        [creditLines]
    );

    const totalDebits = useMemo(
        () => debitLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
        [debitLines]
    );

    // Floating-point safe balance comparison
    const difference = Math.abs(totalCredits - totalDebits);
    const isBalanced = totalCredits > 0 && difference < 0.005;

    // Currency Formatter
    const formatCurrency = (val: number) =>
        '₱ ' +
        val.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // 5. Grid Handlers
    const addLine = (
        setLines: React.Dispatch<React.SetStateAction<LineItem[]>>,
        defaultAccountId: number | '' = '',
        defaultNotes: string = ''
    ) => {
        setLines(prev => [
            ...prev,
            { id: crypto.randomUUID(), account_id: defaultAccountId, amount: '', notes: defaultNotes },
        ]);
    };

    const updateLine = (
        setLines: React.Dispatch<React.SetStateAction<LineItem[]>>,
        id: string,
        field: keyof LineItem,
        value: string | number
    ) => {
        setLines(prev =>
            prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
        );
    };

    // Auto-pricing account selection handlers
    const handleSelectCreditAccount = (lineId: string, account: ChartOfAccount | null) => {
        setCreditLines(prev =>
            prev.map(line => {
                if (line.id !== lineId) return line;
                if (!account) return { ...line, account_id: '' };

                // Retrieve pricing from account.default_amount or sacrament map
                const price =
                    account.default_amount !== undefined && account.default_amount !== null
                        ? Number(account.default_amount)
                        : getSacramentDefaultPricing(account.code);

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

    const handleSelectDebitAccount = (lineId: string, account: ChartOfAccount | null) => {
        setDebitLines(prev =>
            prev.map(line => {
                if (line.id !== lineId) return line;
                if (!account) return { ...line, account_id: '' };

                const nextNotes = line.notes ? line.notes : account.title;
                return {
                    ...line,
                    account_id: account.id,
                    notes: nextNotes,
                };
            })
        );
    };

    const removeLine = (
        setLines: React.Dispatch<React.SetStateAction<LineItem[]>>,
        id: string
    ) => {
        setLines(prev => {
            if (prev.length <= 1) {
                return [{ id: crypto.randomUUID(), account_id: '', amount: '', notes: '' }];
            }
            return prev.filter(line => line.id !== id);
        });
    };

    // Auto-balance helper
    const autoBalanceDebits = () => {
        if (totalCredits <= 0) return;
        setDebitLines(prev => {
            if (prev.length === 0) {
                return [{ id: crypto.randomUUID(), account_id: defaultAssetAccountId, amount: totalCredits, notes: 'Cash' }];
            }
            const updated = [...prev];
            updated[0] = { ...updated[0], amount: totalCredits };
            return updated;
        });
    };

    // 6. Pre-Submission Prompt & Confirmation
    const handlePreSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!isBalanced) {
            alert('Transaction is out of balance. Total Revenues (Credits) must equal Total Payments (Debits).');
            return;
        }

        if (!data.reference_no.trim()) {
            alert('Please provide an Official Receipt reference number.');
            return;
        }

        if (!data.contact_name.trim()) {
            alert('Please specify the person or entity from whom the payment was received.');
            return;
        }

        setShowConfirmModal(true);
    };

    // 7. Confirmed Atomic Submission
    const executeSubmit = () => {
        setShowConfirmModal(false);
        clearErrors();

        transform((raw) => ({
            ...raw,
            status: 'posted',
            lines: {
                credits: creditLines
                    .filter(l => l.account_id !== '' && Number(l.amount) > 0)
                    .map(l => ({
                        account_id: Number(l.account_id),
                        chart_of_account_id: Number(l.account_id),
                        amount: Number(l.amount),
                        notes: l.notes || '',
                    })),
                debits: debitLines
                    .filter(l => l.account_id !== '' && Number(l.amount) > 0)
                    .map(l => ({
                        account_id: Number(l.account_id),
                        chart_of_account_id: Number(l.account_id),
                        amount: Number(l.amount),
                        notes: l.notes || '',
                    })),
            },
        }));

        post(submitUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (onSuccess) onSuccess();
            },
        });
    };

    return (
        <>
            <form
                onSubmit={handlePreSubmit}
                className={`p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200/80 space-y-8 ${className}`}
            >
                {/* HEADER TITLE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                            <Receipt className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-serif">Official Receipt (O.R.) Entry</h2>
                            <p className="text-xs text-slate-500">Parish unified double-entry ledger &bull; Permanent canonical reference</p>
                        </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Coins className="w-3.5 h-3.5" /> Direct Ledger Entry
                    </span>
                </div>

                {/* HEADER SECTION: METADATA & RECIPIENT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/70 p-5 rounded-xl border border-slate-200/70">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-slate-500" />
                            O.R. Reference No. <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. OR-2026-0001"
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
                            Date <span className="text-rose-500">*</span>
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

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            Received From (Payee / Parishioner) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Full Name of Parishioner / Donor / Organization"
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

                    <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Particulars / Description
                        </label>
                        <input
                            type="text"
                            placeholder="Brief summary of payment (e.g. Mass offering, baptismal stole fee, donation for chapel renovation)"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>

                {/* DUAL-GRID LAYOUT */}
                <div className="space-y-8">
                    {/* GRID 1: IN PAYMENT OF (REVENUES / CREDITS) */}
                    <div className="bg-slate-50/50 rounded-2xl p-5 sm:p-6 border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                    <ArrowDownRight className="w-4 h-4 text-emerald-700" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        1. In Payment Of <span className="text-xs font-normal text-slate-500">(Revenues &amp; Credits)</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">Select which parish revenue account or fund this payment applies to</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => addLine(setCreditLines, defaultRevenueAccountId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Revenue Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {creditLines.map((line, idx) => (
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
                                            onChange={account => handleSelectCreditAccount(line.id, account)}
                                            filterTypes={['revenue', 'liability', 'equity']}
                                            placeholder="-- Search revenue or receipt account (e.g. 4201, Baptism) --"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Item details (e.g. Baptism certificate, 10 Mass stipends)"
                                            value={line.notes}
                                            onChange={e => updateLine(setCreditLines, line.id, 'notes', e.target.value)}
                                            className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="w-full sm:w-44 relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={line.amount}
                                            onChange={e => updateLine(setCreditLines, line.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full text-sm font-mono font-semibold rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeLine(setCreditLines, line.id)}
                                        title="Remove item"
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <div className="flex justify-between items-center pt-2 px-2">
                                <span className="text-xs text-slate-500">Items: {creditLines.length}</span>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span>Total Revenue:</span>
                                    <span className="font-mono text-base text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        {formatCurrency(totalCredits)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRID 2: FORM OF PAYMENT (ASSETS / DEBITS) */}
                    <div className="bg-slate-50/50 rounded-2xl p-5 sm:p-6 border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4 text-blue-700" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        2. Form of Payment <span className="text-xs font-normal text-slate-500">(Assets &amp; Debits)</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">Specify destination cash box or bank account receiving the funds</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {totalCredits > 0 && !isBalanced && (
                                    <button
                                        type="button"
                                        onClick={autoBalanceDebits}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                                        title="Set first debit amount to match total credits"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Match Total ({formatCurrency(totalCredits)})
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => addLine(setDebitLines, defaultAssetAccountId, 'Cash')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Payment Mode
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {debitLines.map((line, idx) => (
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
                                            onChange={account => handleSelectDebitAccount(line.id, account)}
                                            filterTypes={['asset', 'liability']}
                                            placeholder="-- Search payment mode (e.g. 1102 Cash on Hand) --"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Check No., Reference, or Bank Slip (e.g. Cash, BPI-Check #1092)"
                                            value={line.notes}
                                            onChange={e => updateLine(setDebitLines, line.id, 'notes', e.target.value)}
                                            className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="w-full sm:w-44 relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={line.amount}
                                            onChange={e => updateLine(setDebitLines, line.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full text-sm font-mono font-semibold rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeLine(setDebitLines, line.id)}
                                        title="Remove item"
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <div className="flex justify-between items-center pt-2 px-2">
                                <span className="text-xs text-slate-500">Items: {debitLines.length}</span>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span>Total Payment:</span>
                                    <span className="font-mono text-base text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                        {formatCurrency(totalDebits)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VALIDATION STATUS BANNER & SUBMISSION */}
                <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {isBalanced ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                    <span className="font-bold">Double-Entry Balanced:</span>{' '}
                                    <span className="font-mono font-semibold">{formatCurrency(totalCredits)}</span>
                                </div>
                            </div>
                        ) : totalCredits === 0 && totalDebits === 0 ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs">
                                <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Enter revenue amounts and payment details above.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                <div>
                                    <span className="font-bold">Out of Balance:</span> Difference of{' '}
                                    <span className="font-mono font-bold">{formatCurrency(difference)}</span>
                                    <span className="text-xs block text-rose-600 mt-0.5">
                                        Credits: {formatCurrency(totalCredits)} &bull; Debits: {formatCurrency(totalDebits)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Single Direct Record Action */}
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
                            disabled={!isBalanced || processing}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {processing ? 'Recording...' : 'Record Official Receipt'}
                        </button>
                    </div>
                </div>
            </form>

            {/* CONFIRMATION MODAL (IMMUTABILITY SAFETY PROMPT) */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 font-serif">
                                    Confirm Official Receipt Recording
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Please verify all details before submitting. In accordance with church ledger policies, entries are <strong className="text-slate-800">permanent and immutable</strong> once inscribed.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Reference No:</span>
                                <span className="font-mono font-bold text-slate-900">{data.reference_no}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Transaction Date:</span>
                                <span className="font-medium text-slate-900">{data.transaction_date}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Received From:</span>
                                <span className="font-medium text-slate-900">{data.contact_name}</span>
                            </div>
                            {data.description && (
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-500">Particulars:</span>
                                    <span className="text-slate-700 max-w-xs truncate">{data.description}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                                <span className="text-slate-700">Total Inflow:</span>
                                <span className="font-mono text-emerald-700">{formatCurrency(totalCredits)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <strong>Note:</strong> Are you sure the details entered are correct? This receipt will instantly appear in the parish cross-checking ledger and cannot be altered or deleted.
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
                                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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
