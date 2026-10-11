import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Shield,
    Church,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    KeyRound,
} from 'lucide-react';

interface Props {
    token: string;
    email?: string;
}

export default function ResetPassword({ token, email = '' }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reset-password', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Reset Password — Roman Catholic Archdiocese of Lipa" />

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
                        <p className="text-slate-400 text-[10px] sm:text-xs">
                            Centralized Records & Chancery System
                        </p>
                    </div>
                </div>

                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                </Link>
            </header>

            {/* Main Stage */}
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden p-4 sm:p-6">
                <img
                    src="/images/church.png"
                    alt="Cathedral Background"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />

                <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 sm:p-9 border border-slate-100 flex flex-col items-center">
                    <img
                        src="/images/logo.png"
                        alt="Archdiocese Seal"
                        className="w-14 h-14 object-contain rounded-full shadow-xs border border-amber-300"
                    />

                    <div className="mt-3 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wider uppercase border border-emerald-200">
                        Create New Password
                    </div>

                    <div className="text-center mt-4 mb-6">
                        <h1 className="font-serif font-bold text-slate-900 text-xl tracking-tight">
                            Reset Account Password
                        </h1>
                        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                            Create a strong, unique password for your canonical account.
                        </p>
                    </div>

                    {errors.email && (
                        <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{errors.email}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="w-full space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
                                Account Email:
                            </label>
                            <input
                                type="email"
                                required
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="name@email.ph"
                                className="w-full px-4 py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
                                New Password:
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    className="w-full pl-4 pr-11 py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4 text-slate-600 transition-all duration-200" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-slate-400 transition-all duration-200" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-rose-600 text-xs mt-1 font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
                                Confirm New Password:
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="Re-enter your new password"
                                    className="w-full pl-4 pr-11 py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-4 h-4 text-slate-600 transition-all duration-200" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-slate-400 transition-all duration-200" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 mt-2"
                        >
                            {processing ? 'Updating Password...' : 'Reset & Save Password'}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-100 w-full text-center">
                        <Link
                            href="/login"
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Return to Sign In</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
