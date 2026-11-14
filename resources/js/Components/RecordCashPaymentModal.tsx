import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { SacramentSchedule, PageProps } from '@/types';
import { X, Receipt, CheckCircle2, User, Sparkles, PenLine } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    schedule: SacramentSchedule | null;
    suggestedOrNumber?: string;
}

export default function RecordCashPaymentModal({ isOpen, onClose, schedule, suggestedOrNumber }: Props) {
    if (!isOpen || !schedule) return null;

    const { auth } = usePage<PageProps>().props;
    const defaultStaffName = auth.user?.display_name || auth.user?.username || 'Parish Secretariat';

    // OR Number Mode: 'auto' or 'manual'
    const [orMode, setOrMode] = useState<'auto' | 'manual'>('auto');
    const [orNumber, setOrNumber] = useState('');
    const [amount, setAmount] = useState<string | number>(schedule.amount || 800);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // Receiver Mode: 'current' (logged in user) or 'manual'
    const [receiverMode, setReceiverMode] = useState<'current' | 'manual'>('current');
    const [receiverName, setReceiverName] = useState(defaultStaffName);
    const [customReceiver, setCustomReceiver] = useState('');

    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (schedule) {
            if (schedule.payment_reference) {
                setOrNumber(schedule.payment_reference);
                setOrMode('manual');
            } else {
                setOrNumber(suggestedOrNumber || `OR-${new Date().getFullYear()}-0001`);
                setOrMode('auto');
            }
            setAmount(schedule.payment_amount || schedule.amount || 800);
            setPaymentDate(schedule.paid_at || new Date().toISOString().split('T')[0]);
            setReceiverMode('current');
            setReceiverName(defaultStaffName);
            setCustomReceiver('');
            setNotes(schedule.payment_notes || '');
            setError(null);
        }
    }, [schedule, suggestedOrNumber]);

    // Handle OR mode change
    const handleOrModeChange = (mode: 'auto' | 'manual') => {
        setOrMode(mode);
        if (mode === 'auto') {
            setOrNumber(suggestedOrNumber || `OR-${new Date().getFullYear()}-0001`);
        } else {
            setOrNumber('');
        }
    };

    const finalReceiver = receiverMode === 'current' ? receiverName : (customReceiver.trim() || defaultStaffName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orNumber.trim()) {
            setError('Official Receipt (OR) Number is required.');
            return;
        }
        if (!amount || Number(amount) < 0) {
            setError('Please enter a valid cash amount.');
            return;
        }

        setProcessing(true);
        setError(null);

        // Include receiver in the payment notes so it is permanently logged
        const combinedNotes = `Received by: ${finalReceiver}${notes.trim() ? ` • ${notes.trim()}` : ''}`;

        router.post(
            `/schedules/${schedule.id}/verify-payment`,
            {
                payment_status: 'paid',
                payment_reference: orNumber.trim(),
                payment_amount: Number(amount),
                paid_at: paymentDate,
                payment_notes: combinedNotes,
            },
            {
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                },
                onError: (errs) => {
                    setProcessing(false);
                    setError(Object.values(errs)[0] || 'Failed to record cash payment.');
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-base">Record Cash Payment</h3>
                            <p className="text-xs text-slate-300 capitalize">
                                {schedule.sacrament_type} • #{schedule.id}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    {/* Schedule Target Summary */}
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-slate-600 font-semibold">Requester:</span>
                            <span className="font-bold text-slate-900">{schedule.requester_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600 font-semibold">Ceremony:</span>
                            <span className="font-bold text-slate-900">{schedule.title}</span>
                        </div>
                    </div>

                    {/* OR Number with Dropdown Mode */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Official Receipt (OR) Number: *
                            </label>
                            {/* Dropdown mode selector */}
                            <select
                                value={orMode}
                                onChange={(e) => handleOrModeChange(e.target.value as 'auto' | 'manual')}
                                className="text-[11px] font-semibold bg-slate-100 border border-slate-300 rounded-lg px-2 py-0.5 text-slate-700 focus:outline-none focus:border-amber-500"
                            >
                                <option value="auto">Auto-Generated System OR</option>
                                <option value="manual">Manual Entry (Paper Booklet)</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                value={orNumber}
                                onChange={(e) => setOrNumber(e.target.value)}
                                placeholder={orMode === 'auto' ? suggestedOrNumber : 'Type paper receipt serial # (e.g. OR-1042)'}
                                required
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Amount & Date Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                Amount Paid (₱): *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">₱</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                Date of Payment: *
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Received By Field (with Dropdown Option) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Received By (Cashier / Scribe): *
                            </label>
                            <select
                                value={receiverMode}
                                onChange={(e) => setReceiverMode(e.target.value as 'current' | 'manual')}
                                className="text-[11px] font-semibold bg-slate-100 border border-slate-300 rounded-lg px-2 py-0.5 text-slate-700 focus:outline-none focus:border-amber-500"
                            >
                                <option value="current">Current Account ({defaultStaffName})</option>
                                <option value="manual">Manual Entry (Type name)</option>
                            </select>
                        </div>
                        {receiverMode === 'manual' ? (
                            <div className="relative">
                                <PenLine className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    value={customReceiver}
                                    onChange={(e) => setCustomReceiver(e.target.value)}
                                    placeholder="Enter full name of staff who received payment (e.g. Elsie Balita)"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold">
                                <User className="w-4 h-4 text-slate-500 shrink-0" />
                                <span>{defaultStaffName}</span>
                            </div>
                        )}
                    </div>

                    {/* Optional Remarks */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                            Remarks / Notes:
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Paid in cash at parish office"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{processing ? 'Recording...' : 'Confirm Cash Payment'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}