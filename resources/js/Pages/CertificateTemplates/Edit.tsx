import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, PageProps } from '@/types';
import { FileText, Plus, X, ArrowLeft, Upload, Save } from 'lucide-react';

interface Props extends PageProps {
    template: CertificateTemplate;
}

/**
 * Edit page for Certificate Templates.
 *
 * WHAT IT DOES
 * ─────────────────────────────────────────
 * • Pre-fills the form with the template's current name, paper size, and placeholders.
 * • Optionally lets the user upload a replacement file (re-parses placeholders).
 * • Users can add or remove placeholders manually.
 *
 * WHO CAN ACCESS
 * ─────────────────────────────────────────
 * Admin, chancery, and parish staff scoped to their own parish.
 */
export default function Edit({ template }: Props) {
    const [name, setName] = useState(template.name);
    const [paperSize, setPaperSize] = useState<'short' | 'a4'>(template.paper_size);
    const [file, setFile] = useState<File | null>(null);
    const [placeholders, setPlaceholders] = useState<string[]>(template.placeholders || []);
    const [newPlaceholder, setNewPlaceholder] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Add a manually typed placeholder. */
    const addPlaceholder = () => {
        const trimmed = newPlaceholder.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        if (trimmed && !placeholders.includes(trimmed)) {
            setPlaceholders([...placeholders, trimmed]);
            setNewPlaceholder('');
        }
    };

    /** Remove a placeholder by index. */
    const removePlaceholder = (index: number) => {
        setPlaceholders(placeholders.filter((_, i) => i !== index));
    };

    /** Submit the form as PUT (spoofed via _method). */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('name', name);
        formData.append('sacrament_type', template.sacrament_type || 'baptism');
        formData.append('paper_size', paperSize);
        if (file) {
            formData.append('file', file);
        }
        placeholders.forEach((p, i) => {
            formData.append(`placeholders[${i}]`, p);
        });

        router.post(`/certificate-templates/${template.id}`, formData, {
            forceFormData: true,
            onError: (errs) => {
                setErrors(errs);
                setIsSubmitting(false);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <PortalLayout activeTab="certificate_templates">
            <Head title={`Edit Template: ${template.name}`} />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Link */}
                <Link
                    href="/certificate-templates"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Templates
                </Link>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                    <h1 className="text-xl font-bold text-slate-900 mb-1">Edit Template</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Update the template name, paper size, or upload a replacement file. Existing placeholders are preserved unless you change them.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ── Template Name ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Template Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        {/* ── Paper Size ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Paper Size <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                {[
                                    { value: 'short' as const, label: 'Short Bond (8.5″ × 11″)' },
                                    { value: 'a4' as const, label: 'A4 (210mm × 297mm)' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setPaperSize(option.value)}
                                        className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl border-2 transition ${
                                            paperSize === option.value
                                                ? 'border-amber-500 bg-amber-50 text-amber-800'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Replace File (optional) ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Replace Template File <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <p className="text-xs text-slate-400 mb-2">
                                Current file: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{template.filename}</code>
                            </p>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                                    file
                                        ? 'border-amber-400 bg-amber-50'
                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.pdf,.png,.jpg,.jpeg"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileText className="w-6 h-6 text-amber-600" />
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Click to upload a replacement file</p>
                                    </>
                                )}
                            </div>
                            {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                        </div>

                        {/* ── Placeholders ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Placeholders
                            </label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newPlaceholder}
                                    onChange={(e) => setNewPlaceholder(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addPlaceholder();
                                        }
                                    }}
                                    placeholder="e.g. recipient_name"
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={addPlaceholder}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {placeholders.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {placeholders.map((p, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono"
                                        >
                                            {`{{${p}}}`}
                                            <button
                                                type="button"
                                                onClick={() => removePlaceholder(i)}
                                                className="text-slate-400 hover:text-red-500 transition"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">No placeholders defined. Add some or upload a DOCX/PDF file to auto-detect them.</p>
                            )}
                        </div>

                        {/* ── Submit ── */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <Link
                                href="/certificate-templates"
                                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PortalLayout>
    );
}

