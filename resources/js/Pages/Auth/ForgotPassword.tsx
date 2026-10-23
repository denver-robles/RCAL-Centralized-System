import React from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Shield,
    Church,
    Mail,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    KeyRound,
    ExternalLink,
} from 'lucide-react';

export default function ForgotPassword() {
    const { flash } = usePage<PageProps & { flash: { reset_url?: string } }>().props;

    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Forgot Password — Roman Catholic Archdiocese of Lipa" />

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

                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                </Link>
            </header>

            {/* Main Stage with Church Interior Backdrop */}
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

                    <div className="mt-3 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-xs tracking-wide uppercase border border-amber-200">
                        Self-Service Recovery
                    </div>

                    <div className="text-center mt-4 mb-6">
                        <h1 className="font-serif font-bold text-slate-900 text-xl sm:text-2xl tracking-tight">
                            Password Recovery
                        </h1>
                        <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                            Enter your registered email address or account username. We'll generate a secure reset link so you can recover access immediately.
                        </p>
                    </div>

                    {flash?.status && (
                        <div className="w-full mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-sm">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                            <div className="leading-relaxed">
                                <span className="font-semibold block">{flash.status}</span>
                            </div>
                        </div>
                    )}

                    {flash?.reset_url && (
                        <div className="w-full mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-slate-800 text-sm space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-sm">
                                <KeyRound className="w-4 h-4 text-amber-600" />
                                <span>Direct Recovery Link Generated:</span>
                            </div>
                            <p className="text-xs text-slate-600">
                                For immediate recovery without waiting for email relay:
                            </p>
                            <a
                                href={flash.reset_url}
                                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition shadow-xs"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Proceed to Reset Password Now
                            </a>
                        </div>
                    )}

                    {errors.email && (
                        <div className="w-full mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{errors.email}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="w-full space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                Account Email or Username:
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="e.g. maria.santos@email.ph or username"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wide rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                        >
                            {processing ? 'Generating Recovery Link...' : 'Send Password Recovery Link'}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-100 w-full text-center">
                        <Link
                            href="/login"
                            className="text-sm text-amber-700 hover:text-amber-800 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Remember your password? Sign in</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
