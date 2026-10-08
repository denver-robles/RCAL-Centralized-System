import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { PageProps, Parish, SacramentType } from '@/types';
import { FileText, ShieldCheck } from 'lucide-react';

interface Props extends PageProps {
    parishes: Parish[];
}

export default function RequestCreate({ parishes }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        targeted_parish_id: '',
        sacrament_type: 'baptism' as SacramentType,
        name_on_record: '',
        date_of_birth: '',
        date_of_sacrament: '',
        place_of_sacrament: '',
        parents_or_spouse: '',
        relationship_to_owner: 'Self',
        purpose: 'Personal Copy & Documentation',
        consent_given: false,
        id_document: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/portal/requests', {
            forceFormData: true,
        });
    };

    return (
        <PortalLayout
            title="File Document Claim & Certificate Request"
            subtitle="Apply for certified sacramental certificates with Data Privacy (RA 10173) compliance"
        >
            <Head title="File Document Claim - RCAL PIMS" />

            <div className="max-w-3xl mx-auto space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Target Parish & Sacrament */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <FileText className="w-5 h-5 text-amber-600" />
                            1. Target Parish & Requested Record
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Target Parish / Registry
                                </label>
                                <select
                                    value={data.targeted_parish_id}
                                    onChange={(e) => setData('targeted_parish_id', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                >
                                    <option value="">-- Archdiocesan Curia Chancery (All Parishes) --</option>
                                    {parishes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.city_municipality ? `(${p.city_municipality})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                    If unsure which parish holds the entry, leave blank for Chancery search.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Sacrament Type <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.sacrament_type}
                                    onChange={(e) => setData('sacrament_type', e.target.value as SacramentType)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                >
                                    <option value="baptism">Certificate of Baptism</option>
                                    <option value="confirmation">Certificate of Confirmation</option>
                                    <option value="marriage">Certificate of Marriage</option>
                                    <option value="death">Certificate of Death / Funeral</option>
                                </select>
                                {errors.sacrament_type && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.sacrament_type}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Inscription Subject Information */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <FileText className="w-5 h-5 text-amber-600" />
                            2. Record Inscription Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Full Name on Ledger Entry <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name_on_record}
                                    onChange={(e) => setData('name_on_record', e.target.value)}
                                    placeholder="e.g. Maria Theresa Cruz Santos"
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition placeholder:text-slate-400"
                                />
                                {errors.name_on_record && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.name_on_record}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Date of Birth <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={(e) => setData('date_of_birth', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                />
                                {errors.date_of_birth && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.date_of_birth}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Date of Sacrament (if known)
                                </label>
                                <input
                                    type="date"
                                    value={data.date_of_sacrament}
                                    onChange={(e) => setData('date_of_sacrament', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Place / Church of Sacrament
                                </label>
                                <input
                                    type="text"
                                    value={data.place_of_sacrament}
                                    onChange={(e) => setData('place_of_sacrament', e.target.value)}
                                    placeholder="e.g. San Sebastian Cathedral, Lipa City"
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Parents' Full Names (or Spouse if Marriage)
                            </label>
                            <input
                                type="text"
                                value={data.parents_or_spouse}
                                onChange={(e) => setData('parents_or_spouse', e.target.value)}
                                placeholder="Father's Name & Mother's Maiden Name (or Spouse's Name)"
                                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Step 3: Requester Relationship & Purpose */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <ShieldCheck className="w-5 h-5 text-amber-600" />
                            3. Requester Credentials & Purpose
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Relationship to Document Owner <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.relationship_to_owner}
                                    onChange={(e) => setData('relationship_to_owner', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                >
                                    <option value="Self">Self (Record Owner)</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Legal Guardian">Legal Guardian</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Child">Child / Offspring</option>
                                    <option value="Authorized Representative">Authorized Representative</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Intended Purpose of Certificate <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.purpose}
                                    onChange={(e) => setData('purpose', e.target.value)}
                                    placeholder="e.g. Marriage License Application, Confirmation, School Requirement..."
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition placeholder:text-slate-400"
                                />
                                {errors.purpose && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.purpose}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Upload Valid Government-Issued ID (Optional / Recommended)
                            </label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setData('id_document', e.target.files ? e.target.files[0] : null)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                            />
                            <span className="text-[11px] text-slate-500 mt-1 block">
                                Accepted formats: JPG, PNG, PDF (Max 5MB). Accelerates identity verification by the Parish Secretary.
                            </span>
                        </div>
                    </div>

                    {/* Step 4: Mandatory RA 10173 Data Privacy Consent */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-amber-700">
                            <ShieldCheck className="w-5 h-5 text-amber-600" />
                            <h3 className="font-serif text-base font-bold text-slate-900">
                                Mandatory Data Privacy Consent (Republic Act No. 10173)
                            </h3>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                            Under the Philippine Data Privacy Act of 2012 (RA 10173), canonical registers contain personal and sensitive personal information. In accordance with Archdiocesan Curia guidelines, records are disclosed solely to the data subject or authorized representatives upon proof of identity.
                        </p>

                        <label className="flex items-start gap-3 text-xs text-slate-800 cursor-pointer pt-2">
                            <input
                                type="checkbox"
                                checked={data.consent_given}
                                onChange={(e) => setData('consent_given', e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                                I hereby certify that the information provided is true and correct, and I explicitly consent to the collection, verification, and processing of my personal details by the Roman Catholic Archdiocese of Lipa for canonical record authentication.
                            </span>
                        </label>
                        {errors.consent_given && (
                            <p className="text-rose-600 text-xs font-medium">{errors.consent_given}</p>
                        )}
                    </div>

                    <FormActions
                        submitLabel="Submit Document Claim"
                        cancelHref="/portal/dashboard"
                        processing={processing || !data.consent_given}
                    />
                </form>
            </div>
        </PortalLayout>
    );
}
