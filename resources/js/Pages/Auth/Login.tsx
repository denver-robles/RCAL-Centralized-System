import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Shield,
    FileText,
    Church,
    Building2,
    User,
    Lock,
    AlertCircle,
    X,
} from 'lucide-react';

export default function Login() {
    const { flash } = usePage<PageProps>().props;
    const [activeTab, setActiveTab] = useState<'parishioner' | 'staff'>('parishioner');
    const [showPassword, setShowPassword] = useState(false);
    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(true);

    const { data, setData, post, processing, errors, reset } = useForm({
        identifier: '',
        password: '',
        remember: true,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setForgotModalOpen(false);
                setTermsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Sign In — Roman Catholic Archdiocese of Lipa" />

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
                    href="/"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-xs"
                >
                    <span>← Return to Home</span>
                </Link>
            </header>

            {/* Main Stage with Church Interior Artwork Backdrop */}
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden">
                {/* Church Background Artwork */}
                <img
                    src="/images/church.png"
                    alt="Cathedral Background"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                {/* Liturgical Marian Dark Overlay */}
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />

                <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 lg:py-12 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
                    {/* Left Canvas: Floating Crisp White Card */}
                    <div className="w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-7 sm:p-8 border border-slate-100 flex flex-col items-center shrink-0">
                        {/* Circular Archdiocese Seal */}
                        <img
                            src="/images/logo.png"
                            alt="Archdiocese Seal"
                            className="w-14 h-14 object-contain rounded-full shadow-xs border border-amber-300"
                        />

                        {/* Pill Chip */}
                        <div className="mt-2.5 px-3 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] tracking-wider uppercase border border-purple-200/60">
                            Secure Authentication
                        </div>

                        {/* Dual-Tab Segmented Switcher */}
                        <div className="mt-4 w-full bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('parishioner')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                    activeTab === 'parishioner'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <User className="w-3.5 h-3.5 text-indigo-700" />
                                <span>Parishioner Portal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('staff')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                    activeTab === 'staff'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                                <span>Staff & Chancery</span>
                            </button>
                        </div>

                        {/* Flash / Status Alert Banner */}
                        {flash?.success && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center shadow-2xs">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center shadow-2xs">
                                {flash.error}
                            </div>
                        )}
                        {errors.identifier && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs shadow-2xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{errors.identifier}</span>
                            </div>
                        )}

                        {/* Heading & Subtitle */}
                        <div className="text-center mt-5 mb-4">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-wide uppercase">
                                {activeTab === 'parishioner'
                                    ? 'Parishioner Portal Sign In'
                                    : 'Staff & Chancery Sign In'}
                            </h3>
                            <p className="text-slate-500 text-xs mt-1 max-w-xs leading-relaxed">
                                {activeTab === 'parishioner'
                                    ? 'Access your sacramental certificates, document claims, and schedule appointments.'
                                    : 'Enter your canonical credentials to manage parish registers and appointments.'}
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={submit} className="w-full space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
                                    {activeTab === 'parishioner'
                                        ? 'Registered Email or Username:'
                                        : 'Staff / Clergy Identifier:'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.identifier}
                                    onChange={(e) => setData('identifier', e.target.value)}
                                    placeholder={
                                        activeTab === 'parishioner'
                                            ? 'e.g. maria.santos@email.ph'
                                            : 'e.g. fr.reyes or chancery.admin'
                                    }
                                    className="w-full px-4 py-3.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-1.5">
                                    Password:
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full pl-4 pr-16 py-3.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-3.5 text-xs text-slate-500 hover:text-slate-800 font-semibold select-none"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.password}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                                    />
                                    <span>Remember me</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setForgotModalOpen(true)}
                                    className="text-amber-600 hover:text-amber-700 font-semibold hover:underline text-xs"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="flex items-start gap-2 text-xs pt-1">
                                <input
                                    id="terms_accepted"
                                    type="checkbox"
                                    required
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 mt-0.5"
                                />
                                <label htmlFor="terms_accepted" className="text-slate-600 text-[11px] leading-tight select-none cursor-pointer">
                                    I accept the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setTermsModalOpen(true)}
                                        className="text-amber-600 hover:text-amber-700 font-semibold underline"
                                    >
                                        Terms and Conditions
                                    </button>{' '}
                                    and Archdiocesan Privacy Policy (RA 10173).
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !termsAccepted}
                                className="w-full mt-2 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                            >
                                {processing
                                    ? 'Authenticating...'
                                    : activeTab === 'parishioner'
                                    ? 'Sign In to Parishioner Portal'
                                    : 'Sign In as Diocesan Staff'}
                            </button>
                        </form>

                        {/* Bottom Action Callout */}
                        {activeTab === 'parishioner' ? (
                            <div className="w-full mt-5 bg-amber-50/40 border border-amber-300 rounded-2xl p-4 text-center space-y-2 hover:-translate-y-0.5 transition-all duration-200">
                                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                                    Don't have a parishioner account yet?
                                </h4>
                                <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed">
                                    Register to request certificates and schedule sacraments online.
                                </p>
                                <Link
                                    href="/register"
                                    className="block w-full py-2.5 bg-white border border-amber-400 hover:bg-amber-50 text-slate-900 font-bold rounded-xl text-xs sm:text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-xs"
                                >
                                    + Sign Up / Register an Account
                                </Link>
                            </div>
                        ) : (
                            <div className="w-full mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-1.5 hover:-translate-y-0.5 transition-all duration-200">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                    Archdiocesan Curia Staff Support
                                </h4>
                                <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed">
                                    Parish staff and clergy credentials are provisioned by the Chancery.
                                </p>
                                <div className="text-amber-800 font-mono text-[11px] sm:text-xs font-semibold pt-0.5">
                                    Chancery Hotline: (043) 756-2572
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Canvas: Liturgical Archdiocesan Hero Presentation */}
                    <div className="w-full lg:max-w-xl text-left text-white py-4">
                        {/* Chancery Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-5 backdrop-blur-md shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                            <Church className="w-4 h-4 text-amber-400" />
                            <span>Archdiocese of Lipa • Chancery • Est. 1810</span>
                        </div>

                        {/* Big Headline */}
                        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                            <span className="block text-white">Faithful records.</span>
                            <span className="block text-amber-400 mt-1">Connected service.</span>
                        </h1>

                        {/* Mission Description */}
                        <p className="text-slate-200 text-sm leading-relaxed max-w-xl mt-4">
                            A centralized canonical records management platform serving our parishioners, clergy, and parish communities with integrity, modern security, and ecclesiastical fidelity.
                        </p>

                        {/* Three Translucent Glass Cards */}
                        <div className="mt-6 space-y-3">
                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        RA 10173 & Canon Law Protected
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        End-to-end data privacy compliant with strict sacramental confidentiality standards.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        Official Sacramental Registers
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Canonical certificates for Baptism, Confirmation, Matrimony, and Christian Burial.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        Diocesan-Wide Parish Network
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Connecting parishes, vicariates, and the Archdiocesan Chancery in Lipa City.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Motto Footer */}
                        <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/95 font-serif italic">
                            <span className="font-bold text-amber-400">†</span>
                            <span>"Ut unum sint" — "That they may all be one" • In faithful service of the Church</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {forgotModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setForgotModalOpen(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="font-serif font-bold text-base text-slate-900">
                                Password Recovery Assistance
                            </h3>
                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            {activeTab === 'staff'
                                ? 'Chancery and Parish Staff accounts are provisioned and reset directly by the Archdiocesan Curia System Administrator.'
                                : 'Parishioner password resets are processed by the parish administration office.'}
                        </p>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-700 space-y-1">
                            <strong className="text-amber-900 font-bold block">Chancery Curia Support Hotline:</strong>
                            <p className="font-mono text-slate-800">(043) 756-2572 • chancery@archdioceselipa.ph</p>
                            <span className="text-[11px] text-slate-500 block">Monday to Friday: 8:00 AM – 5:00 PM</span>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(false)}
                                className="btn-primary text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms and Conditions & Privacy Policy Modal */}
            {termsModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setTermsModalOpen(false)}
                >
                    <div
                        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    Terms and Conditions & Archdiocesan Privacy Policy
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Roman Catholic Archdiocese of Lipa • Centralized Records & Chancery System (RCAL PIMS)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTermsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed max-h-[60vh]">
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                                <h4 className="font-bold text-amber-900 text-xs">
                                    1. Institutional Purpose & Canonical Governance
                                </h4>
                                <p className="text-slate-700">
                                    This platform is the official centralized repository of canonical and sacramental registries for the Archdiocese of Lipa. Use of this system is governed by the 1983 Code of Canon Law (specifically Canons 535 and 486–491 regarding parish registers and diocesan archives) and relevant pastoral norms.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-xs">
                                    2. Data Privacy Act of 2012 (Republic Act No. 10173) Adherence
                                </h4>
                                <p>
                                    All personal data and sensitive personal information collected, processed, and maintained in this portal are treated with the highest standard of confidentiality. Data is strictly utilized for canonical verification, ecclesiastical certification, sacramental scheduling, and legitimate church administration.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-xs">
                                    3. User Responsibilities & Authentication Security
                                </h4>
                                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                    <li>Users are responsible for safeguarding their login credentials and preventing unauthorized access.</li>
                                    <li>Any document claim filed must belong to the record owner or an authorized representative recognized under canon and civil law.</li>
                                    <li>Falsification of sacramental requests or impersonation is subject to canonical penalties and civil prosecution under Philippine law.</li>
                                </ul>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-xs">
                                    4. Official Certificate Issuance & Immutability
                                </h4>
                                <p>
                                    Canonical register entries are permanent and strictly immutable. Certificates generated through this portal receive tamper-evident verification tokens and official Archdiocesan dry seal verification prior to physical or digital release.
                                </p>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                                For inquiries or data privacy concerns, contact the Archdiocesan Data Protection Office at:
                                <span className="font-mono text-slate-700 block mt-0.5">dpo@archdioceselipa.ph • (043) 756-2572</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
                            <span className="text-[11px] text-slate-500">Effective Date: October 2026</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTermsAccepted(true);
                                        setTermsModalOpen(false);
                                    }}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs"
                                >
                                    I Agree & Accept Terms
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
