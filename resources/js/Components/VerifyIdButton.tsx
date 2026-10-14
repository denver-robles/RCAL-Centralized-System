import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface VerifyIdButtonProps {
    className?: string;
    variant?: 'primary' | 'secondary' | 'amber';
    buttonText?: string;
    loadingText?: string;
}

export default function VerifyIdButton({
    className = '',
    variant = 'amber',
    buttonText = 'Verify Government ID',
    loadingText = 'Initializing Stripe Verification...',
}: VerifyIdButtonProps) {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleVerify = async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
            const response = await axios.post('/identity/create-session');

            if (response.data?.url) {
                // Redirect user to Stripe's hosted identity verification flow
                window.location.href = response.data.url;
            } else {
                setErrorMessage('No verification URL returned from Stripe.');
                setLoading(false);
            }
        } catch (error: any) {
            console.error('Error creating verification session:', error);
            let serverMsg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                'Unable to initialize identity verification session. Please check your Stripe keys in .env.';

            if (error?.response?.status === 419) {
                serverMsg = 'Session expired. Please refresh the page and try again.';
            }

            setErrorMessage(serverMsg);
            setLoading(false);
        }
    };

    const variantStyles = {
        amber: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md hover:shadow-lg',
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md',
        secondary: 'bg-slate-900 hover:bg-slate-800 text-white font-semibold border border-slate-700',
    };

    return (
        <div className="flex flex-col items-start gap-2">
            <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{loadingText}</span>
                    </>
                ) : (
                    <>
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{buttonText}</span>
                    </>
                )}
            </button>

            {errorMessage && (
                <div className="flex items-start gap-2 text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg p-2.5 max-w-md animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
