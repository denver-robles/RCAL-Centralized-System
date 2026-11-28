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
    ShieldAlert,
    X,
    Building2,
    SlidersHorizontal,
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

// Safe unique ID generator for environments without crypto.randomUUID
const generateUniqueId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'line-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
};

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

export default function OfficialReceiptForm({
    accounts = [],
    initialReferenceNo = '',
    submitUrl = '/ledger/transactions',
    onCancel,
    onSuccess,
    className = '',
}: Props) {
    // 1. Categorize accounts for fast lookup
    const { revenueAccounts, assetAccounts } = useMemo(() => {
        const revenues: ChartOfAccount[] = [];
        const assets: ChartOfAccount[] = [];

        accounts.forEach(acc => {
            if (acc.type === 'revenue' || acc.type === 'liability') {
                revenues.push(acc);
            } else if (acc.type === 'asset') {
                assets.push(acc);
            }
        });

        return { revenueAccounts: revenues, assetAccounts: assets };
    }, [accounts]);

    // Preferred default accounts
    const defaultRevenueAccountId = revenueAccounts[0]?.id ?? '';
    const defaultCashAccountId =
        assetAccounts.find(a => a.code === '1102' || a.code.startsWith('101') || a.title.toLowerCase().includes('cash'))?.id ??
        assetAccounts[0]?.id ??
        '';

    // 2. Primary Header Form State
    const [destinationAccountId, setDestinationAccountId] = useState<number | ''>(defaultCashAccountId);
    const [paymentMethodNote, setPaymentMethodNote] = useState('Cash');
    const [isSplitPaymentMode, setIsSplitPaymentMode] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const { data, setData, post, processing, errors, transform, clearErrors } = useForm({
        reference_no: initialReferenceNo,
        transaction_date: new Date().toISOString().split('T')[0],
        contact_name: '',
        description: '',
        type: 'receipt' as const,
        status: 'posted' as const,
    });

    useEffect(() => {
        if (initialReferenceNo && !data.reference_no) {
            setData('reference_no', initialReferenceNo);
        }
    }, [initialReferenceNo]);

    useEffect(() => {
        if (!destinationAccountId && defaultCashAccountId) {
            setDestinationAccountId(defaultCashAccountId);
        }
    }, [defaultCashAccountId]);

    // 3. Revenue Items Grid (In Payment Of - Credits)
    const [revenueLines, setRevenueLines] = useState<LineItem[]>([
        { id: generateUniqueId(), account_id: defaultRevenueAccountId, amount: '', notes: '' },
    ]);

    // Optional Split Payment Grid (Debits) for advanced multi-tender
    const [splitDebitLines, setSplitDebitLines] = useState<LineItem[]>([
        { id: generateUniqueId(), account_id: defaultCashAccountId, amount: '', notes: 'Cash' },
    ]);

    // 4. Calculations
    const totalRevenue = useMemo(
        () => revenueLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
        [revenueLines]
    );

    const totalSplitDebits = useMemo(
        () => splitDebitLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
        [splitDebitLines]
    );

    // If simple mode: always automatically balanced as long as revenue > 0 and destination selected
    // If split mode: debits must equal credits
    const isBalanced = isSplitPaymentMode
        ? totalRevenue > 0 && Math.abs(totalRevenue - totalSplitDebits) < 0.005
        : totalRevenue > 0 && destinationAccountId !== '';

    const formatCurrency = (val: number) =>
        '₱ ' +
        val.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // 5. Grid Handlers
    const addRevenueLine = () => {
        setRevenueLines(prev => [
            ...prev,
            { id: generateUniqueId(), account_id: defaultRevenueAccountId, amount: '', notes: '' },
        ]);
    };

    const updateRevenueLine = (id: string, field: keyof LineItem, value: string | number) => {
        setRevenueLines(prev =>
            prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
        );
    };

    const removeRevenueLine = (id: string) => {
        setRevenueLines(prev => {
            if (prev.length <= 1) {
                return [{ id: generateUniqueId(), account_id: '', amount: '', notes: '' }];
            }
            return prev.filter(line => line.id !== id);
        });
    };

    const handleSelectRevenueAccount = (lineId: string, account: ChartOfAccount | null) => {
        setRevenueLines(prev =>
            prev.map(line => {
                if (line.id !== lineId) return line;
                if (!account) return { ...line, account_id: '' };

                const price =
                    account.default_amount !== undefined && account.default_amount !== null
                        ? Number(account.default_amount)
                        : getSacramentDefaultPricing(account.code);

                const shouldSetAmount =
                    price !== null && (line.amount === '' || line.amount === 0 || Number(line.amount) <= 0);

                return {
                    ...line,
                    account_id: account.id,
                    amount: shouldSetAmount ? price : line.amount,
                    notes: line.notes ? line.notes : account.title,
                };
            })
        );
    };

    // Split Mode Handlers
    const addSplitDebitLine = () => {
        setSplitDebitLines(prev => [
            ...prev,
            { id: generateUniqueId(), account_id: defaultCashAccountId, amount: '', notes: '' },
        ]);
    };

    const updateSplitDebitLine = (id: string, field: keyof LineItem, value: string | number) => {
        setSplitDebitLines(prev =>
            prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
        );
    };

    const removeSplitDebitLine = (id: string) => {
        setSplitDebitLines(prev => {
            if (prev.length <= 1) {
                return [{ id: generateUniqueId(), account_id: '', amount: '', notes: '' }];
            }
            return prev.filter(line => line.id !== id);
        });
    };

    // 6. Pre-Submission Prompt & Validation
    const handlePreSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!data.reference_no.trim()) {
            alert('Please provide an Official Receipt (O.R.) reference number.');
            return;
        }

        if (!data.contact_name.trim()) {
            alert('Please specify the person or entity from whom the payment was received.');
            return;
        }

        if (totalRevenue <= 0) {
            alert('Please enter at least one revenue item with a valid payment amount.');
            return;
        }

        if (isSplitPaymentMode && Math.abs(totalRevenue - totalSplitDebits) >= 0.005) {
            alert(`Split payment modes are out of balance. Total Revenues: ${formatCurrency(totalRevenue)} vs Total Payments: ${formatCurrency(totalSplitDebits)}`);
            return;
        }

        if (!isSplitPaymentMode && !destinationAccountId) {
            alert('Please select the receiving bank or cash account for this receipt.');
            return;
        }

        setShowConfirmModal(true);
    };

    // 7. Confirmed Atomic Submission
    const executeSubmit = () => {
        setShowConfirmModal(false);
        clearErrors();

        // Build balancing debits
        const finalDebits = isSplitPaymentMode
            ? splitDebitLines
                  .filter(l => l.account_id !== '' && Number(l.amount) > 0)
                  .map(l => ({
                      account_id: Number(l.account_id),
                      chart_of_account_id: Number(l.account_id),
                      amount: Number(l.amount),
                      notes: l.notes || 'Payment Mode',
                  }))
            : [
                  {
                      account_id: Number(destinationAccountId),
                      chart_of_account_id: Number(destinationAccountId),
                      amount: totalRevenue,
                      notes: paymentMethodNote || 'Cash on Hand',
                  },
              ];

        transform((raw) => ({
            ...raw,
            status: 'posted',
            lines: {
                credits: revenueLines
                    .filter(l => l.account_id !== '' && Number(l.amount) > 0)
                    .map(l => ({
                        account_id: Number(l.account_id),
                        chart_of_account_id: Number(l.account_id),
                        amount: Number(l.amount),
                        notes: l.notes || '',
                    })),
                debits: finalDebits,
            },
        }));

        post(submitUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (onSuccess) onSuccess();
            },
        });
    };

    const selectedDestAccount = assetAccounts.find(a => a.id === destinationAccountId);

    return (
        <>
            <form
                onSubmit={handlePreSubmit}
                className={`p-4 sm:p-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 space-y-6 ${className}`}
            >
                {/* ── HEADER TITLE & BADGE ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">Official Receipt (O.R.) Entry</h2>
                            <p className="text-xs text-slate-500">Parish unified ledger &bull; Permanent canonical reference</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Coins className="w-3.5 h-3.5" /> Cash Inflow / Collection
                        </span>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── TOP SECTION: RECEIPT HEADER DETAILS ── */}
                <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* OR Reference Number */}
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
                                className={`w-full text-xs sm:text-sm font-mono font-medium rounded-xl border ${
                                    errors.reference_no ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                                } px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white`}
                                required
                            />
                            {errors.reference_no && (
                                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.reference_no}</p>
                            )}
                        </div>

                        {/* Transaction Date */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={data.transaction_date}
                                onChange={e => setData('transaction_date', e.target.value)}
                                className={`w-full text-xs sm:text-sm rounded-xl border ${
                                    errors.transaction_date ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                                } px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white`}
                                required
                            />
                            {errors.transaction_date && (
                                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.transaction_date}</p>
                            )}
                        </div>

                        {/* Received From */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                Received From <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Name of Parishioner / Payee"
                                value={data.contact_name}
                                onChange={e => setData('contact_name', e.target.value)}
                                className={`w-full text-xs sm:text-sm rounded-xl border ${
                                    errors.contact_name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                                } px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white`}
                                required
                            />
                            {errors.contact_name && (
                                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.contact_name}</p>
                            )}
                        </div>
                    </div>

                    {/* Payment Mode / Receiving Bank Account (Single Mode Default) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-200/70">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                Receiving Account (Payment Mode) <span className="text-rose-500">*</span>
                            </label>
                            <SearchableAccountSelect
                                accounts={accounts}
                                value={destinationAccountId}
                                onChange={acc => setDestinationAccountId(acc ? acc.id : '')}
                                filterTypes={['asset']}
                                placeholder="-- Select Cash or Bank Account --"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                Payment Reference
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Cash, Check #1042, Online Transfer"
                                value={paymentMethodNote}
                                onChange={e => setPaymentMethodNote(e.target.value)}
                                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                Particulars / General Remarks
                            </label>
                            <input
                                type="text"
                                placeholder="Summary notes (e.g. Stole fee & cert)"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* ── REVENUE BREAKDOWN GRID (IN PAYMENT OF) ── */}
                <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                In Payment Of <span className="text-xs font-normal text-slate-500">(Revenues &amp; Collections)</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Select sacrament, stole fee, or collection account. Standard prices are applied automatically.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addRevenueLine}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Revenue Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {revenueLines.map((line, idx) => (
                            <div
                                key={line.id}
                                className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 hover:border-slate-300 transition-colors"
                            >
                                <div className="hidden sm:block w-7 text-center text-xs font-bold text-slate-400 shrink-0">
                                    #{idx + 1}
                                </div>

                                {/* Account selector with search */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="sm:hidden block text-2xs font-bold text-slate-500 uppercase mb-1">
                                        Account #{idx + 1}
                                    </label>
                                    <SearchableAccountSelect
                                        accounts={accounts}
                                        value={line.account_id}
                                        onChange={account => handleSelectRevenueAccount(line.id, account)}
                                        filterTypes={['revenue', 'liability', 'equity']}
                                        placeholder="-- Search revenue account (e.g. 4201 Baptism) --"
                                    />
                                </div>

                                {/* Particulars / notes */}
                                <div className="flex-1 min-w-[160px]">
                                    <label className="sm:hidden block text-2xs font-bold text-slate-500 uppercase mb-1">
                                        Particulars / Details
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Item particulars / names"
                                        value={line.notes}
                                        onChange={e => updateRevenueLine(line.id, 'notes', e.target.value)}
                                        className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    />
                                </div>

                                {/* Amount with currency */}
                                <div className="flex items-center gap-2">
                                    <div className="w-36 relative shrink-0">
                                        <label className="sm:hidden block text-2xs font-bold text-slate-500 uppercase mb-1">
                                            Amount
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">₱</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                value={line.amount}
                                                onChange={e => updateRevenueLine(line.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full text-xs sm:text-sm font-mono font-semibold rounded-xl border border-slate-300 py-2 pl-6 pr-2.5 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeRevenueLine(line.id)}
                                        title="Remove item"
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 mt-5 sm:mt-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 px-2 border-t border-slate-200/80 gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                                Revenue Items: {revenueLines.length} &bull; Deposited to:{' '}
                                <strong className="text-slate-800">
                                    {selectedDestAccount ? `${selectedDestAccount.code} - ${selectedDestAccount.title}` : 'Cash on Hand'}
                                </strong>
                            </span>

                            <button
                                type="button"
                                onClick={() => setIsSplitPaymentMode(!isSplitPaymentMode)}
                                className="inline-flex items-center gap-1 text-2xs text-slate-500 hover:text-amber-700 underline font-medium cursor-pointer"
                            >
                                <SlidersHorizontal className="w-3 h-3" />
                                {isSplitPaymentMode ? 'Switch to Simple Payment' : 'Split across multiple accounts'}
                            </button>
                        </div>

                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span>Total O.R. Amount:</span>
                            <span className="font-mono text-base text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                {formatCurrency(totalRevenue)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── ADVANCED SPLIT-PAYMENT GRID (OPTIONAL) ── */}
                {isSplitPaymentMode && (
                    <div className="bg-amber-50/40 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-3 animate-in fade-in duration-150">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                                    Split Payment Breakdown (Debits)
                                </h4>
                                <p className="text-2xs text-amber-700">Specify multiple bank or cash accounts receiving portions of this payment.</p>
                            </div>

                            <button
                                type="button"
                                onClick={addSplitDebitLine}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Mode
                            </button>
                        </div>

                        <div className="space-y-2">
                            {splitDebitLines.map((line, idx) => (
                                <div key={line.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200/70">
                                    <span className="text-xs font-bold text-slate-400 w-6 text-center">#{idx + 1}</span>
                                    <div className="flex-1">
                                        <SearchableAccountSelect
                                            accounts={accounts}
                                            value={line.account_id}
                                            onChange={acc => updateSplitDebitLine(line.id, 'account_id', acc ? acc.id : '')}
                                            filterTypes={['asset']}
                                            placeholder="-- Select Account --"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Notes / Slip #"
                                            value={line.notes}
                                            onChange={e => updateSplitDebitLine(line.id, 'notes', e.target.value)}
                                            className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5"
                                        />
                                    </div>
                                    <div className="w-32 relative">
                                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₱</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0.00"
                                            value={line.amount}
                                            onChange={e => updateSplitDebitLine(line.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full text-xs font-mono font-semibold rounded-lg border border-slate-300 py-1.5 pl-6 pr-2 text-right"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSplitDebitLine(line.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center text-xs text-amber-900 pt-1">
                            <span>Total Split Payments: <strong>{formatCurrency(totalSplitDebits)}</strong></span>
                            <span>Remaining: <strong className={Math.abs(totalRevenue - totalSplitDebits) < 0.005 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(totalRevenue - totalSplitDebits)}</strong></span>
                        </div>
                    </div>
                )}

                {/* ── FOOTER ACTIONS & STATUS ── */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {isBalanced ? (
                            <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Double-entry automatically balanced: <strong>{formatCurrency(totalRevenue)}</strong></span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Enter at least one revenue item with amount.</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={processing}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={!isBalanced || processing}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {processing ? 'Recording...' : 'Record Official Receipt'}
                        </button>
                    </div>
                </div>
            </form>

            {/* ── CONFIRMATION MODAL (IMMUTABILITY SAFETY PROMPT) ── */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
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
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Reference No:</span>
                                <span className="font-mono font-bold text-slate-900">{data.reference_no}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Date:</span>
                                <span className="font-medium text-slate-900">{data.transaction_date}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Received From:</span>
                                <span className="font-medium text-slate-900">{data.contact_name}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200">
                                <span className="text-slate-500">Receiving Account:</span>
                                <span className="font-medium text-slate-900">
                                    {selectedDestAccount ? `${selectedDestAccount.code} - ${selectedDestAccount.title}` : 'Cash on Hand'}
                                </span>
                            </div>
                            {data.description && (
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-500">Particulars:</span>
                                    <span className="text-slate-700 max-w-xs truncate">{data.description}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                                <span className="text-slate-700">Total O.R. Amount:</span>
                                <span className="font-mono text-emerald-700">{formatCurrency(totalRevenue)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <strong>Note:</strong> Are you sure the details entered are correct? This receipt will instantly appear in the parish cross-checking ledger and cannot be altered or deleted.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                                Review &amp; Edit
                            </button>

                            <button
                                type="button"
                                onClick={executeSubmit}
                                disabled={processing}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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
