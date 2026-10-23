import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Shield,
    FileText,
    Church,
    Building2,
    User,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    KeyRound,
    ExternalLink,
    X,
    Mail,
    ScanFace,
    Camera,
    VideoOff,
    Loader2,
} from 'lucide-react';
import BiometricLivenessScanner from '@/Components/BiometricLivenessScanner';

export default function Login() {
    const { flash } = usePage<PageProps & { flash: { reset_url?: string } }>().props;
    const [activeTab, setActiveTab] = useState<'parishioner' | 'staff'>('parishioner');
    const [showPassword, setShowPassword] = useState(false);
    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [termsError, setTermsError] = useState(false);

    // Main Login Form
    const { data, setData, post, processing, errors, reset } = useForm({
        identifier: '',
        password: '',
        remember: false,
    });

    // In-Modal Self-Service Password Reset Form
    const forgotForm = useForm({
        email: '',
    });

    // Face++ Biometric Recognition State
    const [loginMode, setLoginMode] = useState<'password' | 'face'>('password');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [faceProcessing, setFaceProcessing] = useState(false);
    const [faceIdentifier, setFaceIdentifier] = useState('');

    const handleLivenessCapture = useCallback(
        (base64Image: string) => {
            if (!termsAccepted) {
                setTermsError(true);
                return;
            }
            setTermsError(false);

            const idToUse = (faceIdentifier || data.identifier || '').trim();
            if (!idToUse) {
                setCameraError('Please enter your account email or username above to authenticate.');
                return;
            }

            setFaceProcessing(true);
            setCameraError(null);

            const cleanImage = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

            router.post(
                '/login/face',
                {
                    email: idToUse,
                    captured_image: cleanImage,
                },
                {
                    onFinish: () => {
                        setFaceProcessing(false);
                    },
                    onError: (pageErrors: any) => {
                        setFaceProcessing(false);
                        if (pageErrors.captured_image) {
                            setCameraError(pageErrors.captured_image);
                        } else if (pageErrors.email) {
                            setCameraError(pageErrors.email);
                        } else {
                            setCameraError('Face biometric authentication failed.');
                        }
                    },
                }
            );
        },
        [termsAccepted, faceIdentifier, data.identifier]
    );

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
        if (!termsAccepted) {
            setTermsError(true);
            return;
        }
        setTermsError(false);
        router.post('/login', data, {
            replace: true,
            onFinish: () => reset('password'),
        });
    };

    const handleForgotSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        forgotForm.post('/forgot-password', {
            preserveScroll: true,
            preserveState: true,
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
                        <p className="text-slate-300 text-xs">
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
                    <div className="w-full max-w-[430px] bg-white rounded-[28px] shadow-2xl p-7 sm:p-8 border border-slate-100 flex flex-col items-center shrink-0 transition-all duration-200">
                        {/* Circular Archdiocese Seal */}
                        <img
                            src="/images/logo.png"
                            alt="Archdiocese Seal"
                            className="w-14 h-14 object-contain rounded-full shadow-xs border border-amber-300"
                        />

                        {/* Pill Chip */}
                        <div className="mt-2.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs tracking-wide uppercase border border-purple-200/60">
                            Secure Authentication
                        </div>

                        {/* Dual-Tab Segmented Switcher */}
                        <div className="mt-4 w-full bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setActiveTab('parishioner')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                    activeTab === 'parishioner'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold ring-1 ring-slate-900/5'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                            >
                                <User className={`w-4 h-4 transition-colors ${activeTab === 'parishioner' ? 'text-amber-600' : 'text-slate-500'}`} />
                                <span>Parishioner Portal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('staff')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                    activeTab === 'staff'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold ring-1 ring-slate-900/5'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                            >
                                <Building2 className={`w-4 h-4 transition-colors ${activeTab === 'staff' ? 'text-amber-600' : 'text-slate-500'}`} />
                                <span>Staff & Chancery</span>
                            </button>
                        </div>

                        {/* Flash / Status Alert Banner */}
                        {flash?.success && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold text-center shadow-2xs">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium text-center shadow-2xs">
                                {flash.error}
                            </div>
                        )}
                        {errors.identifier && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm shadow-2xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{errors.identifier}</span>
                            </div>
                        )}

                        {/* Heading & Subtitle - Consistent min-height prevents jitter */}
                        <div className="text-center mt-4 mb-4 min-h-[56px] flex flex-col justify-center">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-wide uppercase transition-all duration-150">
                                {activeTab === 'parishioner'
                                    ? 'Parishioner Portal Sign In'
                                    : 'Staff & Chancery Sign In'}
                            </h3>
                            <p className="text-slate-600 text-sm mt-1 max-w-xs leading-relaxed transition-all duration-150">
                                {activeTab === 'parishioner'
                                    ? 'Access your sacramental certificates, document claims, and schedule appointments.'
                                    : 'Enter your canonical credentials to manage parish registers and appointments.'}
                            </p>
                        </div>

                        {/* Login Form: Password vs Face++ Biometric Recognition */}
                        {loginMode === 'password' ? (
                            <form onSubmit={submit} className="w-full space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
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
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                        Password:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full pl-4 pr-11 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                        />
                                        {/* Animated Eye / EyeOff Icon */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4 text-slate-700 transition-transform duration-200" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-slate-400 transition-transform duration-200" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-rose-600 text-xs mt-1 font-medium">{errors.password}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-sm pt-0.5">
                                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                                        />
                                        <span>Remember me</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setForgotModalOpen(true)}
                                        className="text-amber-600 hover:text-amber-700 font-semibold hover:underline text-sm"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Terms and Privacy Checkbox - Unchecked by default */}
                                <div className="flex items-start gap-2 text-sm pt-0.5">
                                    <input
                                        id="terms_accepted"
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => {
                                            setTermsAccepted(e.target.checked);
                                            if (e.target.checked) setTermsError(false);
                                        }}
                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 mt-0.5"
                                    />
                                    <label htmlFor="terms_accepted" className="text-slate-700 text-xs leading-normal select-none cursor-pointer">
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

                                {termsError && (
                                    <p className="text-rose-600 text-xs font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Please accept the Terms & Conditions before signing in.
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={`w-full mt-2 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wide rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 ${
                                        !termsAccepted ? 'opacity-75' : ''
                                    }`}
                                >
                                    {processing
                                        ? 'Authenticating...'
                                        : activeTab === 'parishioner'
                                        ? 'Sign In to Parishioner Portal'
                                        : 'Sign In as Diocesan Staff'}
                                </button>

                                {/* Face++ Biometric Option Divider & Button */}
                                <div className="relative my-2.5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2.5 text-slate-500 text-xs font-bold tracking-wide">
                                            Or Authenticate With
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMode('face');
                                        if (data.identifier) setFaceIdentifier(data.identifier);
                                    }}
                                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-amber-50/60 text-slate-800 hover:text-amber-950 border border-slate-200 hover:border-amber-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 shadow-2xs group"
                                >
                                    <ScanFace className="w-4 h-4 text-amber-600 transition-transform duration-200 group-hover:scale-110" />
                                    <span>Sign In with Face++ Recognition</span>
                                </button>
                            </form>
                        ) : (
                            /* Face++ Hands-Free Biometric Recognition Interface */
                            <div className="w-full space-y-3.5">
                                {/* Mode Header & Back Switcher */}
                                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 uppercase tracking-wide">
                                        <ScanFace className="w-4 h-4 text-amber-600" />
                                        <span>Hands-Free Face Biometric Sign In</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoginMode('password');
                                        }}
                                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
                                    >
                                        Use Password Instead
                                    </button>
                                </div>

                                {/* Email / Username Input */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                        {activeTab === 'parishioner'
                                            ? 'Registered Email or Username:'
                                            : 'Staff / Clergy Identifier:'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={faceIdentifier || data.identifier}
                                        onChange={(e) => {
                                            setFaceIdentifier(e.target.value);
                                            setData('identifier', e.target.value);
                                            if (cameraError) setCameraError(null);
                                        }}
                                        placeholder={
                                            activeTab === 'parishioner'
                                                ? 'e.g. maria.santos@email.ph'
                                                : 'e.g. fr.reyes or chancery.admin'
                                        }
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                                    />
                                </div>

                                {/* Terms and Privacy Checkbox */}
                                <div className="flex items-start gap-2 text-sm pt-0.5">
                                    <input
                                        id="face_terms_accepted"
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => {
                                            setTermsAccepted(e.target.checked);
                                            if (e.target.checked) setTermsError(false);
                                        }}
                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 mt-0.5"
                                    />
                                    <label
                                        htmlFor="face_terms_accepted"
                                        className="text-slate-700 text-xs leading-normal select-none cursor-pointer"
                                    >
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

                                {termsError && (
                                    <p className="text-rose-600 text-xs font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Please accept the Terms & Conditions before signing in.
                                    </p>
                                )}

                                {/* Shared Hands-Free Biometric Liveness Scanner */}
                                <BiometricLivenessScanner
                                    onCapture={handleLivenessCapture}
                                    processing={faceProcessing}
                                    processingMessage="Comparing live biometric scan against registered face reference (Face++)..."
                                    errorMessage={cameraError}
                                    onRetry={() => setCameraError(null)}
                                />
                            </div>
                        )}

                        {/* Bottom Action Callout - Stable Box to Prevent Switcher Layout Shift */}
                        <div className="w-full mt-4 min-h-[120px] flex flex-col justify-center">
                            {activeTab === 'parishioner' ? (
                                <div className="w-full bg-amber-50/50 border border-amber-300/80 rounded-2xl p-4 text-center flex flex-col justify-center space-y-1.5 transition-all duration-200 shadow-2xs">
                                    <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                                        Don't have a parishioner account yet?
                                    </h4>
                                    <p className="text-slate-700 text-xs leading-normal">
                                        Register to request certificates and schedule sacraments online.
                                    </p>
                                    <Link
                                        href="/register"
                                        className="block w-full py-2.5 bg-white border border-amber-400 hover:bg-amber-50 text-slate-900 font-bold rounded-xl text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-2xs"
                                    >
                                        + Sign Up / Register an Account
                                    </Link>
                                </div>
                            ) : (
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center flex flex-col justify-center space-y-1.5 transition-all duration-200 shadow-2xs">
                                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                        Archdiocesan Curia Staff Support
                                    </h4>
                                    <p className="text-slate-700 text-xs leading-normal">
                                        Parish staff and clergy credentials are provisioned by the Chancery.
                                    </p>
                                    <div className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-amber-800 font-mono text-xs font-semibold">
                                        Chancery Hotline: (043) 756-2572
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Canvas: Liturgical Archdiocesan Hero Presentation */}
                    <div className="w-full lg:max-w-xl text-left text-white py-4">
                        {/* Chancery Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-400 text-xs font-semibold tracking-wide uppercase mb-5 backdrop-blur-md shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                            <Church className="w-4 h-4 text-amber-400" />
                            <span>Archdiocese of Lipa • Chancery • Est. 1810</span>
                        </div>

                        {/* Big Headline */}
                        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                            <span className="block text-white">Faithful records.</span>
                            <span className="block text-amber-400 mt-1">Connected service.</span>
                        </h1>

                        {/* Mission Description */}
                        <p className="text-slate-200 text-base leading-relaxed max-w-xl mt-4">
                            A centralized canonical records management platform serving our parishioners, clergy, and parish communities with integrity, modern security, and ecclesiastical fidelity.
                        </p>

                        {/* Three Translucent Glass Cards */}
                        <div className="mt-6 space-y-3">
                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-sm">
                                        RA 10173 & Canon Law Protected
                                    </h3>
                                    <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                                        End-to-end data privacy compliant with strict sacramental confidentiality standards.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-sm">
                                        Official Sacramental Registers
                                    </h3>
                                    <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                                        Canonical certificates for Baptism, Confirmation, Matrimony, and Christian Burial.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 flex items-start gap-3 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                                <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-sm">
                                        Diocesan-Wide Parish Network
                                    </h3>
                                    <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
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

            {/* Self-Service Forgot Password Modal - No Office Visit Needed */}
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
                            <div className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-amber-600" />
                                <h3 className="font-serif font-bold text-lg text-slate-900">
                                    Self-Service Password Recovery
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed">
                            Recover your account password directly online. Enter your registered account email or username below.
                        </p>

                        {flash?.status && (
                            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-emerald-800 text-sm">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                                <span>{flash.status}</span>
                            </div>
                        )}

                        {flash?.reset_url && (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm space-y-2">
                                <span className="font-bold text-amber-900 block">Instant Recovery Link:</span>
                                <a
                                    href={flash.reset_url}
                                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-xs"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Proceed to Reset Password
                                </a>
                            </div>
                        )}

                        <form onSubmit={handleForgotSubmit} className="space-y-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5">
                                    Account Email or Username:
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={forgotForm.data.email}
                                        onChange={(e) => forgotForm.setData('email', e.target.value)}
                                        placeholder="maria.santos@email.ph or username"
                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                                    />
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                </div>
                                {forgotForm.errors.email && (
                                    <p className="text-rose-600 text-xs mt-1">{forgotForm.errors.email}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={forgotForm.processing}
                                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wide rounded-xl shadow-xs transition-all disabled:opacity-60"
                            >
                                {forgotForm.processing ? 'Generating...' : 'Send Recovery Link'}
                            </button>
                        </form>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                            <Link
                                href="/forgot-password"
                                onClick={() => setForgotModalOpen(false)}
                                className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline text-xs"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Full Recovery Page
                            </Link>

                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(false)}
                                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
                            >
                                Close
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
                                <h3 className="font-serif font-bold text-lg text-slate-900">
                                    Terms and Conditions & Archdiocesan Privacy Policy
                                </h3>
                                <p className="text-xs text-slate-600 mt-0.5">
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
                        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed max-h-[60vh]">
                            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
                                <h4 className="font-bold text-amber-950 text-sm">
                                    1. Institutional Purpose & Canonical Governance
                                </h4>
                                <p className="text-slate-800">
                                    This platform is the official centralized repository of canonical and sacramental registries for the Archdiocese of Lipa. Use of this system is governed by the 1983 Code of Canon Law (specifically Canons 535 and 486–491 regarding parish registers and diocesan archives) and relevant pastoral norms.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-sm">
                                    2. Data Privacy Act of 2012 (Republic Act No. 10173) Adherence
                                </h4>
                                <p>
                                    All personal data and sensitive personal information collected, processed, and maintained in this portal are treated with the highest standard of confidentiality. Data is strictly utilized for canonical verification, ecclesiastical certification, sacramental scheduling, and legitimate church administration.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-sm">
                                    3. User Responsibilities & Authentication Security
                                </h4>
                                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                                    <li>Users are responsible for safeguarding their login credentials and preventing unauthorized access.</li>
                                    <li>Any document claim filed must belong to the record owner or an authorized representative recognized under canon and civil law.</li>
                                    <li>Falsification of sacramental requests or impersonation is subject to canonical penalties and civil prosecution under Philippine law.</li>
                                </ul>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-sm">
                                    4. Official Certificate Issuance & Immutability
                                </h4>
                                <p>
                                    Canonical register entries are permanent and strictly immutable. Certificates generated through this portal receive tamper-evident verification tokens and official Archdiocesan dry seal verification prior to physical or digital release.
                                </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                                For inquiries or data privacy concerns, contact the Archdiocesan Data Protection Office at:
                                <span className="font-mono text-slate-800 block mt-0.5 font-medium">dpo@archdioceselipa.ph • (043) 756-2572</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
                            <span className="text-xs text-slate-600">Effective Date: October 2026</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTermsAccepted(true);
                                        setTermsError(false);
                                        setTermsModalOpen(false);
                                    }}
                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-xs"
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
