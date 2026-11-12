import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CertificateTemplate, PageProps } from '@/types';
import { Award, FileText, Upload, Printer, CheckCircle, RefreshCw, FileCheck } from 'lucide-react';

interface Props extends PageProps {
    templates: CertificateTemplate[];
}

export default function Index({ auth, templates }: Props) {
    const baptismTemplate = templates.find((t) => t.sacrament_type === 'baptism');
    const confirmationTemplate = templates.find((t) => t.sacrament_type === 'confirmation');

    return (
        <PortalLayout activeTab="certificate_templates">
            <Head title="Certificate Generator & Templates" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20">
                                Official Church Certificates
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Certificate Generator & Templates
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Generate and print official <strong>Baptismal</strong> and <strong>Confirmation</strong> certificates with auto-population from register records or manual editing.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/certificate-templates/preview?sacrament_type=baptism"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-sm text-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Open Certificate Generator
                        </Link>
                    </div>
                </div>

                {/* ── Two Primary Sacraments Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Baptismal Card */}
                    <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    <FileCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                                        Sacrament of Initiation
                                    </span>
                                    <h2 className="text-lg font-bold text-slate-900">Baptismal Certificate</h2>
                                    <span className="text-xs text-slate-400">
                                        Active template: {baptismTemplate?.filename || 'default_baptism.docx'}
                                    </span>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg">
                                Ready
                            </span>
                        </div>

                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            Official RCAL Baptismal Certificate template featuring St. Joseph the Worker Parish header, watermark, child & parent citations, sponsor roster, and pastoral seal.
                        </p>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <Link
                                href="/certificate-templates/preview?sacrament_type=baptism"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-xs"
                            >
                                <Printer className="w-4 h-4" />
                                Generate & Print
                            </Link>

                            <Link
                                href="/certificate-templates/create?sacrament_type=baptism"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                                title="Upload a new DOCX template to update this certificate"
                            >
                                <Upload className="w-4 h-4" />
                                Update File
                            </Link>
                        </div>
                    </div>

                    {/* Confirmation Card */}
                    <div className="bg-white rounded-2xl border-2 border-amber-500/30 p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                                    <Award className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                                        Sacrament of Initiation
                                    </span>
                                    <h2 className="text-lg font-bold text-slate-900">Confirmation Certificate</h2>
                                    <span className="text-xs text-slate-400">
                                        Active template: {confirmationTemplate?.filename || 'default_confirmation.docx'}
                                    </span>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg">
                                Ready
                            </span>
                        </div>

                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            Official RCAL Confirmation Certificate template featuring gold jubilee filigree, confirmand registry citation, sponsor acknowledgments, and parish priest signature.
                        </p>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <Link
                                href="/certificate-templates/preview?sacrament_type=confirmation"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-xs"
                            >
                                <Printer className="w-4 h-4" />
                                Generate & Print
                            </Link>

                            <Link
                                href="/certificate-templates/create?sacrament_type=confirmation"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                                title="Upload a new DOCX template to update this certificate"
                            >
                                <Upload className="w-4 h-4" />
                                Update File
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── Guidance Note ── */}
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">
                    <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Default Church Templates Active
                    </h3>
                    <p>
                        The system is pre-configured with the official <strong>St. Joseph the Worker Parish</strong> DOCX certificate designs. Selecting either sacrament in the generator will auto-populate completed records from the Canonical Registers or allow you to edit all details manually before printing.
                    </p>
                </div>
            </div>
        </PortalLayout>
    );
}
