import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { PageProps } from '@/types';
import { Upload, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Props extends PageProps {
    defaultSacrament?: 'baptism' | 'confirmation';
}

export default function Create({ defaultSacrament = 'baptism' }: Props) {
    const [sacramentType, setSacramentType] = useState<'baptism' | 'confirmation'>(defaultSacrament);
    const [file, setFile] = useState<File | null>(null);
    const [paperSize, setPaperSize] = useState<'short' | 'a4'>('short');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('sacrament_type', sacramentType);
        formData.append(
            'name',
            sacramentType === 'baptism' ? 'Baptismal Certificate' : 'Confirmation Certificate'
        );
        formData.append('paper_size', paperSize);
        if (file) {
            formData.append('file', file);
        }

        router.post('/certificate-templates', formData, {
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
            <Head title="Update Certificate Template" />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    href="/certificate-templates"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Templates
                </Link>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900 mb-1">Update Certificate Template</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Select either <strong>Baptismal</strong> or <strong>Confirmation</strong> to upload and update its active church template.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ── Sacrament Dropdown ── */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Sacrament Certificate <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={sacramentType}
                                onChange={(e) => setSacramentType(e.target.value as 'baptism' | 'confirmation')}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition"
                            >
                                <option value="baptism">Baptismal Certificate</option>
                                <option value="confirmation">Confirmation Certificate</option>
                            </select>
                        </div>

                        {/* ── Paper Size Selection ── */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Paper Layout Size
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'short' as const, label: 'Short Bond (8.5″ × 11″)', desc: 'Official Standard' },
                                    { value: 'a4' as const, label: 'A4 (210mm × 297mm)', desc: 'International' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPaperSize(opt.value)}
                                        className={`p-3.5 text-left rounded-xl border-2 transition ${
                                            paperSize === opt.value
                                                ? 'border-amber-500 bg-amber-50/50 text-slate-900'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                    >
                                        <div className="text-sm font-bold">{opt.label}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── File Upload ── */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Upload Replacement Template File <span className="text-slate-400 font-normal">(.docx or .pdf)</span>
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                                    file
                                        ? 'border-amber-500 bg-amber-50/40'
                                        : errors.file
                                          ? 'border-red-400 bg-red-50/30'
                                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
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
                                        <FileText className="w-8 h-8 text-amber-600" />
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-700 font-semibold">
                                            Click to browse new template file
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Word document (.docx) or PDF • Max 10 MB
                                        </p>
                                    </>
                                )}
                            </div>
                            {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                        </div>

                        {/* ── Action Buttons ── */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <Link
                                href="/certificate-templates"
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-xs text-sm disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {isSubmitting ? 'Saving Template...' : 'Save & Update Template'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PortalLayout>
    );
}
