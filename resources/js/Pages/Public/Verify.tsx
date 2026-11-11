import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ShieldCheck,
    AlertCircle,
    Church,
    CheckCircle2,
    Calendar,
    BookOpen,
    FileCheck,
    ArrowLeft,
    ExternalLink,
} from 'lucide-react';

interface CertificateDetails {
    valid: boolean;
    certificate_number: string;
    sacrament: string;
    recipient_name: string;
    parish: string;
    event_date: string;
    citation: string;
    issued_at: string;
}

interface Props {
    valid: boolean;
    certificate?: CertificateDetails | null;
    token: string;
}

export default function Verify({ valid, certificate, token }: Props) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Official Certificate Verification — Roman Catholic Archdiocese of Lipa" />

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
                            Canonical Certificate Verification Registry
                        </p>
                    </div>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Archdiocese Portal</span>
                </Link>
            </header>

            {/* Main Stage */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
                    {/* Header Banner */}
                    <div className={`p-6 sm:p-8 text-center border-b ${valid ? 'bg-emerald-50/70 border-emerald-100' : 'bg-rose-50/70 border-rose-100'}`}>
                        {valid ? (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <ShieldCheck className="w-9 h-9" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Authentic Canonical Record
                                </span>
                                <h1 className="font-serif text-2xl font-bold text-slate-950">
                                    Official Certificate Verified
                                </h1>
                                <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                                    This document is officially registered with the Roman Catholic Archdiocese of Lipa Chancery Curia and conforms with Canon 535.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <AlertCircle className="w-9 h-9" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs uppercase tracking-wider mb-2">
                                    Verification Failed
                                </span>
                                <h1 className="font-serif text-2xl font-bold text-slate-950">
                                    Unrecognized Certificate Token
                                </h1>
                                <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                                    No issued archival record matches the provided cryptographic token. Please check the QR code or verify directly with the parish of origin.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Certificate Details */}
                    {valid && certificate && (
                        <div className="p-6 sm:p-8 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Certificate Number
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">
                                        {certificate.certificate_number}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Sacrament Type
                                    </span>
                                    <span className="font-semibold text-slate-900 text-sm">
                                        {certificate.sacrament}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl sm:col-span-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Recipient Name (RA 10173 Protected)
                                    </span>
                                    <span className="font-bold text-slate-950 text-base">
                                        {certificate.recipient_name}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Originating Parish
                                    </span>
                                    <span className="font-medium text-slate-900 text-sm">
                                        {certificate.parish}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Sacrament Date
                                    </span>
                                    <span className="font-medium text-slate-900 text-sm">
                                        {certificate.event_date || 'N/A'}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl sm:col-span-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Canonical Citation Handle
                                    </span>
                                    <span className="font-mono font-semibold text-slate-900 text-xs">
                                        {certificate.citation}
                                    </span>
                                </div>
                            </div>

                            {/* Cryptographic Token Details */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                <span className="truncate max-w-[280px]">Token: {token}</span>
                                <span>{certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : ''}</span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200/80 text-center">
                        <p className="text-[11px] text-slate-500">
                            Archdiocese of Lipa Chancery Curia • 2026 Canonical Public Registry • RA 10173 Protected
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
