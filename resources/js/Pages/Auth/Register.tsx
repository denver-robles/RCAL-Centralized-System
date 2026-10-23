import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { Parish } from '@/types';
import BiometricLivenessScanner from '@/Components/BiometricLivenessScanner';
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
    UploadCloud,
    Camera,
    ScanFace,
    ArrowRight,
    ArrowLeft,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Calendar,
    Sparkles,
} from 'lucide-react';

interface RegisterProps {
    parishes: Parish[];
}

const PHILIPPINE_IDS = [
    { value: 'philsys_national_id', label: 'PhilSys National ID (PhilID / ePhilID)' },
    { value: 'drivers_license', label: "LTO Driver's License" },
    { value: 'passport', label: 'DFA Philippine Passport' },
    { value: 'umid', label: 'Unified Multi-Purpose ID (UMID)' },
    { value: 'postal_id', label: 'PhilPost Postal ID' },
    { value: 'prc_id', label: 'PRC Professional Identification Card' },
];

export default function Register({ parishes = [] }: RegisterProps) {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    // Password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

    // Step 2: ID Verification State
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [idVerifying, setIdVerifying] = useState(false);
    const [idVerified, setIdVerified] = useState(false);
    const [idOcrText, setIdOcrText] = useState<string>('');
    const [idOcrScanning, setIdOcrScanning] = useState<boolean>(false);
    const [idOcrProgress, setIdOcrProgress] = useState<number>(0);
    const [idDetails, setIdDetails] = useState<{
        extracted_name?: string;
        id_number_masked?: string;
        message?: string;
    } | null>(null);
    const [idError, setIdError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 3: Hands-Free Active Liveness Biometrics State
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [faceVerifying, setFaceVerifying] = useState(false);
    const [faceVerified, setFaceVerified] = useState(false);
    const [faceConfidence, setFaceConfidence] = useState<number | null>(null);
    const [faceError, setFaceError] = useState<string | null>(null);

    // Form Data
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        name_suffix: '',
        date_of_birth: '',
        email: '',
        phone: '',
        home_parish_id: parishes.length > 0 ? parishes[0].id : '',
        password: '',
        password_confirmation: '',
        id_type: 'philsys_national_id',
        id_image: '',
        live_selfie: '',
        privacy_consent: false,
    });

    // Handle ID File Upload with Client-Side OCR scanning
    const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setIdError('Please upload a valid image file (JPG or PNG).');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            setIdError('File size exceeds 8MB limit. Please provide a lighter image.');
            return;
        }

        setIdError(null);
        setIdVerified(false);
        setIdDetails(null);
        setIdOcrText('');
        setFaceVerified(false);
        setSelfiePreview(null);

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setIdPreview(base64);
            setData('id_image', base64);

            // Execute local OCR text extraction in background via Tesseract.js
            setIdOcrScanning(true);
            setIdOcrProgress(10);
            try {
                const { recognize } = await import('tesseract.js');
                const result = await recognize(base64, 'eng');
                const text = result?.data?.text || '';
                setIdOcrText(text);
                setIdOcrProgress(100);
            } catch (ocrErr) {
                console.warn('Local OCR notification:', ocrErr);
            } finally {
                setIdOcrScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // Verify ID via API with OCR matching
    const handleVerifyIdDocument = async () => {
        if (!data.id_image) {
            setIdError('Please select or capture a government ID photo first.');
            return;
        }

        setIdVerifying(true);
        setIdError(null);

        try {
            const response = await axios.post('/register/verify-id', {
                id_image: data.id_image,
                id_type: data.id_type,
                first_name: data.first_name,
                middle_name: data.middle_name,
                last_name: data.last_name,
                ocr_text: idOcrText || undefined,
            });

            if (response.data.success) {
                setIdVerified(true);
                setIdDetails({
                    extracted_name: response.data.extracted_name,
                    id_number_masked: response.data.id_number_masked,
                    message: response.data.message,
                });
            } else {
                setIdError(response.data.error || 'Failed to verify government ID.');
            }
        } catch (err: any) {
            console.error('ID Verification error:', err);
            setIdError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Unable to verify document. Ensure the photo is clear, well-lit, and uncropped.'
            );
        } finally {
            setIdVerifying(false);
        }
    };

    // Compare Live Face with ID photo via Face++
    const handleVerifyFaceBiometrics = async (capturedSelfie?: string) => {
        const selfie = capturedSelfie || data.live_selfie || selfiePreview;
        if (!data.id_image || !selfie) {
            setFaceError('Both Government ID and live webcam selfie are required.');
            return;
        }

        setFaceVerifying(true);
        setFaceError(null);

        try {
            const response = await axios.post('/register/verify-face', {
                id_image: data.id_image,
                live_selfie: selfie,
            });

            if (response.data.matched) {
                setFaceVerified(true);
                setFaceConfidence(response.data.confidence);
            } else {
                setFaceError(
                    response.data.error ||
                    `Biometric match confidence (${response.data.confidence}%) is below required threshold (${response.data.threshold}%).`
                );
            }
        } catch (err: any) {
            console.error('Biometric verification error:', err);
            setFaceError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Face biometric comparison failed. Please retake the photo with front-facing light and no glare.'
            );
        } finally {
            setFaceVerifying(false);
        }
    };

    // Step 1 Validation
    const validateStep1 = () => {
        if (!data.first_name.trim() || !data.last_name.trim()) return false;
        if (!data.email.trim() || !data.phone.trim()) return false;
        if (!data.password || data.password.length < 8) return false;
        if (data.password !== data.password_confirmation) return false;
        return true;
    };

    // Final Form Submission
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
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px]" />

                <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
                    {/* Left Canvas: Floating Multi-Step Registration Wizard */}
                    <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl p-6 sm:p-9 border border-slate-100 flex flex-col items-center shrink-0">
                        {/* Circular Archdiocese Seal */}
                        <img
                            src="/images/logo.png"
                            alt="Archdiocese Seal"
                            className="w-14 h-14 object-contain rounded-full shadow-xs border border-amber-300"
                        />

                        {/* Step Progress Pill */}
                        <div className="mt-2.5 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] tracking-wider uppercase border border-amber-200">
                            <span>Step {currentStep} of 4 • {
                                currentStep === 1 ? 'Canonical Account Details' :
                                currentStep === 2 ? 'Government ID & OCR' :
                                currentStep === 3 ? 'Live Face Biometrics' :
                                'Review & Consent'
                            }</span>
                        </div>

                        {/* 4-Step Wizard Stepper Indicator */}
                        <div className="w-full mt-4 mb-4 grid grid-cols-4 gap-1.5">
                            {[
                                { step: 1, label: 'Details' },
                                { step: 2, label: 'Valid ID' },
                                { step: 3, label: 'Face Scan' },
                                { step: 4, label: 'Submit' },
                            ].map((item) => (
                                <div key={item.step} className="flex flex-col items-center">
                                    <div
                                        className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                                            currentStep >= item.step
                                                ? 'bg-amber-400'
                                                : 'bg-slate-200'
                                        }`}
                                    />
                                    <span
                                        className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
                                            currentStep === item.step
                                                ? 'text-amber-600'
                                                : currentStep > item.step
                                                ? 'text-slate-800'
                                                : 'text-slate-400'
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Heading & Subtitle */}
                        <div className="text-center mb-4">
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-wide uppercase">
                                {currentStep === 1 && 'Create Parishioner Profile'}
                                {currentStep === 2 && 'Government ID & OCR Verification'}
                                {currentStep === 3 && 'Biometric Face Match (Face++)'}
                                {currentStep === 4 && 'Review & Archdiocesan Consent'}
                            </h3>
                            <p className="text-slate-500 text-xs mt-1 max-w-md leading-relaxed">
                                {currentStep === 1 && 'Enter your canonical name and contact credentials as they appear on official records.'}
                                {currentStep === 2 && 'Upload an authentic Philippine Government ID. We inspect document validity and extract matching credentials.'}
                                {currentStep === 3 && 'Capture a live webcam portrait to verify your identity against your Government ID photograph.'}
                                {currentStep === 4 && 'Confirm your verified credentials and consent to Data Privacy Act (RA 10173) processing.'}
                            </p>
                        </div>

                        {/* ================= STEP 1: CANONICAL ACCOUNT DETAILS ================= */}
                        {currentStep === 1 && (
                            <div className="w-full space-y-3.5">
                                {/* First & Last Name */}
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
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                        {errors.first_name && <p className="text-rose-600 text-xs mt-1">{errors.first_name}</p>}
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
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                        {errors.last_name && <p className="text-rose-600 text-xs mt-1">{errors.last_name}</p>}
                                    </div>
                                </div>

                                {/* Middle Name & Name Suffix */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                            Middle Name: <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.middle_name}
                                            onChange={(e) => setData('middle_name', e.target.value)}
                                            placeholder="e.g. De los Reyes"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                            Suffix: <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.name_suffix}
                                            onChange={(e) => setData('name_suffix', e.target.value)}
                                            placeholder="Jr., III"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                    </div>
                                </div>

                                {/* Date of Birth & Phone */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                            Date of Birth:
                                        </label>
                                        <input
                                            type="date"
                                            value={data.date_of_birth}
                                            onChange={(e) => setData('date_of_birth', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                            Mobile Phone: <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="0917 123 4567"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                        />
                                        {errors.phone && <p className="text-rose-600 text-xs mt-1">{errors.phone}</p>}
                                    </div>
                                </div>

                                {/* Email Address */}
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
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                    />
                                    {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email}</p>}
                                </div>

                                {/* Preferred Parish */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Home / Registered Parish: <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={data.home_parish_id}
                                        onChange={(e) => setData('home_parish_id', Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                    >
                                        <option value="" disabled>Select your parish</option>
                                        {parishes.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.municipality || p.city_municipality ? `(${p.municipality || p.city_municipality})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.home_parish_id && <p className="text-rose-600 text-xs mt-1">{errors.home_parish_id}</p>}
                                </div>

                                {/* Passwords */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                            Password (min 8): <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder="••••••••••••"
                                                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-rose-600 text-xs mt-1">{errors.password}</p>}
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
                                                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!validateStep1()) {
                                            alert('Please fill all required account details and ensure your password has at least 8 characters and matches confirmation.');
                                            return;
                                        }
                                        setCurrentStep(2);
                                    }}
                                    className="w-full mt-4 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Proceed to Step 2: Government ID Verification</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* ================= STEP 2: GOVERNMENT ID UPLOAD & OCR ================= */}
                        {currentStep === 2 && (
                            <div className="w-full space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
                                        Select Philippine Government ID Type: <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.id_type}
                                        onChange={(e) => {
                                            setData('id_type', e.target.value);
                                            setIdVerified(false);
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition shadow-xs"
                                    >
                                        {PHILIPPINE_IDS.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleIdFileChange}
                                    className="hidden"
                                />

                                {/* Document Staging / Upload Box */}
                                {idPreview ? (
                                    <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-900 flex flex-col items-center justify-center shadow-inner group">
                                        <img
                                            src={idPreview}
                                            alt="Uploaded ID Preview"
                                            className="w-full h-full object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-200 text-xs font-semibold backdrop-blur-xs border border-slate-700 transition"
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-7 text-center cursor-pointer transition bg-slate-50/60 hover:bg-amber-50/20 group"
                                    >
                                        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center transition group-hover:scale-105">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-semibold text-slate-800 text-sm mt-2.5">
                                            Upload Front of Government ID
                                        </h4>
                                        <p className="text-slate-500 text-xs mt-1">
                                            Take a clear photo with no glare, covering all edges of the ID card (JPG, PNG)
                                        </p>
                                    </div>
                                )}

                                {/* OCR Scanning Progress Indicator */}
                                {idOcrScanning && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs shadow-2xs animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                                        <span>Reading document text and credentials via OCR...</span>
                                    </div>
                                )}

                                {/* Error Alert */}
                                {idError && (
                                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-2xs">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold">Verification Rejected</p>
                                            <p className="leading-relaxed">{idError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Verified Document Card */}
                                {idVerified && idDetails && (
                                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5 shadow-2xs">
                                        <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            <span>Document Verified & Facial Photo Detected</span>
                                        </div>
                                        <div className="text-[11px] text-slate-700 space-y-0.5">
                                            <p><strong>Verified Legal Name:</strong> {idDetails.extracted_name}</p>
                                            <p><strong>Document ID Number:</strong> {idDetails.id_number_masked}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Verification Action Button */}
                                {!idVerified ? (
                                    <button
                                        type="button"
                                        onClick={handleVerifyIdDocument}
                                        disabled={!idPreview || idVerifying || idOcrScanning}
                                        className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {idVerifying ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                                <span>Inspecting Document & Matching Credentials...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Verify Document & Match Credentials</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(3)}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Next Step: Live Face Biometrics</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Account Details</span>
                                </button>
                            </div>
                        )}

                        {/* ================= STEP 3: HANDS-FREE ACTIVE LIVENESS & FACE BIOMETRICS ================= */}
                        {currentStep === 3 && (
                            <div className="w-full space-y-4">
                                {faceVerified ? (
                                    <div className="space-y-4">
                                        {/* Captured Reference Card */}
                                        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-400/50 shadow-md text-white flex items-center gap-4">
                                            {selfiePreview && (
                                                <img
                                                    src={selfiePreview}
                                                    alt="Enrolled Face"
                                                    className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                                                />
                                            )}
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    <span>Biometric Liveness &amp; ID Match Confirmed</span>
                                                </div>
                                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                                    Live biometric scan verified against your Government ID photograph via Face++ (Match Confidence: <strong>{faceConfidence}%</strong>).
                                                </p>
                                                <span className="text-[10px] text-slate-400 block">
                                                    Strict 1e-5 FAR biometric threshold validated.
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(4)}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <span>Next Step: Final Review &amp; Consent</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFaceVerified(false);
                                                setSelfiePreview(null);
                                                setData('live_selfie', '');
                                                setFaceError(null);
                                            }}
                                            className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>Retake Live Face Scan</span>
                                        </button>
                                    </div>
                                ) : (
                                    <BiometricLivenessScanner
                                        onCapture={(base64) => {
                                            setSelfiePreview(base64);
                                            setData('live_selfie', base64);
                                            handleVerifyFaceBiometrics(base64);
                                        }}
                                        processing={faceVerifying}
                                        processingMessage="Cross-referencing face against Government ID photo via Face++..."
                                        errorMessage={faceError}
                                        onRetry={() => {
                                            setFaceError(null);
                                            setFaceVerified(false);
                                            setSelfiePreview(null);
                                        }}
                                        title="Hands-Free Biometric Verification"
                                        description="Blink naturally and complete the active movement challenge. Captured photos or media are strictly rejected."
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Government ID Upload</span>
                                </button>
                            </div>
                        )}

                        {/* ================= STEP 4: REVIEW, CONSENT & SUBMISSION ================= */}
                        {currentStep === 4 && (
                            <form onSubmit={submit} className="w-full space-y-4">
                                {/* Summary Review Box */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                            Verified Registration Summary
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>Pre-Verified</span>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Legal Name</span>
                                            <span className="font-semibold text-slate-800">{data.first_name} {data.last_name}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                                            <span className="font-semibold text-slate-800 truncate block">{data.email}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">ID Document</span>
                                            <span className="font-semibold text-slate-800">{PHILIPPINE_IDS.find(i => i.value === data.id_type)?.label || data.id_type}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Document Number</span>
                                            <span className="font-semibold text-slate-800">{idDetails?.id_number_masked || 'Verified ID'}</span>
                                        </div>
                                    </div>

                                    {/* Small preview of live reference photo */}
                                    {selfiePreview && (
                                        <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                                            <img
                                                src={selfiePreview}
                                                alt="Reference Photo"
                                                className="w-11 h-11 rounded-xl object-cover border border-amber-400 shadow-2xs"
                                            />
                                            <div className="text-[11px] leading-tight">
                                                <span className="font-bold text-slate-800 block">Biometric Reference Enrolled</span>
                                                <span className="text-slate-500">You will be able to sign in instantly using this Face ID.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mandatory RA 10173 Consent */}
                                <div className="pt-1">
                                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={data.privacy_consent}
                                            onChange={(e) => setData('privacy_consent', e.target.checked)}
                                            className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 shrink-0"
                                        />
                                        <span className="leading-relaxed text-xs">
                                            I solemnly affirm that the submitted credentials belong to me. I provide explicit, informed consent to the collection, verification, and encrypted storage of my government ID and biometric facial templates pursuant to{' '}
                                            <strong className="text-slate-900">Republic Act No. 10173 (Data Privacy Act of 2012)</strong>, subject to the Archdiocesan Biometric Retention & Data Privacy Policy.{' '}
                                            <button
                                                type="button"
                                                onClick={() => setPrivacyModalOpen(true)}
                                                className="text-amber-600 underline hover:text-amber-700 font-semibold"
                                            >
                                                Read policy & retention rules
                                            </button>
                                        </span>
                                    </label>
                                    {errors.privacy_consent && (
                                        <p className="text-rose-600 text-xs mt-1">{errors.privacy_consent}</p>
                                    )}
                                </div>

                                {/* Server Errors */}
                                {errors.id_image && (
                                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                        {errors.id_image}
                                    </div>
                                )}
                                {errors.live_selfie && (
                                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                        {errors.live_selfie}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing || !data.privacy_consent}
                                    className="w-full mt-2 py-3.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                            <span>Creating Verified Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Complete Registration & Enter Portal</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Face Biometrics</span>
                                </button>
                            </form>
                        )}

                        {/* Sign In Link */}
                        <div className="w-full mt-4 pt-3 border-t border-slate-100 text-center">
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
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-5 backdrop-blur-md shadow-sm">
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
                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md">
                                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        RA 10173 &amp; Canon Law Protected
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Your identity and sacramental history are protected under Philippine privacy statutes and ecclesiastical confidentiality.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md">
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

                            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md">
                                <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-white text-xs">
                                        Biometric-Verified Access
                                    </h3>
                                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                                        Seamless, fast sign-in using Face++ facial recognition verified against your genuine government identification.
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
                                The <strong>Roman Catholic Archdiocese of Lipa (RCAL)</strong> respects your privacy and is committed to protecting your personal information pursuant to the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, its Implementing Rules and Regulations, and the <strong>Code of Canon Law (Can. 535)</strong>.
                            </p>
                            <p>
                                <strong>Sensitive Personal Information & Biometrics:</strong> Government-issued ID cards and facial biometric templates are classified as Sensitive Personal Information under RA 10173. These are collected strictly to verify canonical identity against sacramental registries and protect against identity theft, false certificates, and presentation attacks.
                            </p>
                            <p>
                                <strong>Encryption & Storage Security:</strong> All biometric facial data and government ID records are stored with AES-256 cryptographic encryption at rest on private disks, inaccessible via public web paths, and transmitted exclusively over verified TLS connections.
                            </p>
                            <p>
                                <strong>Retention & Deletion Policy:</strong> Biometric facial templates are retained exclusively during the active life of your verified diocesan parishioner account to provide passwordless face login and certificate issuance verification. Upon verified written request to the Archdiocesan Data Protection Officer (DPO) or account closure, non-canonical biometric templates are permanently purged from the system.
                            </p>
                            <p>
                                <strong>Confidentiality:</strong> Records are guarded under strict ecclesiastical secrecy. Canonical sacramental entries remain permanent and immutable under universal Canon Law and are never commercialized, distributed, or disclosed without legitimate canonical interest or lawful court order.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setPrivacyModalOpen(false)}
                                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition"
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
