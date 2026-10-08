import React from 'react';
import { Link } from '@inertiajs/react';

interface FormActionsProps {
    submitLabel?: string;
    cancelHref?: string;
    cancelLabel?: string;
    processing?: boolean;
    disabled?: boolean;
    extraActions?: React.ReactNode;
    className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
    submitLabel = 'Save Changes',
    cancelHref,
    cancelLabel = 'Cancel',
    processing = false,
    disabled = false,
    extraActions,
    className = '',
}) => {
    return (
        <div
            className={`mt-8 pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 ${className}`}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto">
                {cancelHref && (
                    <Link href={cancelHref} className="btn-cancel w-full sm:w-auto text-center">
                        {cancelLabel}
                    </Link>
                )}
                {extraActions}
            </div>

            <button
                type="submit"
                disabled={processing || disabled}
                className="btn-primary w-full sm:w-auto"
            >
                {processing ? (
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Processing...
                    </>
                ) : (
                    submitLabel
                )}
            </button>
        </div>
    );
};

export default FormActions;
