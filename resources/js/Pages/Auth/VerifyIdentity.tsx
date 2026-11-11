import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import VerifyIdButton from '@/Components/VerifyIdButton';
import {
    ShieldCheck,
    CheckCircle2,
    Lock,
    Church,
    ArrowRight,
    FileText,
    Camera,
    Sparkles,
} from 'lucide-react';

interface Props extends PageProps {
    status?: string;
}

export default function VerifyIdentity({ auth, status = 'unverified' }: Props) {
    const user = auth.user;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Verify Government ID — Archdiocese of Lipa" />

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
                    <span>Skip to Portal Dashboard →</span>
                </Link>
            </header>

            {/* Main Content Stage */}
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden py-10 px-4 sm:px-6">
                {/* Church Background Artwork */}
                <img
                    src="/images/church.png"
                    alt="Cathedral Interior"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" />

                <div className="max-w-2xl w-full mx-auto relative z-10">
                    <div className="bg-white rounded-[28px] shadow-2xl p-7 sm:p-10 border border-slate-100 flex flex-col items-center">
                        {/* Archdiocese Seal */}
                        <div className="relative mb-2">
                            <img
                                src="/images/logo.png"
                                alt="Archdiocese Seal"
                                className="w-16 h-16 object-contain rounded-full shadow-xs border-2 border-amber-400"
                            />
                            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 rounded-full text-white shadow-xs">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Onboarding Step Chip */}
                        <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs tracking-wide uppercase mb-3 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Onboarding Step 2 of 2 • Identity Verification</span>
                        </div>

                        {/* Heading & Subtitle */}
                        <h1 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 text-center tracking-tight">
                            Verify Your Identity
                        </h1>
                        <p className="text-slate-600 text-sm text-center mt-2 max-w-lg leading-relaxed">
                            Welcome, <strong className="text-slate-900">{user?.display_name || user?.username}</strong>. Under{' '}
                            <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and Code of Canon Law (Can. 535), official church certificate issuance requires verification of the requester's legitimate identity.
                        </p>

                        {/* Informational Feature Cards */}
                        <div className="w-full my-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">Valid Photo ID</h4>
                                <p className="text-slate-600 text-xs mt-1 leading-tight">
                                    Passport, PhilID, Driver's License, or UMID
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">Quick Selfie</h4>
                                <p className="text-slate-600 text-xs mt-1 leading-tight">
                                    Instant biometric match to prevent fraudulent claims
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">Stripe Protected</h4>
                                <p className="text-slate-600 text-xs mt-1 leading-tight">
                                    End-to-end 256-bit TLS bank-grade encryption
                                </p>
                            </div>
                        </div>

                        {/* Interactive Verification Button */}
                        <div className="w-full flex flex-col items-center justify-center pt-2">
                            <VerifyIdButton
                                buttonText="Verify with Stripe Identity"
                                loadingText="Connecting to Stripe Identity..."
                                variant="amber"
                                className="w-full sm:w-auto px-8 py-3.5 text-sm uppercase tracking-wide text-center"
                            />

                            <div className="mt-4 flex flex-col items-center gap-2">
                                <Link
                                    href="/portal/dashboard"
                                    className="text-sm text-slate-600 hover:text-slate-900 underline font-medium transition"
                                >
                                    I'll verify later — Proceed to Parishioner Dashboard
                                </Link>
                                <span className="text-xs text-slate-500">
                                    You can initiate verification at any time from your portal dashboard.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
