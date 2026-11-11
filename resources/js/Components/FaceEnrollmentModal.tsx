import React, { useState, useRef, useEffect, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    ScanFace,
    Camera,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    ShieldCheck,
} from 'lucide-react';

interface FaceEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FaceEnrollmentModal({ isOpen, onClose }: FaceEnrollmentModalProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Stop webcam hardware
    const stopWebcam = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setCameraLoading(false);
    }, []);

    // Start webcam hardware
    const startWebcam = async () => {
        setError(null);
        setCameraLoading(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);
        } catch (err: any) {
            console.error('Camera access error:', err);
            setError(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera permissions in your browser.'
                    : 'Could not access webcam. Please check your camera connection.'
            );
            setCameraActive(false);
        } finally {
            setCameraLoading(false);
        }
    };

    // Clean up camera when switching away or closing modal
    useEffect(() => {
        if (!isOpen) {
            stopWebcam();
            setPreviewImage(null);
            setError(null);
        } else if (!previewImage && !cameraActive && !(user?.role === 'parishioner' && user?.has_face_reference)) {
            startWebcam();
        }
    }, [isOpen, stopWebcam]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Capture snapshot from webcam
    const handleCaptureSnapshot = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setPreviewImage(dataUrl);
        stopWebcam();
    };

    // Submit face reference to backend
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!previewImage) {
            setError('Please select or capture a photo first.');
            return;
        }

        setSubmitting(true);
        setError(null);

        router.post(
            '/user/face-reference',
            { face_image: previewImage },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSubmitting(false);
                    onClose();
                },
                onError: (errs) => {
                    setSubmitting(false);
                    setError(errs.face_image || 'Failed to save face reference image.');
                },
            }
        );
    };

    if (!isOpen) return null;

    // Sealed guard: Registered parishioners cannot modify biometrics post-registration
    if (user?.role === 'parishioner' && user?.has_face_reference) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
                <div
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-6 py-5 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-700 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                                    Biometric Identity Sealed
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Archdiocesan Canonical Record Protection
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto text-emerald-600">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                                Your Face ID is Permanently Verified &amp; Sealed
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                                Under Archdiocesan canonical guidelines and Republic Act No. 10173 (Data Privacy Act of 2012), your biometric face reference enrolled during registration is canonical and immutable.
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                                To prevent identity spoofing and account-takeover attacks, registered biometrics cannot be modified online. If your physical appearance has changed substantially, please visit your parish chancery in person.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-700 flex items-center justify-center shrink-0">
                            <ScanFace className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                                Face++ Reference Photo Enrollment
                            </h3>
                            <p className="text-xs text-slate-500">
                                Enroll your reference face for biometric sign-in
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Status Pill */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs">
                            <span className="font-semibold text-slate-800">Biometric Status: </span>
                            <span className="text-slate-500">{user?.display_name || user?.username}</span>
                        </div>
                        {user?.has_face_reference ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reference Enrolled</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Not Yet Enrolled</span>
                            </span>
                        )}
                    </div>

                    {/* Live Webcam Indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-900 text-xs">
                        <Camera className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium">
                            Live Webcam Capture (Photos from media or files are strictly rejected)
                        </span>
                    </div>

                    {/* Hidden Canvas */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Preview / Staged Image */}
                    {previewImage ? (
                        <div className="flex flex-col items-center space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md">
                                <img
                                    src={previewImage}
                                    alt="Enrolled Face Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewImage(null);
                                    startWebcam();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retake Webcam Photo</span>
                            </button>
                        </div>
                    ) : (
                        /* Webcam Viewfinder */
                        <div className="relative w-full aspect-4/3 max-h-[240px] bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner flex flex-col items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${
                                    cameraActive ? 'opacity-100 scale-x-[-1]' : 'opacity-0 absolute'
                                }`}
                            />

                            {cameraActive && (
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                    <div className="w-36 h-44 border-2 border-dashed border-amber-400/80 rounded-full animate-pulse shadow-sm flex items-center justify-center">
                                        <span className="text-[10px] text-amber-200 font-semibold bg-slate-950/70 px-2 py-0.5 rounded-full">
                                            Center Face
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!cameraActive && !cameraLoading && (
                                <div className="text-center p-4 flex flex-col items-center space-y-2 z-10">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                                        <Camera className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <p className="text-slate-300 text-xs font-medium">Camera is currently off</p>
                                    <button
                                        type="button"
                                        onClick={startWebcam}
                                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>Start Camera</span>
                                    </button>
                                </div>
                            )}

                            {cameraLoading && (
                                <div className="text-center p-4 flex flex-col items-center space-y-2 z-10">
                                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-slate-300 text-xs font-medium">Opening webcam...</p>
                                </div>
                            )}

                            {cameraActive && (
                                <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
                                    <button
                                        type="button"
                                        onClick={handleCaptureSnapshot}
                                        className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Snap Reference Photo</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Feedback */}
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Tip & Biometric Consent Notice */}
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
                        <div className="flex items-start gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed text-slate-700">
                                <strong>RA 10173 Biometric Notice:</strong> Your facial template is protected under AES-256 encryption at rest on private disks, verified over secure TLS, and used solely for biometric login. By enrolling, you consent to this sensitive processing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200/60 text-xs font-semibold transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!previewImage || submitting}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                <span>Saving Reference...</span>
                            </>
                        ) : (
                            <>
                                <ScanFace className="w-4 h-4" />
                                <span>Save Face Reference Photo</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
