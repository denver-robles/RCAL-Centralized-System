import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Parish } from '@/types';
import {
    Shield,
    FileText,
    Church,
    Building2,
    Lock,
    User,
    Mail,
    Phone,
    CheckSquare,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
} from 'lucide-react';

interface RegisterProps {
    parishes: Parish[];
}

export default function Register({ parishes = [] }: RegisterProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        home_parish_id: parishes.length > 0 ? parishes[0].id : '',
        password: '',
        password_confirmation: '',
        privacy_consent: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
            <Head title="Parishioner Registration — Roman Catholic Archdiocese of Lipa" />

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
            <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden py-8 sm:py-12">
                {/* Church Background Artwork */}
                <img
                    src="/images/church.png"
                    alt="Cathedral Background"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                {/* Liturgical Marian Dark Overlay */}
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px]" />

                <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
                    {/* Left Canvas: Floating Crisp White Registration Card */}
                    <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl p-7 sm:p-9 border border-slate-100 flex flex-col items-center shrink-0">
                        {/* Circular Archdiocese Seal */}
                        <img
                            src="/images/logo.png"
                            alt="Archdiocese Seal"
                            className="w-14 h-14 object-contain rounded-full shadow-xs border border-amber-300"
                        />

                        {/* Pill Chip */}
                        <div className="mt-2.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wider uppercase border border-emerald-200">
                            Parishioner Registration • RA 10173 Protected
                        </div>

                        {/* Heading & Subtitle */}
                        <div className="text-center mt-3 mb-5">
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-wide uppercase">
                                Create Parishioner Account
                            </h3>
                            <p className="text-slate-500 text-xs mt-1 max-w-md leading-relaxed">
                                Register your profile to request church certificates, track canonical records, and schedule parish sacraments online.
                            </p>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={submit} className="w-full space-y-3.5">
                            {/* Full Name Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        First Name: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        placeholder="e.g. Maria Clara"
                                        className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                    {errors.first_name && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.first_name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Last Name: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        placeholder="e.g. Santos"
                                        className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                    {errors.last_name && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.last_name}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                    Middle Name / Maiden Name: <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.middle_name}
                                    onChange={(e) => setData('middle_name', e.target.value)}
                                    placeholder="e.g. De los Reyes"
                                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                />
                                {errors.middle_name && (
                                    <p className="text-rose-600 text-xs mt-1">{errors.middle_name}</p>
                                )}
                            </div>

                            {/* Contact Details Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Email Address: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="e.g. maria.santos@email.ph"
                                        className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                    {errors.email && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.email}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Mobile Phone Number: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="0917 123 4567"
                                        className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                    {errors.phone && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.phone}</p>
                                    )}
                                </div>
                            </div>

                            {/* Preferred / Home Parish Dropdown */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                    Home / Registered Parish: <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={data.home_parish_id}
                                    onChange={(e) => setData('home_parish_id', Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                >
                                    <option value="" disabled>Select your preferred parish</option>
                                    {parishes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.municipality || p.city_municipality ? `(${p.municipality || p.city_municipality})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.home_parish_id && (
                                    <p className="text-rose-600 text-xs mt-1">{errors.home_parish_id}</p>
                                )}
                            </div>

                            {/* Passwords Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Password (min. 8 chars): <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full pl-3.5 pr-12 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-3 sm:top-3.5 text-xs text-slate-500 hover:text-slate-800 font-semibold select-none"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.password}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Confirm Password: <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full pl-3.5 pr-12 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-3 sm:top-3.5 text-xs text-slate-500 hover:text-slate-800 font-semibold select-none"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Mandatory RA 10173 Data Privacy Consent Checkbox */}
                            <div className="pt-2">
                                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={data.privacy_consent}
                                        onChange={(e) => setData('privacy_consent', e.target.checked)}
                                        className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 shrink-0"
                                    />
                                    <span className="leading-relaxed">
                                        I consent to the collection and canonical processing of my personal details in compliance with{' '}
                                        <strong className="text-slate-900">Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and the Archdiocesan Sacramental Registry guidelines.{' '}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setPrivacyModalOpen(true);
                                            }}
                                            className="text-amber-600 underline hover:text-amber-700 font-semibold"
                                        >
                                            Read policy
                                        </button>
                                    </span>
                                </label>
                                {errors.privacy_consent && (
                                    <p className="text-rose-600 text-xs mt-1">{errors.privacy_consent}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full mt-3 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                            >
                                {processing ? 'Registering Account...' : 'Create Parishioner Account'}
                            </button>
                        </form>

                        {/* Sign In Link */}
                        <div className="w-full mt-5 pt-4 border-t border-slate-100 text-center">
                            <p className="text-xs text-slate-600">
                                Already registered as a parishioner?{' '}
                                <Link
                                    href="/login"
                                    className="text-amber-600 hover:text-amber-700 font-bold hover:underline"
                                >
                                    Sign In to Portal
                                </Link>
                            </p>
                        </div>
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
                            <span className="block text-white">Join our connected</span>
                            <span className="block text-amber-400 mt-1">parish community.</span>
                        </h1>

                        {/* Mission Description */}
                        <p className="text-slate-200 text-sm leading-relaxed max-w-xl mt-4">
                            Registering as a verified parishioner grants you direct self-service access to official church records, appointment scheduling, and certified document requests across all parishes in Batangas.
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
                                        Your identity and sacramental history are protected under Philippine privacy statutes and ecclesiastical confidentiality.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        Online Certified Copies
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Request baptismal, confirmation, marriage, and burial certificates with automated tracking and verification seals.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        Province-Wide Parish Network
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Seamlessly connected across all 7 Vicariates and parishes under the Roman Catholic Archdiocese of Lipa.
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

            {/* Privacy Policy Modal */}
            {privacyModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                    onClick={() => setPrivacyModalOpen(false)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-amber-600" />
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    RA 10173 Data Privacy Policy
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPrivacyModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="text-xs text-slate-600 space-y-2.5 max-h-72 overflow-y-auto pr-2 leading-relaxed">
                            <p>
                                The <strong>Roman Catholic Archdiocese of Lipa (RCAL)</strong> respects your privacy and is committed to protecting your personal information pursuant to the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and the <strong>Code of Canon Law (Can. 535)</strong>.
                            </p>
                            <p>
                                <strong>Information Collected:</strong> Name, contact telephone, email address, home parish, and sacramental details necessary to issue certified ecclesiastical certificates.
                            </p>
                            <p>
                                <strong>Purpose:</strong> Your data is utilized strictly for authentication, record search verification, appointment scheduling, and Archdiocesan Curia notifications.
                            </p>
                            <p>
                                <strong>Confidentiality:</strong> Records are guarded under strict ecclesiastical secrecy. Canonical entries are immutable and never disclosed to unauthorized third parties without legitimate ecclesiastical interest or judicial order.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setPrivacyModalOpen(false)}
                                className="btn-primary text-xs"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
