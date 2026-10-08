import React from 'react';
import { Head } from '@inertiajs/react';
import { CertificateRequest, PageProps } from '@/types';
import { Printer, ShieldCheck } from 'lucide-react';

interface Props extends PageProps {
    certificate: CertificateRequest;
}

export default function Print({ certificate }: Props) {
    const record = certificate.record;
    const person = record?.person;
    const parish = record?.originatingParish;

    const getLatinTitle = (type?: string) => {
        switch (type) {
            case 'baptism':
                return 'TESTIMONIUM BAPTISMI';
            case 'confirmation':
                return 'TESTIMONIUM CONFIRMATIONIS';
            case 'marriage':
                return 'TESTIMONIUM MATRIMONII';
            case 'death':
                return 'TESTIMONIUM DEFUNCTORUM';
            default:
                return 'TESTIMONIUM SACRAMENTI';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 text-slate-900 print:bg-white print:p-0 font-sans">
            <Head title={`Print Certificate ${certificate.certificate_number} - RCAL PIMS`} />

            {/* Print toolbar - hidden during print */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl text-slate-900 print:hidden shadow-sm">
                <div>
                    <span className="font-bold text-sm text-slate-900">Official Archdiocesan Certificate Preview</span>
                    <p className="text-xs text-slate-500">Ready for Archdiocesan archival stock parchment printing.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all duration-200"
                    >
                        <Printer className="w-4 h-4" />
                        Print Document (Ctrl+P)
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="btn-cancel text-xs py-2 px-4 rounded-xl"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Parchment Certificate Canvas */}
            <div className="max-w-4xl mx-auto bg-amber-50/95 text-slate-900 border-8 border-double border-amber-900/60 p-12 rounded-sm shadow-2xl print:border-8 print:shadow-none print:m-0 print:w-full print:max-w-none print:bg-white">
                {/* Header */}
                <div className="text-center space-y-2 border-b-2 border-amber-900/40 pb-6 mb-8">
                    <div className="flex justify-center mb-2">
                        <img
                            src="/images/logo.png"
                            alt="RCAL Logo"
                            className="w-20 h-20 object-contain filter drop-shadow-sm"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="font-serif tracking-widest text-xs uppercase text-amber-900 font-bold">
                        Archidioecesis Lipensis • Roman Catholic Archdiocese of Lipa
                    </div>
                    <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-950 uppercase">
                        {parish?.name || 'Parish of the Archdiocese'}
                    </h1>
                    <p className="text-xs text-slate-700">
                        {parish?.address || ''} {parish?.city_municipality ? `• ${parish.city_municipality}` : ''}
                        {parish?.vicariate?.name ? ` • Vicariate of ${parish.vicariate.name}` : ''}
                    </p>
                </div>

                {/* Certificate Title */}
                <div className="text-center my-6 space-y-1">
                    <div className="font-serif italic text-sm tracking-wider text-amber-900">
                        {getLatinTitle(record?.sacrament_type)}
                    </div>
                    <h2 className="font-serif text-3xl font-extrabold uppercase tracking-wide text-slate-950 border-y border-amber-900/30 py-2 inline-block px-8">
                        Certificate of {record?.sacrament_type ? record.sacrament_type.toUpperCase() : 'SACRAMENT'}
                    </h2>
                </div>

                {/* Body Text */}
                <div className="space-y-6 my-10 font-serif text-base leading-relaxed text-justify px-4">
                    <p className="indent-8">
                        This is to certify according to the Canonical Registers kept in the Archives of this Parish that:
                    </p>

                    <div className="text-center py-4 bg-amber-100/50 border-y border-amber-800/20 my-4">
                        <span className="block text-2xl font-bold text-slate-950 tracking-wider">
                            {person?.full_name?.toUpperCase() || 'SUBJECT PERSON'}
                        </span>
                        {record?.sacrament_type === 'marriage' && record.spouse && (
                            <span className="block text-lg font-medium text-slate-800 mt-1">
                                and {record.spouse.full_name?.toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 text-sm">
                        <p>
                            <span className="font-semibold">Child of:</span>{' '}
                            {person?.father_name || '—'} and {person?.mother_name || '—'}
                        </p>
                        <p>
                            <span className="font-semibold">Born on:</span>{' '}
                            {person?.date_of_birth || '—'}{' '}
                            <span className="font-semibold ml-6">at:</span> {person?.place_of_birth || '—'}
                        </p>
                        <p>
                            <span className="font-semibold">Solemnly Received the Sacrament on:</span>{' '}
                            <span className="font-bold underline">
                                {record?.event_date ? new Date(record.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                            </span>
                        </p>
                        <p>
                            <span className="font-semibold">By the Minister:</span>{' '}
                            {record?.performed_by_clergy
                                ? `${record.performed_by_clergy.title} ${record.performed_by_clergy.first_name} ${record.performed_by_clergy.last_name}`
                                : 'Assigned Officiating Minister'}
                        </p>
                        {record?.godparents && (
                            <p>
                                <span className="font-semibold">Sponsors / Godparents:</span> {record.godparents}
                            </p>
                        )}
                        {record?.witnesses && (
                            <p>
                                <span className="font-semibold">Witnesses:</span> {record.witnesses}
                            </p>
                        )}
                    </div>

                    {/* Canonical Citation Block */}
                    <div className="bg-amber-100/70 p-3 rounded border border-amber-800/30 text-xs font-mono text-center">
                        Canonical Register Citation: Book / Volume {record?.book_number}, Page / Folio {record?.page_number}, Entry No. {record?.entry_number}
                    </div>

                    {/* Can. 535 §2 Marginal Annotations */}
                    {record?.annotations && record.annotations.length > 0 && (
                        <div className="border-t border-amber-900/30 pt-3 text-xs">
                            <span className="font-bold uppercase tracking-wider text-amber-900 block mb-1">
                                Canonical Marginal Annotations (Can. 535 §2):
                            </span>
                            <ul className="list-disc list-inside space-y-1">
                                {record.annotations.map((ann) => (
                                    <li key={ann.id}>
                                        <span className="font-semibold capitalize">{ann.annotation_type}:</span> {ann.note_text}{' '}
                                        {ann.decree_reference && `[Ref: ${ann.decree_reference}]`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Signatures and Dry Seal block */}
                <div className="grid grid-cols-2 gap-8 pt-12 mt-8 border-t-2 border-amber-900/40 text-center font-serif">
                    <div className="flex flex-col items-center justify-end">
                        <div className="w-48 border-b border-slate-900 mb-2"></div>
                        <span className="text-xs uppercase font-semibold text-slate-800">Parish Secretary / Clerk</span>
                        <span className="text-[11px] text-slate-600">Recorded & Prepared</span>
                    </div>

                    <div className="flex flex-col items-center justify-end">
                        <div className="w-56 border-b border-slate-900 mb-2"></div>
                        <span className="text-xs uppercase font-bold text-slate-950">Parish Priest / Parochial Vicar</span>
                        <span className="text-[11px] text-slate-600">Archdiocesan Curia Jurisdiction</span>
                    </div>
                </div>

                {/* Dry Seal & Crypto verification block */}
                <div className="mt-12 pt-6 border-t border-amber-900/20 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 border-2 border-dashed border-amber-800/40 rounded-full flex items-center justify-center text-[9px] uppercase font-bold text-amber-900/60 text-center leading-tight">
                            Affix Dry Seal Here
                        </div>
                        <div className="space-y-0.5">
                            <div>
                                <span className="font-semibold text-slate-800">Certificate Series:</span>{' '}
                                <span className="font-mono font-bold text-slate-950">{certificate.certificate_number}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-800">Date Issued:</span>{' '}
                                {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="text-right space-y-0.5">
                        <div className="flex items-center justify-end gap-1 text-emerald-800 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Archdiocesan Cryptographic Token
                        </div>
                        <div className="font-mono text-[9px] text-slate-500 max-w-xs truncate">
                            {certificate.verification_token}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
