import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { Clergy, PageProps, Parish, SacramentSchedule, SacramentType } from '@/types';
import { BookOpen, Calendar, User as UserIcon, Users, FileText, CheckCircle2 } from 'lucide-react';

interface Props extends PageProps {
    parishes: Parish[];
    clergy: Clergy[];
    prefillSchedule?: SacramentSchedule | null;
}

export default function Create({ auth, parishes, clergy, prefillSchedule }: Props) {
    const defaultParishId = auth.user?.home_parish_id || (parishes.length > 0 ? parishes[0].id : '');

    // Map schedule sacrament_type to record sacrament_type if prefilling
    const getInitialSacramentType = (): SacramentType => {
        if (!prefillSchedule) return 'baptism';
        const type = prefillSchedule.sacrament_type;
        if (type === 'wedding') return 'marriage';
        if (type === 'funeral') return 'death';
        if (type === 'confirmation') return 'confirmation';
        return 'baptism';
    };

    const { data, setData, post, processing, errors } = useForm({
        originating_parish_id: defaultParishId,
        sacrament_type: getInitialSacramentType(),
        event_date: prefillSchedule?.starts_at ? prefillSchedule.starts_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        book_number: 1,
        page_number: 1,
        entry_number: 1,
        performed_by_clergy_id: prefillSchedule?.presiding_clergy_id || '',

        // Subject
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        sex: 'male',
        date_of_birth: '',
        place_of_birth: '',
        father_name: '',
        mother_name: '',

        // Marriage
        spouse_first_name: '',
        spouse_last_name: '',

        // Canonical Attributes
        legitimacy: 'legitimate',
        godparents: '',
        witnesses: '',
        place_of_event: prefillSchedule?.venue?.name || '',
        register_notes: '',

        from_schedule_id: prefillSchedule?.id || '',
    });
    
    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/records');
    };

    return (
        <PortalLayout
            title="Inscribe Canonical Register Entry"
            subtitle="Canonical record transcription conforming to Code of Canon Law Can. 535 §1"
        >
            <Head title="Inscribe Canonical Register Entry - RCAL PIMS" />

            <div className="max-w-5xl mx-auto space-y-6">
                {prefillSchedule && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-900 shadow-xs">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <span className="font-bold">Linked Schedule #{prefillSchedule.id}:</span>{' '}
                                <span className="text-slate-700">{prefillSchedule.title} ({prefillSchedule.starts_at.slice(0, 10)})</span>
                            </div>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                            Auto-transcribing
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Sacrament Register & Legal Citation (Crisp White) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-2 text-amber-700 border-b border-slate-200 pb-3">
                            <BookOpen className="w-5 h-5" />
                            <h2 className="font-serif text-lg font-bold text-slate-900">
                                1. Canonical Register & Legal Citation (Can. 535)
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Sacrament Type <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.sacrament_type}
                                    onChange={(e) => setData('sacrament_type', e.target.value as SacramentType)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="baptism">Baptism (Baptismus)</option>
                                    <option value="confirmation">Confirmation (Confirmatio)</option>
                                    <option value="marriage">Marriage (Matrimonium)</option>
                                    <option value="death">Death (Defunctis)</option>
                                </select>
                                {errors.sacrament_type && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.sacrament_type}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Book / Volume No. <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.book_number}
                                    onChange={(e) => setData('book_number', parseInt(e.target.value) || 1)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.book_number && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.book_number}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Page / Folio No. <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.page_number}
                                    onChange={(e) => setData('page_number', parseInt(e.target.value) || 1)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.page_number && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.page_number}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Entry No. <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.entry_number}
                                    onChange={(e) => setData('entry_number', parseInt(e.target.value) || 1)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.entry_number && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.entry_number}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Originating Parish <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.originating_parish_id}
                                    disabled={!auth.user?.is_archdiocese_wide}
                                    onChange={(e) => setData('originating_parish_id', parseInt(e.target.value))}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-60 shadow-2xs transition-colors"
                                >
                                    {parishes.map((parish) => (
                                        <option key={parish.id} value={parish.id}>
                                            {parish.name} {parish.city_municipality ? `(${parish.city_municipality})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.originating_parish_id && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.originating_parish_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Event Date <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.event_date}
                                    onChange={(e) => setData('event_date', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.event_date && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.event_date}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Officiating Minister (Clergy)
                                </label>
                                <select
                                    value={data.performed_by_clergy_id}
                                    onChange={(e) => setData('performed_by_clergy_id', e.target.value ? parseInt(e.target.value) : '')}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="">-- Select Clergy --</option>
                                    {clergy.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} {c.first_name} {c.last_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.performed_by_clergy_id && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.performed_by_clergy_id}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Subject Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-2 text-amber-700 border-b border-slate-200 pb-3">
                            <UserIcon className="w-5 h-5" />
                            <h2 className="font-serif text-lg font-bold text-slate-900">
                                2. Subject Details ({data.sacrament_type === 'marriage' ? 'Groom' : 'Person'})
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    First Name <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    placeholder="e.g. Juan"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.first_name && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.first_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                                <input
                                    type="text"
                                    value={data.middle_name}
                                    onChange={(e) => setData('middle_name', e.target.value)}
                                    placeholder="e.g. Santos"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Last Name <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.last_name}
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    placeholder="e.g. Dela Cruz"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.last_name && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.last_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Suffix</label>
                                <select
                                    value={data.suffix}
                                    onChange={(e) => setData('suffix', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="">None</option>
                                    <option value="Jr.">Jr.</option>
                                    <option value="Sr.">Sr.</option>
                                    <option value="II">II</option>
                                    <option value="III">III</option>
                                    <option value="IV">IV</option>
                                    <option value="V">V</option>
                                    <option value="VI">VI</option>
                                </select>
                                {errors.suffix && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.suffix}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Sex <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.sex}
                                    onChange={(e) => setData('sex', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    max={today}
                                    value={data.date_of_birth}
                                    onChange={(e) => setData('date_of_birth', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Birth</label>
                                <input
                                    type="text"
                                    value={data.place_of_birth}
                                    onChange={(e) => setData('place_of_birth', e.target.value)}
                                    placeholder="City/Municipality, Province"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Full Name</label>
                                <input
                                    type="text"
                                    value={data.father_name}
                                    onChange={(e) => setData('father_name', e.target.value)}
                                    placeholder="First Name, Middle, Last Name"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Mother's Full Maiden Name</label>
                                <input
                                    type="text"
                                    value={data.mother_name}
                                    onChange={(e) => setData('mother_name', e.target.value)}
                                    placeholder="First Name, Middle, Maiden Last Name"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Marriage-Specific Section (if Marriage) */}
                    {data.sacrament_type === 'marriage' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center gap-2 text-amber-700 border-b border-slate-200 pb-3">
                                <Users className="w-5 h-5" />
                                <h2 className="font-serif text-lg font-bold text-slate-900">
                                    3. Bride Details (Sponsa)
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Bride First Name <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.spouse_first_name}
                                        onChange={(e) => setData('spouse_first_name', e.target.value)}
                                        placeholder="e.g. Maria"
                                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Bride Maiden Last Name <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.spouse_last_name}
                                        onChange={(e) => setData('spouse_last_name', e.target.value)}
                                        placeholder="e.g. Santos"
                                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Canonical Attributes, Sponsors, Witnesses */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-2 text-amber-700 border-b border-slate-200 pb-3">
                            <FileText className="w-5 h-5" />
                            <h2 className="font-serif text-lg font-bold text-slate-900">
                                4. Canonical Details & Sponsors
                            </h2>
                        </div>

                        {data.sacrament_type === 'baptism' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Legitimacy Status</label>
                                    <select
                                        value={data.legitimacy}
                                        onChange={(e) => setData('legitimacy', e.target.value)}
                                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                    >
                                        <option value="legitimate">Legitimate</option>
                                        <option value="illegitimate">Illegitimate</option>
                                        <option value="legitimated">Legitimated by Subsequent Marriage</option>
                                        <option value="unknown">Unknown</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Event</label>
                                    <input
                                        type="text"
                                        value={data.place_of_event}
                                        onChange={(e) => setData('place_of_event', e.target.value)}
                                        placeholder="Parish Church / Chapel"
                                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Godparents / Sponsors (Patrini)
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.godparents}
                                    onChange={(e) => setData('godparents', e.target.value)}
                                    placeholder="List sponsors separated by commas or newlines..."
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Witnesses (Testes)
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.witnesses}
                                    onChange={(e) => setData('witnesses', e.target.value)}
                                    placeholder="List formal witnesses..."
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Initial Register Notes / Canonical Observations
                            </label>
                            <textarea
                                rows={2}
                                value={data.register_notes}
                                onChange={(e) => setData('register_notes', e.target.value)}
                                placeholder="Any special canonical dispensations, annotations made at inscription, or ledger conditions..."
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                            />
                        </div>
                    </div>

                    {/* Notice on Immutability */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-slate-700">
                        <span className="font-bold text-amber-800">Canonical Invariant Notice (Can. 535 §1):</span> Once inscribed, this initial canonical entry becomes permanent and strictly immutable. Any future additions, corrections, or life events must be appended as marginal annotations signed by authorized clergy or chancery officials.
                    </div>

                    <FormActions
                        submitLabel="Inscribe into Canonical Register"
                        cancelHref="/records"
                        processing={processing}
                    />
                </form>
            </div>
        </PortalLayout>
    );
}
