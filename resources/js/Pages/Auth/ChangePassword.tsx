import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Shield,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    KeyRound,
} from 'lucide-react';

export default function ChangePassword() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/change-password', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Set Required Password — Roman Catholic Archdiocese of Lipa" />

            {/* Top Navigation Bar */}
            <header className="h-16 bg-[#0a0f1d] border-b-2 border-amber-500 px-4 sm:px-8 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <img
                        src="/images/logo.png"
                        alt="Archdiocese of Lipa Logo"
                        className="w-9 h-9 object-contain rounded-full shadow-xs"
                    />
                    <div>
                        <h2 className="text-white font-bold text-xs sm:text-sm tracking-wide uppercase leading-tight">
                            Archdiocese of Lipa
                        </h2>
                        <p className="text-slate-300 text-xs">
                            Centralized Records & Chancery System
                        </p>
                    </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>First Login Security Check</span>
                </div>
            </header>

            {/* Main Stage */}
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden p-4 sm:p-6">
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6 sm:p-8">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-600 shadow-inner">
                            <KeyRound className="w-6 h-6" />
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-slate-950">
                            Set New Password
                        </h1>
                        <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                            For Archdiocesan security compliance, please set your personal password before accessing records.
                        </p>
                    </div>

                    {errors.password && (
                        <div className="w-full mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{errors.password}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 text-sm transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 text-sm transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50"
                            >
                                {processing ? 'Updating Password...' : 'Save & Continue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
