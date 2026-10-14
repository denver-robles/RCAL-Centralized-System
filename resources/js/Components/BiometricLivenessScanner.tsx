import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Camera,
    Shield,
    ShieldAlert,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    ScanFace,
    Eye,
    Sparkles,
} from 'lucide-react';

export interface BiometricLivenessScannerProps {
    onCapture: (base64Image: string) => void;
    processing?: boolean;
    processingMessage?: string;
    errorMessage?: string | null;
    onRetry?: () => void;
    title?: string;
    description?: string;
    autoStart?: boolean;
}

const ACTION_CHALLENGES = [
    {
        id: 'turn_head',
        title: 'Turn Head Gently to Either Side',
        instruction: 'Turn your head slightly to the left or right',
        emoji: '🔄',
    },
    {
        id: 'nod_head',
        title: 'Nod Your Head Gently Down',
        instruction: 'Gently tilt or nod your head up and down',
        emoji: '↕️',
    },
];

export default function BiometricLivenessScanner({
    onCapture,
    processing = false,
    processingMessage = 'Verifying biometrics...',
    errorMessage = null,
    onRetry,
    title = 'Hands-Free Biometric Liveness Scanner',
    description = 'Follow the on-screen prompts. Blink and perform the requested motion to prove live presence.',
    autoStart = true,
}: BiometricLivenessScannerProps) {
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Main State Machine
    // 'idle' | 'aligning' | 'blink' | 'action' | 'verified_hold' | 'captured'
    const [stage, setStage] = useState<'idle' | 'aligning' | 'blink' | 'action' | 'verified_hold' | 'captured'>('idle');

    // Blink Challenge State: 'seeking_baseline' | 'detecting_closure' | 'detecting_reopen' | 'blink_verified'
    const [blinkPhase, setBlinkPhase] = useState<'seeking_baseline' | 'detecting_closure' | 'detecting_reopen' | 'blink_verified'>('seeking_baseline');
    const [blinkCompleted, setBlinkCompleted] = useState(false);

    // Action Challenge State
    const [actionIndex, setActionIndex] = useState(0);
    const [actionProgress, setActionProgress] = useState(0);

    const [countdownSecs, setCountdownSecs] = useState(2);
    const [spoofWarning, setSpoofWarning] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Biological Differencing & Anti-Tremor Refs
    const prevFrameRef = useRef<Uint8Array | null>(null);
    const alignStableCount = useRef<number>(0);
    const stageStartTime = useRef<number>(0);
    const autoStartedRef = useRef<boolean>(false);
    const persistentGlareCount = useRef<number>(0);

    // Blink temporal tracking refs
    const baselineEyeLum = useRef<number>(0);
    const baselineStableCount = useRef<number>(0);
    const blinkClosureTime = useRef<number>(0);
    const blinkPhaseRef = useRef<'seeking_baseline' | 'detecting_closure' | 'detecting_reopen' | 'blink_verified'>('seeking_baseline');

    // Action tracking refs
    const actionHits = useRef<number>(0);

    // Synchronize ref with state to prevent stale closures in interval
    useEffect(() => {
        blinkPhaseRef.current = blinkPhase;
    }, [blinkPhase]);

    // Hardware camera stop
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

    // Hardware camera start with robust constraints and fallbacks
    const startWebcam = useCallback(async () => {
        setCameraLoading(true);
        setCameraError(null);
        setSpoofWarning(null);

        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraError('Webcam API is not supported in this browser environment. Please use an updated browser.');
            setCameraLoading(false);
            return;
        }

        // Clean up any stale stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        let stream: MediaStream | null = null;
        try {
            // First attempt with ideal constraints
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });
        } catch (err1: any) {
            console.warn('Initial camera constraints failed, attempting fallback to generic video:', err1);
            try {
                // Fallback attempt with minimal constraints (compatible with external webcams and virtual devices)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            } catch (err2: any) {
                console.error('All camera access attempts failed:', err2);
                const finalErr = err2 || err1;
                setCameraError(
                    finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError'
                        ? 'Camera access denied. Please click the camera icon in your browser address bar and allow permissions.'
                        : finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError'
                        ? 'No webcam device detected. Please connect a camera and try again.'
                        : finalErr.name === 'NotReadableError' || finalErr.name === 'TrackStartError'
                        ? 'Camera is in use by another application. Please close other camera apps and retry.'
                        : `Webcam not accessible: ${finalErr.message || 'Please check device permissions.'}`
                );
                setCameraActive(false);
                setCameraLoading(false);
                return;
            }
        }

        if (!stream) {
            setCameraError('Unable to acquire camera video stream.');
            setCameraLoading(false);
            return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
            video.srcObject = stream;
            video.muted = true;
            try {
                await video.play();
            } catch (playErr) {
                console.warn('Video play warning:', playErr);
            }
        }

        setCameraActive(true);
        setCameraLoading(false);
        setStage('aligning');
        setBlinkPhase('seeking_baseline');
        setBlinkCompleted(false);
        setActionProgress(0);
        alignStableCount.current = 0;
        baselineStableCount.current = 0;
        actionHits.current = 0;
        persistentGlareCount.current = 0;
        stageStartTime.current = Date.now();
    }, []);

    // Ensure video stream remains attached when cameraActive toggles
    useEffect(() => {
        if (cameraActive && streamRef.current && videoRef.current) {
            if (videoRef.current.srcObject !== streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.muted = true;
                videoRef.current.play().catch((e) => console.warn('Video attach play:', e));
            }
        }
    }, [cameraActive]);

    // Auto-start camera on mount (runs once without destructive cleanup during state changes)
    useEffect(() => {
        if (autoStart && !autoStartedRef.current) {
            autoStartedRef.current = true;
            startWebcam();
        }
    }, [autoStart, startWebcam]);

    // Stop camera hardware strictly on component unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Active Liveness Analysis Loop (runs every 110ms)
    useEffect(() => {
        if (!cameraActive || stage === 'idle' || stage === 'verified_hold' || stage === 'captured' || processing) {
            return;
        }

        const interval = setInterval(() => {
            const video = videoRef.current;
            const sampleCanvas = sampleCanvasRef.current;
            if (!video || !sampleCanvas || video.readyState < 2) return;

            const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            const w = 160;
            const h = 120;
            ctx.drawImage(video, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const pixels = imgData.data;

            // 1. FORGIVING SPECULAR SCREEN GLARE DETECTION
            // Backlit digital phone screens held close produce widespread blown-out reflections (>180 saturated pixels)
            let specularGlareCount = 0;
            for (let y = 18; y < h - 18; y += 2) {
                for (let x = 28; x < w - 28; x += 2) {
                    const pIdx = (y * w + x) * 4;
                    const r = pixels[pIdx];
                    const g = pixels[pIdx + 1];
                    const b = pixels[pIdx + 2];
                    if (r > 248 && g > 248 && b > 248) {
                        specularGlareCount++;
                    }
                }
            }

            // Only flag if excessive glare persists over multiple frames (avoiding single-frame light reflections)
            if (specularGlareCount > 90) {
                persistentGlareCount.current++;
                if (persistentGlareCount.current >= 4) {
                    setSpoofWarning(
                        'Excessive screen glare detected. Please do not hold a phone or digital display in front of the camera.'
                    );
                }
            } else {
                persistentGlareCount.current = Math.max(0, persistentGlareCount.current - 1);
                if (persistentGlareCount.current === 0 && spoofWarning?.includes('glare')) {
                    setSpoofWarning(null);
                }
            }

            // 2. Grayscale conversion for facial differencing
            const currentGrayscale = new Uint8Array(w * h);
            for (let i = 0; i < pixels.length; i += 4) {
                currentGrayscale[i / 4] = Math.round(
                    0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
                );
            }

            if (!prevFrameRef.current) {
                prevFrameRef.current = currentGrayscale;
                return;
            }

            const prevGrayscale = prevFrameRef.current;

            // 3. Compute Biometric Differential Metrics
            // Eye Zone: upper middle box (x: 52-108, y: 34-58)
            // Reference Zones (Forehead, Cheeks, Chin): Non-eye facial skin areas
            let eyeDiff = 0, eyeCount = 0, eyeLumSum = 0;
            let refDiff = 0, refCount = 0;
            let leftDiff = 0, leftCount = 0;
            let rightDiff = 0, rightCount = 0;
            let vertDiff = 0, vertCount = 0;
            let totalDiff = 0, totalCount = 0;

            for (let y = 15; y < h - 15; y++) {
                for (let x = 20; x < w - 20; x++) {
                    const idx = y * w + x;
                    const diff = Math.abs(currentGrayscale[idx] - prevGrayscale[idx]);
                    const lum = currentGrayscale[idx];
                    totalDiff += diff;
                    totalCount++;

                    // Eye Zone (middle upper box)
                    if (y >= 34 && y <= 58 && x >= 52 && x <= 108) {
                        eyeDiff += diff;
                        eyeLumSum += lum;
                        eyeCount++;
                    }

                    // Reference Zones (forehead, left cheek, right cheek, chin)
                    const isForehead = y >= 18 && y <= 30 && x >= 55 && x <= 105;
                    const isLeftCheek = y >= 45 && y <= 75 && x >= 32 && x <= 50;
                    const isRightCheek = y >= 45 && y <= 75 && x >= 110 && x <= 128;
                    const isChin = y >= 82 && y <= 102 && x >= 60 && x <= 100;

                    if (isForehead || isLeftCheek || isRightCheek || isChin) {
                        refDiff += diff;
                        refCount++;
                    }

                    // Lateral sectors for head turn challenges
                    if (x < 55) {
                        leftDiff += diff;
                        leftCount++;
                    } else if (x > 105) {
                        rightDiff += diff;
                        rightCount++;
                    }

                    // Vertical shift for nod challenge
                    if (y < 42 || y > 78) {
                        vertDiff += diff;
                        vertCount++;
                    }
                }
            }

            prevFrameRef.current = currentGrayscale;

            const avgEye = eyeCount > 0 ? eyeDiff / eyeCount : 0;
            const eyeLuminance = eyeCount > 0 ? eyeLumSum / eyeCount : 0;
            const avgRef = refCount > 0 ? refDiff / refCount : 0;
            const avgLeft = leftCount > 0 ? leftDiff / leftCount : 0;
            const avgRight = rightCount > 0 ? rightDiff / rightCount : 0;
            const avgVert = vertCount > 0 ? vertDiff / vertCount : 0;
            const totalAvg = totalCount > 0 ? totalDiff / totalCount : 0;

            // Timeout Check: Generous 28 seconds so users never feel rushed
            if (Date.now() - stageStartTime.current > 28000) {
                setSpoofWarning(
                    'Liveness check: Please look directly into the camera, blink your eyes naturally, and gently move your head.'
                );
                stageStartTime.current = Date.now();
                setActionIndex((prev) => (prev + 1) % ACTION_CHALLENGES.length);
                setActionProgress(0);
                actionHits.current = 0;
                setBlinkPhase('seeking_baseline');
                setStage('aligning');
                return;
            }

            // STAGE 1: SMOOTH ALIGNING FACE IN OVAL GUIDE
            if (stage === 'aligning') {
                if (totalAvg > 0.3 && totalAvg < 30 && avgRef < 3.8) {
                    alignStableCount.current++;
                    if (alignStableCount.current >= 3) { // Smooth ~330ms alignment
                        alignStableCount.current = 0;
                        setStage('blink');
                        setBlinkPhase('seeking_baseline');
                        baselineStableCount.current = 0;
                        stageStartTime.current = Date.now();
                        setSpoofWarning(null);
                    }
                } else {
                    alignStableCount.current = Math.max(0, alignStableCount.current - 1);
                }
            }
            // STAGE 2: USER-FRIENDLY BIOLOGICAL BLINK DETECTION
            // Forgiving for real human eyes while strictly rejecting static pictures and phone shake
            else if (stage === 'blink') {
                const currentBlinkPhase = blinkPhaseRef.current;

                // Phase 2A: Seeking Baseline (Face resting comfortably)
                if (currentBlinkPhase === 'seeking_baseline') {
                    // Forgiving thresholds: avgRef < 3.2 and avgEye < 3.5
                    if (avgRef < 3.2 && avgEye < 3.5) {
                        baselineStableCount.current++;
                        if (baselineStableCount.current >= 2) { // Just ~220ms of steady resting face
                            baselineEyeLum.current = eyeLuminance;
                            setBlinkPhase('detecting_closure');
                            baselineStableCount.current = 0;
                            setSpoofWarning(null);
                        }
                    } else {
                        baselineStableCount.current = Math.max(0, baselineStableCount.current - 1);
                    }
                }
                // Phase 2B: Detecting Natural Eyelid Closure
                else if (currentBlinkPhase === 'detecting_closure') {
                    // Anti-phone-shake filter: If the entire phone/frame is violently shaking, avgRef > 4.5
                    if (avgRef > 4.5) {
                        setBlinkPhase('seeking_baseline');
                        baselineStableCount.current = 0;
                        return;
                    }

                    // Natural blink closure: Eye delta or luminance shift
                    const isEyeClosureSpike =
                        avgEye >= 2.2 && (avgEye > avgRef * 1.1 || Math.abs(eyeLuminance - baselineEyeLum.current) >= 2.0);

                    if (isEyeClosureSpike) {
                        blinkClosureTime.current = Date.now();
                        setBlinkPhase('detecting_reopen');
                    }
                }
                // Phase 2C: Detecting Eyelid Reopening
                else if (currentBlinkPhase === 'detecting_reopen') {
                    const elapsedSinceClosure = Date.now() - blinkClosureTime.current;

                    // Allow generous 80ms - 1300ms window for natural blinks
                    if (elapsedSinceClosure > 1300) {
                        setBlinkPhase('seeking_baseline');
                        baselineStableCount.current = 0;
                        return;
                    }

                    if (elapsedSinceClosure >= 80) {
                        const isReopenSpike = avgEye >= 1.8;
                        const isLumRecovered =
                            Math.abs(eyeLuminance - baselineEyeLum.current) <= 15;

                        if (isReopenSpike || isLumRecovered) {
                            // BLINK VERIFIED!
                            setBlinkCompleted(true);
                            setBlinkPhase('blink_verified');

                            // Advance to action challenge
                            setStage('action');
                            stageStartTime.current = Date.now();
                            const nextAction = Math.floor(Math.random() * ACTION_CHALLENGES.length);
                            setActionIndex(nextAction);
                            setActionProgress(25);
                            actionHits.current = 0;
                        }
                    }
                }
            }
            // STAGE 3: USER-FRIENDLY NATURAL MOTION CHALLENGE
            // Smoothly tracks gentle head movement in either direction
            else if (stage === 'action') {
                const currentAction = ACTION_CHALLENGES[actionIndex];
                let isMotionDetected = false;

                if (currentAction.id === 'turn_head') {
                    // Forgiving lateral movement: accepts turn to either side
                    if ((avgLeft >= 2.4 || avgRight >= 2.4 || totalAvg >= 2.6) && totalAvg < 35.0) {
                        isMotionDetected = true;
                    }
                } else if (currentAction.id === 'nod_head') {
                    // Forgiving vertical movement
                    if ((avgVert >= 2.4 || totalAvg >= 2.6) && totalAvg < 35.0) {
                        isMotionDetected = true;
                    }
                }

                if (isMotionDetected) {
                    actionHits.current++;
                    const progress = Math.min(100, 25 + actionHits.current * 25);
                    setActionProgress(progress);

                    if (progress >= 100) {
                        // Liveness challenges complete: Move smoothly to hands-free capture
                        setStage('verified_hold');
                    }
                }
            }
        }, 110);

        return () => clearInterval(interval);
    }, [cameraActive, stage, actionIndex, processing, spoofWarning]);

    // Hands-Free Auto Capture Countdown (2, 1, 0)
    useEffect(() => {
        if (stage !== 'verified_hold') return;

        setCountdownSecs(2);
        let count = 2;

        const countdownInterval = setInterval(() => {
            count--;
            setCountdownSecs(count);

            if (count <= 0) {
                clearInterval(countdownInterval);
                executeAutoCapture();
            }
        }, 650);

        return () => clearInterval(countdownInterval);
    }, [stage]);

    // Capture Frame & Trigger Parent Callback Hands-Free
    const executeAutoCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw un-mirrored frame for facial comparison
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();

        const base64 = canvas.toDataURL('image/jpeg', 0.94);
        setStage('captured');
        stopWebcam();

        onCapture(base64);
    };

    // Manual Reset / Retry
    const handleRestart = () => {
        if (onRetry) onRetry();
        setStage('idle');
        setBlinkCompleted(false);
        setBlinkPhase('seeking_baseline');
        setActionProgress(0);
        setSpoofWarning(null);
        autoStartedRef.current = false;
        startWebcam();
    };

    return (
        <div className="w-full space-y-3.5">
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={sampleCanvasRef} className="hidden" />

            {/* Viewfinder Stage */}
            <div className="relative w-full aspect-4/3 max-h-[250px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner flex flex-col items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-200 ${
                        cameraActive && stage !== 'captured' ? 'opacity-100 scale-x-[-1]' : 'opacity-0 absolute'
                    }`}
                />

                {/* Hands-Free Biometric HUD Overlay */}
                {cameraActive && stage !== 'captured' && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-3 px-2">
                        {/* Top Stage Pill */}
                        <div className="z-10">
                            {stage === 'aligning' && (
                                <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-400/60 flex items-center gap-2 shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    <span className="text-amber-200 text-xs font-bold">
                                        Position face inside oval guide
                                    </span>
                                </div>
                            )}

                            {stage === 'blink' && (
                                <div className="bg-sky-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400 flex items-center gap-2 shadow-xl animate-pulse">
                                    <Eye className="w-4 h-4 text-sky-300" />
                                    <span className="text-sky-100 text-xs font-bold tracking-wide">
                                        {blinkPhase === 'seeking_baseline' && 'Step 1 of 2: Hold steady inside guide...'}
                                        {blinkPhase === 'detecting_closure' && 'Step 1 of 2: Please blink both eyes naturally'}
                                        {blinkPhase === 'detecting_reopen' && 'Step 1 of 2: Eyelid closure detected, open eyes...'}
                                        {blinkPhase === 'blink_verified' && 'Step 1 of 2: Blink Verified! ✓'}
                                    </span>
                                </div>
                            )}

                            {stage === 'action' && (
                                <div className="bg-sky-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400 flex items-center gap-2.5 shadow-xl animate-pulse">
                                    <span className="text-base">{ACTION_CHALLENGES[actionIndex].emoji}</span>
                                    <span className="text-sky-100 text-xs font-bold tracking-wide">
                                        Step 2 of 2: {ACTION_CHALLENGES[actionIndex].title}
                                    </span>
                                </div>
                            )}

                            {stage === 'verified_hold' && (
                                <div className="bg-emerald-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400 flex items-center gap-2 shadow-xl">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-100 text-xs font-bold">
                                        Liveness Confirmed! Hold Still...
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Central Oval Guide */}
                        <div className="relative flex items-center justify-center my-auto">
                            {stage === 'aligning' && (
                                <div className="w-32 h-44 border-2 border-dashed border-amber-400 rounded-full animate-pulse shadow-sm flex items-center justify-center">
                                    <span className="text-[10px] text-amber-200 font-semibold bg-slate-950/70 px-2 py-0.5 rounded-full">
                                        Look at Camera
                                    </span>
                                </div>
                            )}

                            {stage === 'blink' && (
                                <div className="w-34 h-46 border-3 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)] rounded-full flex flex-col items-center justify-end pb-3 transition-all duration-300">
                                    <span className="text-[9px] text-sky-200 font-bold bg-slate-950/80 px-2 py-0.5 rounded-full text-center">
                                        {blinkPhase === 'seeking_baseline'
                                            ? 'Hold still in guide...'
                                            : blinkPhase === 'blink_verified'
                                            ? '✓ Blink Verified!'
                                            : 'Blink eyes naturally'}
                                    </span>
                                </div>
                            )}

                            {stage === 'action' && (
                                <div className="w-34 h-46 border-3 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)] rounded-full flex flex-col items-center justify-end pb-3 transition-all duration-300">
                                    {/* Action progress bar */}
                                    <div className="w-24 bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-sky-500/40 shadow-xs">
                                        <div
                                            className="bg-sky-400 h-full transition-all duration-150"
                                            style={{ width: `${actionProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-sky-200 font-bold mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full text-center">
                                        {ACTION_CHALLENGES[actionIndex].instruction}
                                    </span>
                                </div>
                            )}

                            {stage === 'verified_hold' && (
                                <div className="w-36 h-48 border-4 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)] rounded-full flex flex-col items-center justify-center bg-emerald-950/30 backdrop-blur-2xs transition-all duration-300">
                                    <span className="text-4xl font-extrabold text-white animate-bounce drop-shadow-lg">
                                        {countdownSecs}
                                    </span>
                                    <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider mt-1">
                                        Hands-Free Capture
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Bottom HUD Bar - STRICT ANTI-SPOOFING BADGE */}
                        <div className="w-full flex items-center justify-between px-3 text-[10px] text-slate-300">
                            <span className="flex items-center gap-1.5 font-medium bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                                <Shield className="w-3 h-3 text-amber-400" />
                                Anti-Spoofing Active
                            </span>
                            <span className="text-[9px] text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded-full">
                                Screen photos prohibited
                            </span>
                        </div>
                    </div>
                )}

                {/* Processing Overlay */}
                {processing && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2.5 p-4 text-center z-20">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="text-xs font-bold tracking-wide">{processingMessage}</p>
                        <span className="text-[10px] text-slate-400">Strict Face++ Biometric Verification in Progress</span>
                    </div>
                )}

                {/* Camera Disabled State */}
                {!cameraActive && !cameraLoading && !processing && (
                    <div className="text-center p-4 flex flex-col items-center space-y-2 z-10">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                            <Camera className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-slate-300 text-xs font-medium">
                            Webcam required for live hands-free biometric verification
                        </p>
                        <button
                            type="button"
                            onClick={startWebcam}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Start Camera</span>
                        </button>
                    </div>
                )}

                {/* Camera Starting State */}
                {cameraLoading && (
                    <div className="text-center p-4 flex flex-col items-center space-y-2 z-10">
                        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                        <p className="text-slate-300 text-xs font-medium">Starting camera...</p>
                    </div>
                )}
            </div>

            {/* Anti-Spoofing Warning Banner */}
            {spoofWarning && !errorMessage && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 shadow-2xs">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>{spoofWarning}</span>
                </div>
            )}

            {/* Error Message & Retry Button */}
            {errorMessage && (
                <div className="space-y-2">
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-2xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold">Biometric Verification Failed</p>
                            <p className="leading-relaxed">{errorMessage}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleRestart}
                        className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Restart Hands-Free Scan</span>
                    </button>
                </div>
            )}
        </div>
    );
}
