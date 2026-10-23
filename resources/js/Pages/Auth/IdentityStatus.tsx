import React, { useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import VerifyIdButton from '@/Components/VerifyIdButton';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ArrowRight,
    RefreshCw,
    Church,
} from 'lucide-react';

interface Props extends PageProps {
    status: 'verified' | 'pending' | 'requires_input' | 'unverified' | string;
}

export default function IdentityStatus({ auth, status = 'unverified' }: Props) {
    const user = auth.user;

    // Optional polling: if status is pending, check again after 4 seconds
    useEffect(() => {
        if (status === 'pending') {
            const timer = setTimeout(() => {
                router.reload({ only: ['status', 'auth'] });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Verification Status — Archdiocese of Lipa" />

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
                    href="/portal/dashboard"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-xs"
                >
                    <span>Go to Dashboard →</span>
                </Link>
            </header>

            {/* Main Stage */}
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden py-10 px-4 sm:px-6">
                <img
                    src="/images/church.png"
                    alt="Cathedral Background"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" />

                <div className="max-w-xl w-full mx-auto relative z-10">
                    <div className="bg-white rounded-[28px] shadow-2xl p-7 sm:p-10 border border-slate-100 flex flex-col items-center text-center">
                        {/* Status Icon Presentation */}
                        {status === 'verified' && (
                            <>
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
                                    <ShieldCheck className="w-9 h-9" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wide mb-2">
                                    Identity Verified
                                </div>
                                <h1 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                                    Verification Successful
                                </h1>
                                <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-md">
                                    Thank you, <strong className="text-slate-900">{user?.display_name || user?.username}</strong>. Your government-issued ID has been verified by Stripe. You now have full clearance to request certified church certificates and manage sacramental appointments.
                                </p>
                                <div className="mt-7 w-full flex flex-col items-center gap-3">
                                    <Link
                                        href="/portal/dashboard"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm uppercase tracking-wide shadow-md transition-all"
                                    >
                                        <span>Proceed to Parishioner Dashboard</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/portal/requests/create"
                                        className="text-sm text-amber-700 hover:text-amber-800 font-semibold hover:underline"
                                    >
                                        File a Church Document Claim Now →
                                    </Link>
                                </div>
                            </>
                        )}

                        {status === 'pending' && (
                            <>
                                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 ring-8 ring-amber-50">
                                    <Clock className="w-9 h-9 animate-pulse" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wide mb-2">
                                    Processing Review
                                </div>
                                <h1 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                                    Verification In Progress
                                </h1>
                                <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-md">
                                    Stripe is processing your submitted verification documents and photo match. This page will automatically update once verified, or you may return to your dashboard in the meantime.
                                </p>
                                <div className="mt-7 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.reload({ only: ['status', 'auth'] })}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Refresh Status</span>
                                    </button>
                                    <Link
                                        href="/portal/dashboard"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                                    >
                                        <span>Go to Dashboard</span>
                                    </Link>
                                </div>
                            </>
                        )}

                        {status === 'requires_input' && (
                            <>
                                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50">
                                    <ShieldAlert className="w-9 h-9" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wide mb-2">
                                    Requires Attention
                                </div>
                                <h1 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                                    Verification Needs Review
                                </h1>
                                <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-md">
                                    Stripe was unable to verify the document provided (e.g. glare, blurry photo, unreadable text, or expired document). Please take a clear photo of an official valid government ID and try again.
                                </p>
                                <div className="mt-7 w-full flex flex-col items-center gap-3">
                                    <VerifyIdButton
                                        buttonText="Retry Stripe Verification"
                                        variant="amber"
                                        className="w-full sm:w-auto px-6 py-3"
                                    />
                                    <Link
                                        href="/portal/dashboard"
                                        className="text-sm text-slate-600 hover:text-slate-900 underline transition"
                                    >
                                        Return to Parishioner Dashboard
                                    </Link>
                                </div>
                            </>
                        )}

                        {status === 'unverified' && (
                            <>
                                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-4 ring-8 ring-slate-50">
                                    <Shield className="w-9 h-9" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wide mb-2">
                                    Unverified Account
                                </div>
                                <h1 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                                    Identity Not Verified Yet
                                </h1>
                                <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-md">
                                    Verify your identity with an official government-issued ID to enable certified document requests and full archdiocesan portal features.
                                </p>
                                <div className="mt-7 w-full flex flex-col items-center gap-3">
                                    <VerifyIdButton
                                        buttonText="Verify Government ID"
                                        variant="amber"
                                        className="w-full sm:w-auto px-6 py-3"
                                    />
                                    <Link
                                        href="/portal/dashboard"
                                        className="text-sm text-slate-600 hover:text-slate-900 underline transition"
                                    >
                                        Skip to Dashboard
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
