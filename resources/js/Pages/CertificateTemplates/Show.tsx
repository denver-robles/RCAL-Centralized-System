import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, PageProps } from '@/types';
import { FileText, Edit3, Printer, ArrowLeft, Calendar, Layers } from 'lucide-react';

interface Props extends PageProps {
    template: CertificateTemplate;
}

/**
 * Show page for a single Certificate Template.
 *
 * WHAT IT SHOWS
 * ─────────────────────────────────────────
 * • Template metadata: name, paper size, parish, created/updated dates.
 * • Full list of detected placeholders.
 * • Action buttons: Edit, Preview, Back.
 *
 * WHO CAN ACCESS
 * ─────────────────────────────────────────
 * Any staff member who can view the template (policy-enforced).
 */
export default function Show({ auth, template }: Props) {
    const canManage = auth.user && ['admin', 'chancery', 'parish_staff'].includes(auth.user.role);

    return (
        <PortalLayout activeTab="certificate_templates">
            <Head title={`Template: ${template.name}`} />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Link */}
                <Link
                    href="/certificate-templates"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Templates
                </Link>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {/* ── Header ── */}
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                                    <FileText className="w-7 h-7 text-amber-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {template.paper_size === 'a4' ? 'A4 Paper' : 'Short Bond'} • Template #{template.id}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/certificate-templates/${template.id}/preview`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition"
                                >
                                    <Printer className="w-4 h-4" /> Preview
                                </Link>
                                {canManage && (
                                    <Link
                                        href={`/certificate-templates/${template.id}/edit`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                    >
                                        <Edit3 className="w-4 h-4" /> Edit
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Details Grid ── */}
                    <div className="p-6 sm:p-8 space-y-6">
                        {/* Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                    <Layers className="w-4 h-4" />
                                    Paper Size
                                </div>
                                <p className="font-semibold text-slate-900">
                                    {template.paper_size === 'a4' ? 'A4 (210mm × 297mm)' : 'Short Bond (8.5″ × 11″)'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                    <FileText className="w-4 h-4" />
                                    Source File
                                </div>
                                <p className="font-semibold text-slate-900 truncate text-sm">
                                    {template.filename}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                    <Calendar className="w-4 h-4" />
                                    Last Updated
                                </div>
                                <p className="font-semibold text-slate-900 text-sm">
                                    {new Date(template.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Parish */}
                        {template.parish && (
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">Parish</h3>
                                <p className="text-slate-900 font-medium">{template.parish.name}</p>
                            </div>
                        )}

                        {/* Placeholders */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-3">
                                Detected Placeholders ({template.placeholders?.length || 0})
                            </h3>
                            {template.placeholders && template.placeholders.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {template.placeholders.map((p) => (
                                        <span
                                            key={p}
                                            className="inline-block px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono"
                                        >
                                            {`{{${p}}}`}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">
                                    No placeholders detected. You can add them by editing the template.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}

