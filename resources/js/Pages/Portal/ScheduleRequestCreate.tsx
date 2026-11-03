import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { Clergy, PageProps, Parish, SacramentSetting } from '@/types';
import { parseSacramentDate } from '@/utils/date';
import { Calendar, User, FileText, Upload, AlertTriangle, ShieldCheck, CheckCircle2, Info, Heart, Users, CheckSquare, AlertCircle } from 'lucide-react';

interface Props extends PageProps {
    parishes: Parish[];
    clergy?: Clergy[];
    settings?: SacramentSetting[];
}

export default function ScheduleRequestCreate({ auth, parishes, clergy = [], settings = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        // Requestor Details
        requester_name: auth.user?.display_name || '',
        requester_contact: '',
        requester_email: auth.user?.email || '',
        requester_relationship: 'Parent',
        requester_address: '',
        
        // Scheduling Details
        parish_id: parishes.length === 1 ? parishes[0].id.toString() : '',
        sacrament_type: 'baptism',
        starts_at: '',
        alternative_starts_at: '',
        requested_clergy_id: '',
        certificate_submission_mode: 'online', // 'online' | 'follow_up_office'
        
        // Sacrament Specific Data
        specific_data: {
            // Baptism
            child_name: '',
            dob: '',
            place_of_birth: '',
            gender: 'Male',
            father_name: '',
            mother_name: '',
            parents_married: 'married', // 'married' | 'not_married'
            parents_status: 'Married (Catholic Church)',
            godparents: '',
            resides_within_parish: 'yes', // 'yes' | 'no'
            special_notes: '',

            // Blessing
            blessing_category: 'House Blessing',
            venue_type: 'Off-site/At the specified address',
            transport_arrangement: 'Requestor will pick up/drop off the priest',
            complete_address: '',
            landmarks: '',
            onsite_contact_name: '',
            onsite_contact_number: '',
            vehicle_make_model: '',
            business_name: '',

            // Confirmation
            candidate_name: '',
            candidate_dob: '',
            candidate_gender: 'Male',
            candidate_father_name: '',
            candidate_mother_name: '',
            baptism_parish: '',
            baptism_date: '',
            godparent_name: '',
            godparent_age: '',
            godparent_certificate_type: 'confirmation', // 'confirmation' | 'marriage'
            confirmation_resides_within_parish: 'yes', // 'yes' | 'no'

            // Matrimony / Wedding
            groom_name: '',
            groom_dob: '',
            groom_pob: '',
            groom_father_name: '',
            groom_mother_name: '',
            groom_parish: '',
            groom_is_foreign_or_ofw: 'no', // 'yes' | 'no'
            bride_name: '',
            bride_dob: '',
            bride_pob: '',
            bride_father_name: '',
            bride_mother_name: '',
            bride_parish: '',
            bride_is_foreign_or_ofw: 'no', // 'yes' | 'no'
            witnesses: '',
        } as Record<string, any>,
        
        // Attachments
        gov_id: null as File | null,
        psa_birth_cert: null as File | null,
        confirmation_cert_godparents: null as File | null,
        marriage_cert_parents: null as File | null,
        baptismal_cert_father: null as File | null,
        baptismal_cert_mother: null as File | null,
        baptismal_cert_subject: null as File | null,
        baptismal_permit: null as File | null,
        confirmation_permit: null as File | null,
        cenomar: null as File | null,
        prev_certificate: null as File | null,
    });

    const calculateAge = (dobString?: string): number | null => {
        if (!dobString) return null;
        const dob = new Date(dobString);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    };

    const handleSpecificDataChange = (key: string, value: any) => {
        setData('specific_data', { ...data.specific_data, [key]: value });
    };

    // Find active setting for selected parish and sacrament
    const currentSetting = settings.find(
        s => s.parish_id?.toString() === data.parish_id.toString() && s.sacrament_type === data.sacrament_type
    );

    const allowedDays = currentSetting?.allowed_days && currentSetting.allowed_days.length > 0
        ? currentSetting.allowed_days
        : (data.sacrament_type === 'baptism' ? ['saturday', 'sunday'] : null);

    const getDayName = (dateString: string): string => {
        if (!dateString) return '';
        const date = parseSacramentDate(dateString);
        return date ? date.toLocaleDateString('en-US', { weekday: 'long' }) : '';
    };

    const isDateAllowed = (dateString: string): boolean => {
        if (!dateString || !allowedDays || allowedDays.length === 0) return true;
        const dayName = getDayName(dateString).toLowerCase();
        return allowedDays.map(d => d.toLowerCase()).includes(dayName);
    };

    const isStartInvalid = data.starts_at ? !isDateAllowed(data.starts_at) : false;
    const isAltInvalid = data.alternative_starts_at ? !isDateAllowed(data.alternative_starts_at) : false;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.sacrament_type !== 'confirmation' && isStartInvalid) {
            alert(`The selected preferred date (${getDayName(data.starts_at)}) is not available for this sacrament. Available days: ${allowedDays?.map(d => d.toUpperCase()).join(', ')}`);
            return;
        }

        if (data.sacrament_type === 'matrimony') {
            if (!data.specific_data.groom_name?.trim() || !data.specific_data.bride_name?.trim()) {
                alert('Please enter both the Groom (Husband) and Bride (Wife) full names for the matrimony appointment.');
                return;
            }
        }

        if (data.sacrament_type === 'confirmation') {
            const age = calculateAge(data.specific_data.candidate_dob);
            if (age !== null && age < 12) {
                if (!confirm(`Canonical Notice: The candidate is indicated as ${age} years old. Under Canon 891, the subject for Confirmation must be at least 12 years of age. Do you still wish to submit this application for parish evaluation?`)) {
                    return;
                }
            }
            const sponsorAge = parseInt(data.specific_data.godparent_age);
            if (!isNaN(sponsorAge) && sponsorAge < 16) {
                if (!confirm(`Canonical Notice: The godparent/witness is indicated as ${sponsorAge} years old. Under Canon 874 §1, sponsors must be at least 16 years of age. Do you still wish to proceed?`)) {
                    return;
                }
            }
        }

        post('/portal/schedule-requests', {
            forceFormData: true,
        });
    };

    return (
        <PortalLayout title="Sacramental Schedule Request" subtitle="Book a sacrament ceremony appointment with the parish" activeTab="portal_schedule">
            <Head title="Book Schedule - RCAL PIMS" />
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Adult Baptism / Conversion Escalate Notice */}
                    {data.sacrament_type === 'baptism' && (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-xs text-amber-900 space-y-2 shadow-xs">
                            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                Important Canonical Notice: Infant & Child Baptism
                            </div>
                            <p className="leading-relaxed">
                                This online scheduling form is strictly for <strong>infant and child baptisms (under 7 years of age)</strong>.
                            </p>
                            <p className="leading-relaxed">
                                <strong>Adult baptism</strong> (individuals aged 7 and above) and <strong>conversion / reception</strong> into the Roman Catholic Church require comprehensive canonical instruction, pastoral preparation, and the Order of Christian Initiation of Adults (OCIA/RCIA).
                                Please visit or contact the Parish Office directly to begin the appropriate catechetical process.
                            </p>
                        </div>
                    )}

                    {/* Confirmation Canonical Age & Schedule Notice */}
                    {data.sacrament_type === 'confirmation' && (
                        <div className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-100/40 border-2 border-amber-300 rounded-2xl p-5 text-xs text-amber-950 space-y-3 shadow-xs">
                            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                Canonical Norms for the Sacrament of Confirmation (Kumpil)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 text-xs font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                                        Subject Age: 12 Years Old &amp; Above
                                    </strong>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        Under Canon 891 and archdiocesan norms, the candidate for Confirmation must have reached the age of reason and discretion (at least 12 years of age).
                                    </p>
                                </div>
                                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 text-xs font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                                        Sponsor / Witness Age: 16 Years &amp; Above
                                    </strong>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        Under Canon 874 §1 / Canon 893, the godparent or witness must be a confirmed practicing Catholic at least 16 years of age.
                                    </p>
                                </div>
                            </div>
                            <div className="bg-amber-100/60 p-2.5 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Schedule &amp; Minister Assignment:</strong> Confirmation dates are scheduled in communal rites or episcopal pastoral visits. The specific ceremony date and presiding minister are <strong>assigned directly by the parish office</strong> upon evaluating your submitted canonical documents.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Matrimony / Wedding Canonical Notice & Document Rule */}
                    {data.sacrament_type === 'matrimony' && (
                        <div className="bg-gradient-to-r from-purple-50 via-pink-50/70 to-amber-50/50 border-2 border-purple-300 rounded-2xl p-5 text-xs text-purple-950 space-y-3 shadow-xs">
                            <div className="flex items-center gap-2 font-bold text-purple-900 text-sm">
                                <Heart className="w-5 h-5 text-purple-600 shrink-0" />
                                Archdiocesan Canonical Directives for Holy Matrimony (Kasal)
                            </div>
                            <p className="leading-relaxed text-[11px] text-purple-900">
                                Marriage is a sacred covenant and sacrament. In accordance with universal canon law and Archdiocesan norms, couples must complete canonical investigations, marriage banns publication, and pre-nuptial formation before the wedding ceremony can be solemnized.
                            </p>
                            <div className="bg-white/90 p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                                <strong className="text-purple-900 text-xs font-bold flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                                    Mandatory Physical Document Submission at Parish Office
                                </strong>
                                <p className="text-[11px] text-purple-800 leading-relaxed">
                                    <strong>All required marriage documents must be submitted physically in original copies to the Parish Secretariat.</strong> Online file uploads are not accepted for Holy Matrimony. You can file your booking request here, and the parish office will track your submitted documents and notify you of any pending requirements.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Phase 1: Requestor Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                            <User className="w-4 h-4 text-amber-600" /> 1. Requestor / Applicant Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    value={data.requester_name}
                                    onChange={e => setData('requester_name', e.target.value)}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                />
                                {errors.requester_name && <p className="text-xs text-rose-500 mt-1">{errors.requester_name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Contact Number (Landline or Mobile)</label>
                                <input
                                    type="text"
                                    value={data.requester_contact}
                                    onChange={e => setData('requester_contact', e.target.value)}
                                    required
                                    placeholder="e.g. 7562572 or 09171234567"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                />
                                {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Email Address</label>
                                <input
                                    type="email"
                                    value={data.requester_email}
                                    onChange={e => setData('requester_email', e.target.value)}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                />
                                {errors.requester_email && <p className="text-xs text-rose-500 mt-1">{errors.requester_email}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Relationship to Candidate / Contracting Party</label>
                                <select
                                    value={data.requester_relationship}
                                    onChange={e => setData('requester_relationship', e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="Groom">Groom (Husband)</option>
                                    <option value="Bride">Bride (Wife)</option>
                                    <option value="Parent">Parent (Father / Mother)</option>
                                    <option value="Legal Guardian">Legal Guardian</option>
                                    <option value="Godparent">Godparent (Ninong / Ninang)</option>
                                    <option value="Self">Self / Candidate</option>
                                    <option value="Representative">Authorized Representative</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Current Residential Address</label>
                                <input
                                    type="text"
                                    value={data.requester_address}
                                    onChange={e => setData('requester_address', e.target.value)}
                                    required
                                    placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Phase 2: Schedule & Parish Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                            <Calendar className="w-4 h-4 text-amber-600" /> 2. Parish & Liturgical Schedule
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Parish</label>
                                <select
                                    value={data.parish_id}
                                    onChange={e => setData('parish_id', e.target.value)}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">-- Select Parish --</option>
                                    {parishes.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.city_municipality})</option>
                                    ))}
                                </select>
                                {errors.parish_id && <p className="text-xs text-rose-500 mt-1">{errors.parish_id}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-slate-700">Sacrament / Ceremony</label>
                                <select
                                    value={data.sacrament_type}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        setData({
                                            ...data,
                                            sacrament_type: newType,
                                            certificate_submission_mode: newType === 'matrimony' ? 'follow_up_office' : data.certificate_submission_mode,
                                        });
                                    }}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="baptism">Baptism (Binyag)</option>
                                    <option value="matrimony">Matrimony / Wedding</option>
                                    <option value="confirmation">Confirmation (Kumpil)</option>
                                    <option value="anointing">Anointing of the Sick</option>
                                    <option value="blessing">Blessing</option>
                                </select>
                            </div>

                            {/* Confirmation: Parish Office assigns Date & Minister notice */}
                            {data.sacrament_type === 'confirmation' ? (
                                <div className="sm:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
                                    <div className="font-bold text-amber-900 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-amber-600" />
                                        Parish Office Assignment for Schedule &amp; Officiating Minister
                                    </div>
                                    <p className="leading-relaxed text-[11px] text-amber-800">
                                        <strong>Ceremony Date:</strong> The Sacrament of Confirmation (Kumpil) is administered communally or during episcopal pastoral visitations. Confirmation dates cannot be selected in advance by the applicant. Once your application and canonical documents are reviewed and approved, the parish office will assign and notify you of the designated schedule.
                                    </p>
                                    <p className="leading-relaxed text-[11px] text-amber-800">
                                        <strong>Presiding Minister:</strong> In accordance with Canon 882 of the Code of Canon Law, the ordinary minister of Confirmation is the Bishop or a priest endowed with the faculty by universal law or special grant. The celebrant is assigned directly by the parish and archdiocesan authority.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Allowed Days Notice */}
                                    {allowedDays && allowedDays.length > 0 && (
                                        <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-700">
                                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>
                                                Available Days for <strong>{data.sacrament_type.toUpperCase()}</strong>:
                                                <span className="font-bold text-amber-800 ml-1">
                                                    {allowedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                                                </span>
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Preferred Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={data.starts_at}
                                            onChange={e => setData('starts_at', e.target.value)}
                                            required
                                            className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 ${
                                                isStartInvalid ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 bg-white'
                                            }`}
                                        />
                                        {data.starts_at && (
                                            <p className={`text-[11px] mt-1 ${isStartInvalid ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                                                Selected: {getDayName(data.starts_at)} {isStartInvalid && '— Not an available day for this parish!'}
                                            </p>
                                        )}
                                        {errors.starts_at && <p className="text-xs text-rose-500 mt-1">{errors.starts_at}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Alternative Date & Time (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={data.alternative_starts_at}
                                            onChange={e => setData('alternative_starts_at', e.target.value)}
                                            className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 ${
                                                isAltInvalid ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 bg-white'
                                            }`}
                                        />
                                        {data.alternative_starts_at && (
                                            <p className={`text-[11px] mt-1 ${isAltInvalid ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                                                Selected: {getDayName(data.alternative_starts_at)} {isAltInvalid && '— Not an available day!'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Preferred Clergy with disclaimer */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Request Preferred Officiating Clergy (Optional)
                                        </label>
                                        <select
                                            value={data.requested_clergy_id}
                                            onChange={e => setData('requested_clergy_id', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">-- No Specific Preference (Assigned by Parish) --</option>
                                            {clergy.map(c => (
                                                <option key={c.id} value={c.id}>{c.titled_name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1.5 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Important Note on Clergy Request:</strong> Indicating a requested clergy is an expression of preference only. Officiating priest assignment is strictly subject to clergy availability, parish liturgical duties, and archdiocesan schedules and <strong>cannot be promised or guaranteed to be granted</strong>.
                                            </span>
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Phase 3: Baptismal Specific Data & Requirements */}
                    {data.sacrament_type === 'baptism' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                <FileText className="w-4 h-4 text-amber-600" /> 3. Candidate & Parent Information
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Candidate's Full Name (Child)</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.child_name || ''}
                                        onChange={e => handleSpecificDataChange('child_name', e.target.value)}
                                        required
                                        placeholder="First Name, Middle Name, Last Name"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={data.specific_data.dob || ''}
                                        onChange={e => handleSpecificDataChange('dob', e.target.value)}
                                        required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Gender / Sex</label>
                                    <select
                                        value={data.specific_data.gender || 'Male'}
                                        onChange={e => handleSpecificDataChange('gender', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Place of Birth (Hospital / Municipality)</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.place_of_birth || ''}
                                        onChange={e => handleSpecificDataChange('place_of_birth', e.target.value)}
                                        placeholder="e.g. Lipa City District Hospital, Lipa City, Batangas"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Father's Full Name</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.father_name || ''}
                                        onChange={e => handleSpecificDataChange('father_name', e.target.value)}
                                        required
                                        placeholder="First Name, Middle Name, Last Name"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Mother's Full Maiden Name</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.mother_name || ''}
                                        onChange={e => handleSpecificDataChange('mother_name', e.target.value)}
                                        required
                                        placeholder="Mother's Maiden Name (before marriage)"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Parents Marriage Status */}
                                <div className="sm:col-span-2 border-t pt-4">
                                    <label className="text-xs font-bold text-slate-900 mb-1.5 block">
                                        Parents' Marital Status
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            data.specific_data.parents_married === 'married' ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="parents_married"
                                                value="married"
                                                checked={data.specific_data.parents_married === 'married'}
                                                onChange={() => {
                                                    handleSpecificDataChange('parents_married', 'married');
                                                    handleSpecificDataChange('parents_status', 'Married (Catholic Church)');
                                                }}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Parents are Married</div>
                                                <div className="text-[11px] text-slate-500">Requires <strong>Parents' Marriage Certificate</strong></div>
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            data.specific_data.parents_married === 'not_married' ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="parents_married"
                                                value="not_married"
                                                checked={data.specific_data.parents_married === 'not_married'}
                                                onChange={() => {
                                                    handleSpecificDataChange('parents_married', 'not_married');
                                                    handleSpecificDataChange('parents_status', 'Not Married');
                                                }}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Parents are Not Married</div>
                                                <div className="text-[11px] text-slate-500">Requires <strong>Baptismal Certificates of Both Parents</strong></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Godparents / Witnesses */}
                                <div className="sm:col-span-2 border-t pt-4">
                                    <label className="text-xs font-bold text-slate-900 mb-1 block">
                                        Godparents / Witnesses (Ninong & Ninang)
                                    </label>
                                    <p className="text-[11px] text-slate-500 mb-2">
                                        Can. 874 requirement: At least one practicing Catholic sponsor who has received the Sacrament of Confirmation.
                                    </p>
                                    <textarea
                                        value={data.specific_data.godparents || ''}
                                        onChange={e => handleSpecificDataChange('godparents', e.target.value)}
                                        placeholder="List full names of Ninong and Ninang (e.g. Juan Perez, Maria Santos)"
                                        rows={3}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Territorial Vicinity Check */}
                                <div className="sm:col-span-2 border-t pt-4">
                                    <label className="text-xs font-bold text-slate-900 mb-1 block">
                                        Parish Territorial Jurisdiction
                                    </label>
                                    <div className="flex items-center gap-6 mt-1 text-xs text-slate-700">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="resides_within_parish"
                                                value="yes"
                                                checked={data.specific_data.resides_within_parish === 'yes'}
                                                onChange={() => handleSpecificDataChange('resides_within_parish', 'yes')}
                                            />
                                            <span>We reside within the territorial boundary of this parish</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="resides_within_parish"
                                                value="no"
                                                checked={data.specific_data.resides_within_parish === 'no'}
                                                onChange={() => handleSpecificDataChange('resides_within_parish', 'no')}
                                            />
                                            <span>We reside outside this parish boundary (Baptismal Permit required)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Phase 4: Submission Mode & Document Attachments */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-amber-600" /> 4. Required Canonical Certificates
                                </h3>

                                {/* Submission Mode Selector */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <label className="block text-xs font-bold text-slate-800">
                                        How will you submit the required certificates?
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            data.certificate_submission_mode === 'online' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="certificate_submission_mode"
                                                value="online"
                                                checked={data.certificate_submission_mode === 'online'}
                                                onChange={e => setData('certificate_submission_mode', e.target.value)}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Upload Digital Copies Online</div>
                                                <div className="text-[11px] text-slate-500">Attach scans or clear photos directly in this form.</div>
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            data.certificate_submission_mode === 'follow_up_office' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="certificate_submission_mode"
                                                value="follow_up_office"
                                                checked={data.certificate_submission_mode === 'follow_up_office'}
                                                onChange={e => setData('certificate_submission_mode', e.target.value)}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Follow Up Directly at Office</div>
                                                <div className="text-[11px] text-slate-500">Bring physical certificates to the parish office in person.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {data.certificate_submission_mode === 'follow_up_office' ? (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold">In-Person Document Submission Selected:</span>
                                            <p className="mt-1">
                                                You can submit this request now without uploading files. You must present the physical original and photocopies of the following certificates to the parish secretary before the scheduled date:
                                            </p>
                                            <ul className="list-disc list-inside mt-2 space-y-1 font-medium text-blue-950">
                                                <li>Child's PSA Birth Certificate</li>
                                                <li>Confirmation Certificate of the Witnesses / Godparent(s)</li>
                                                {data.specific_data.parents_married === 'married' ? (
                                                    <li>Parents' Marriage Certificate</li>
                                                ) : (
                                                    <li>Baptismal Certificates of Both Father and Mother</li>
                                                )}
                                                {data.specific_data.resides_within_parish === 'no' && (
                                                    <li>Baptismal Permit / Endorsement from territorial Parish</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">Upload clear JPG, PNG, or PDF copies (maximum 5MB per file):</p>

                                        {/* PSA Birth Cert */}
                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                            <label className="text-xs font-bold text-slate-800 block">1. Child's PSA Birth Certificate</label>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={e => setData('psa_birth_cert', e.target.files?.[0] || null)}
                                                className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                            />
                                        </div>

                                        {/* Confirmation Cert of Witnesses / Godparents */}
                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                            <label className="text-xs font-bold text-slate-800 block">
                                                2. Confirmation Certificate of the Witnesses or Godparents
                                            </label>
                                            <p className="text-[11px] text-slate-500 mb-1">Confirmation certificate showing sponsor is fully initiated into Catholic faith.</p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={e => setData('confirmation_cert_godparents', e.target.files?.[0] || null)}
                                                className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                            />
                                        </div>

                                        {/* Parents Marriage or Both Parents Baptismal */}
                                        {data.specific_data.parents_married === 'married' ? (
                                            <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                                <label className="text-xs font-bold text-slate-800 block">
                                                    3. Parents' Marriage Certificate (Church or Civil)
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    onChange={e => setData('marriage_cert_parents', e.target.files?.[0] || null)}
                                                    className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                                    <label className="text-xs font-bold text-slate-800 block">
                                                        3a. Father's Catholic Baptismal Certificate
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                        onChange={e => setData('baptismal_cert_father', e.target.files?.[0] || null)}
                                                        className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                                    />
                                                </div>
                                                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                                    <label className="text-xs font-bold text-slate-800 block">
                                                        3b. Mother's Catholic Baptismal Certificate
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                        onChange={e => setData('baptismal_cert_mother', e.target.files?.[0] || null)}
                                                        className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Baptismal Permit if non-resident */}
                                        {data.specific_data.resides_within_parish === 'no' && (
                                            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
                                                <label className="text-xs font-bold text-amber-900 block">
                                                    4. Baptismal Permit / Endorsement from Territorial Parish
                                                </label>
                                                <p className="text-[11px] text-amber-800 mb-1">Required since your residence is outside this parish's territorial boundaries.</p>
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    onChange={e => setData('baptismal_permit', e.target.files?.[0] || null)}
                                                    className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Phase 3 & 4: Confirmation Specific Data & Requirements */}
                    {data.sacrament_type === 'confirmation' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                <FileText className="w-4 h-4 text-amber-600" /> 3. Candidate &amp; Sponsor Information
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                        Candidate&apos;s Full Name (Subject for Confirmation)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.specific_data.candidate_name || ''}
                                        onChange={e => handleSpecificDataChange('candidate_name', e.target.value)}
                                        required
                                        placeholder="First Name, Middle Name, Last Name"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                                        {data.specific_data.candidate_dob && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                (calculateAge(data.specific_data.candidate_dob) ?? 0) >= 12
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                Age: {calculateAge(data.specific_data.candidate_dob)} yrs old
                                                {(calculateAge(data.specific_data.candidate_dob) ?? 0) >= 12
                                                    ? ' (Eligible: 12+)'
                                                    : ' (Under 12: Canon 891)'}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="date"
                                        value={data.specific_data.candidate_dob || ''}
                                        onChange={e => handleSpecificDataChange('candidate_dob', e.target.value)}
                                        required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Candidate must have reached the age of discretion (at least 12 years old under Canon 891).
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Gender / Sex</label>
                                    <select
                                        value={data.specific_data.candidate_gender || 'Male'}
                                        onChange={e => handleSpecificDataChange('candidate_gender', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Father&apos;s Full Name</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.candidate_father_name || ''}
                                        onChange={e => handleSpecificDataChange('candidate_father_name', e.target.value)}
                                        required
                                        placeholder="First Name, Middle Name, Last Name"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Mother&apos;s Full Maiden Name</label>
                                    <input
                                        type="text"
                                        value={data.specific_data.candidate_mother_name || ''}
                                        onChange={e => handleSpecificDataChange('candidate_mother_name', e.target.value)}
                                        required
                                        placeholder="Mother's Maiden Name (before marriage)"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Prior Catholic Baptism Details */}
                                <div className="sm:col-span-2 border-t pt-4">
                                    <label className="text-xs font-bold text-slate-900 mb-1 block">
                                        Candidate&apos;s Prior Catholic Baptism Details
                                    </label>
                                    <p className="text-[11px] text-slate-500 mb-3">
                                        Valid Catholic baptism is an absolute canonical prerequisite for Confirmation (Canon 889 §1).
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Parish Church of Baptism</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.baptism_parish || ''}
                                                onChange={e => handleSpecificDataChange('baptism_parish', e.target.value)}
                                                required
                                                placeholder="e.g. San Sebastian Cathedral, Lipa City"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Date of Baptism (if known)</label>
                                            <input
                                                type="date"
                                                value={data.specific_data.baptism_date || ''}
                                                onChange={e => handleSpecificDataChange('baptism_date', e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sponsor / Godparent Details */}
                                <div className="sm:col-span-2 border-t pt-4 space-y-3">
                                    <label className="text-xs font-bold text-slate-900 block">
                                        Sponsor / Godparent / Witness (Ninong or Ninang)
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Under Canon 874 §1 and Canon 893, the sponsor must be a confirmed, practicing Catholic who has completed 16 years of age.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name of Sponsor / Godparent</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godparent_name || ''}
                                                onChange={e => handleSpecificDataChange('godparent_name', e.target.value)}
                                                required
                                                placeholder="Full name of Ninong or Ninang"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-semibold text-slate-700">Age</label>
                                                {data.specific_data.godparent_age && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                        parseInt(data.specific_data.godparent_age) >= 16
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {parseInt(data.specific_data.godparent_age) >= 16 ? 'Valid (16+)' : 'Must be 16+'}
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                value={data.specific_data.godparent_age || ''}
                                                onChange={e => handleSpecificDataChange('godparent_age', e.target.value)}
                                                required
                                                placeholder="e.g. 25"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Godparent Certificate Selection */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 mt-2">
                                        <label className="text-xs font-bold text-slate-800 block">
                                            Canonical Document of the Sponsor
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                                            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${
                                                data.specific_data.godparent_certificate_type === 'confirmation'
                                                    ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                                                    : 'bg-white border-slate-200'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="godparent_certificate_type"
                                                    value="confirmation"
                                                    checked={data.specific_data.godparent_certificate_type === 'confirmation'}
                                                    onChange={() => handleSpecificDataChange('godparent_certificate_type', 'confirmation')}
                                                    className="mt-0.5 text-amber-600"
                                                />
                                                <div>
                                                    <span className="font-semibold block text-slate-900">Confirmation Certificate</span>
                                                    <span className="text-[11px] text-slate-500">Certificate of Confirmation of the sponsor.</span>
                                                </div>
                                            </label>
                                            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${
                                                data.specific_data.godparent_certificate_type === 'marriage'
                                                    ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                                                    : 'bg-white border-slate-200'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="godparent_certificate_type"
                                                    value="marriage"
                                                    checked={data.specific_data.godparent_certificate_type === 'marriage'}
                                                    onChange={() => handleSpecificDataChange('godparent_certificate_type', 'marriage')}
                                                    className="mt-0.5 text-amber-600"
                                                />
                                                <div>
                                                    <span className="font-semibold block text-slate-900">Catholic Marriage Certificate</span>
                                                    <span className="text-[11px] text-slate-500">Church marriage cert proving full Catholic initiation.</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Territorial Vicinity Check */}
                                <div className="sm:col-span-2 border-t pt-4">
                                    <label className="text-xs font-bold text-slate-900 mb-1 block">
                                        Parish Territorial Jurisdiction
                                    </label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-1 text-xs text-slate-700">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="confirmation_resides_within_parish"
                                                value="yes"
                                                checked={data.specific_data.confirmation_resides_within_parish === 'yes'}
                                                onChange={() => handleSpecificDataChange('confirmation_resides_within_parish', 'yes')}
                                            />
                                            <span>Candidate resides within the territorial boundary of this parish</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="confirmation_resides_within_parish"
                                                value="no"
                                                checked={data.specific_data.confirmation_resides_within_parish === 'no'}
                                                onChange={() => handleSpecificDataChange('confirmation_resides_within_parish', 'no')}
                                            />
                                            <span>Candidate resides outside this parish boundary (Confirmation Permit required)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Phase 4: Submission Mode & Document Attachments for Confirmation */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-amber-600" /> 4. Required Canonical Certificates
                                </h3>

                                {/* Submission Mode Selector */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <label className="block text-xs font-bold text-slate-800">
                                        How will you submit the required certificates?
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            data.certificate_submission_mode === 'online' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="confirmation_cert_submission_mode"
                                                value="online"
                                                checked={data.certificate_submission_mode === 'online'}
                                                onChange={e => setData('certificate_submission_mode', e.target.value)}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Upload Digital Copies Online</div>
                                                <div className="text-[11px] text-slate-500">Attach scans or clear photos directly in this form.</div>
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            data.certificate_submission_mode === 'follow_up_office' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="confirmation_cert_submission_mode"
                                                value="follow_up_office"
                                                checked={data.certificate_submission_mode === 'follow_up_office'}
                                                onChange={e => setData('certificate_submission_mode', e.target.value)}
                                                className="mt-0.5 text-amber-600"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Follow Up Directly at Office</div>
                                                <div className="text-[11px] text-slate-500">Bring physical certificates to the parish office in person.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {data.certificate_submission_mode === 'follow_up_office' ? (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold">In-Person Document Submission Selected:</span>
                                            <p className="mt-1">
                                                You can submit this Confirmation request now without uploading files. You must present the physical original and photocopies of the following certificates to the parish office for canonical verification prior to the assigned ceremony date:
                                            </p>
                                            <ul className="list-disc list-inside mt-2 space-y-1 font-medium text-blue-950">
                                                <li><strong>Candidate&apos;s Catholic Baptismal Certificate</strong> (issued within the last 6 months with annotation &quot;For Confirmation Purposes&quot;)</li>
                                                <li><strong>Candidate&apos;s PSA Birth Certificate</strong></li>
                                                <li>
                                                    <strong>Sponsor&apos;s {data.specific_data.godparent_certificate_type === 'marriage' ? 'Catholic Marriage Certificate' : 'Confirmation Certificate'}</strong>
                                                </li>
                                                {data.specific_data.confirmation_resides_within_parish === 'no' && (
                                                    <li><strong>Confirmation Permit / Endorsement</strong> from candidate&apos;s home territorial parish</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">Upload clear JPG, PNG, or PDF copies (maximum 5MB per file):</p>

                                        {/* Candidate's Baptismal Certificate (Mandatory) */}
                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                            <label className="text-xs font-bold text-slate-800 block">
                                                1. Candidate&apos;s Catholic Baptismal Certificate <span className="text-rose-500">*</span>
                                            </label>
                                            <p className="text-[11px] text-slate-500 mb-1">
                                                Original or certified true copy of baptismal certificate from the church of baptism (preferably with &quot;For Confirmation Purposes&quot; remark).
                                            </p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={e => setData('baptismal_cert_subject', e.target.files?.[0] || null)}
                                                className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                            />
                                        </div>

                                        {/* Sponsor's Confirmation or Marriage Certificate */}
                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                            <label className="text-xs font-bold text-slate-800 block">
                                                2. Sponsor&apos;s {data.specific_data.godparent_certificate_type === 'marriage' ? 'Catholic Marriage Certificate' : 'Confirmation Certificate'} <span className="text-rose-500">*</span>
                                            </label>
                                            <p className="text-[11px] text-slate-500 mb-1">
                                                Canonical proof that the godparent/witness has received Confirmation and is in full communion with the Catholic Church.
                                            </p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={e => setData('confirmation_cert_godparents', e.target.files?.[0] || null)}
                                                className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                            />
                                        </div>

                                        {/* PSA Birth Certificate */}
                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                            <label className="text-xs font-bold text-slate-800 block">
                                                3. Candidate&apos;s PSA Birth Certificate (Optional / Supporting)
                                            </label>
                                            <p className="text-[11px] text-slate-500 mb-1">For age and civil name verification.</p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={e => setData('psa_birth_cert', e.target.files?.[0] || null)}
                                                className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                            />
                                        </div>

                                        {/* Confirmation Permit if non-resident */}
                                        {data.specific_data.confirmation_resides_within_parish === 'no' && (
                                            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
                                                <label className="text-xs font-bold text-amber-900 block">
                                                    4. Confirmation Permit / Parish Endorsement
                                                </label>
                                                <p className="text-[11px] text-amber-800 mb-1">Required since candidate resides outside this parish&apos;s territorial boundaries.</p>
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    onChange={e => setData('confirmation_permit', e.target.files?.[0] || null)}
                                                    className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Phase 3 & 4: Matrimony / Wedding Specific Data & Requirements */}
                    {data.sacrament_type === 'matrimony' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                <Users className="w-4 h-4 text-purple-600" /> 3. Contracting Parties (Groom &amp; Bride Information)
                            </h2>

                            {/* Groom (Husband) Details */}
                            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4">
                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <User className="w-3.5 h-3.5 text-blue-600" /> Groom (Husband / Lalaki) Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                            Groom&apos;s Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.groom_name || ''}
                                            onChange={e => handleSpecificDataChange('groom_name', e.target.value)}
                                            required
                                            placeholder="First Name, Middle Name, Last Name"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={data.specific_data.groom_dob || ''}
                                            onChange={e => handleSpecificDataChange('groom_dob', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Place of Birth (City / Province)</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.groom_pob || ''}
                                            onChange={e => handleSpecificDataChange('groom_pob', e.target.value)}
                                            placeholder="e.g. Lipa City, Batangas"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Father&apos;s Full Name</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.groom_father_name || ''}
                                            onChange={e => handleSpecificDataChange('groom_father_name', e.target.value)}
                                            placeholder="First Name, Middle Name, Last Name"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Mother&apos;s Full Maiden Name</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.groom_mother_name || ''}
                                            onChange={e => handleSpecificDataChange('groom_mother_name', e.target.value)}
                                            placeholder="Mother's Maiden Name (before marriage)"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Home Parish / Residential Address</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.groom_parish || ''}
                                            onChange={e => handleSpecificDataChange('groom_parish', e.target.value)}
                                            placeholder="Home parish or current municipality of residence"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                            Is the Groom an OFW, Foreign Citizen, or has worked/resided overseas?
                                        </label>
                                        <div className="flex items-center gap-4 text-xs">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="groom_is_foreign_or_ofw"
                                                    value="no"
                                                    checked={data.specific_data.groom_is_foreign_or_ofw !== 'yes'}
                                                    onChange={() => handleSpecificDataChange('groom_is_foreign_or_ofw', 'no')}
                                                    className="text-purple-600"
                                                />
                                                <span>No (Filipino residing in the Philippines)</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="groom_is_foreign_or_ofw"
                                                    value="yes"
                                                    checked={data.specific_data.groom_is_foreign_or_ofw === 'yes'}
                                                    onChange={() => handleSpecificDataChange('groom_is_foreign_or_ofw', 'yes')}
                                                    className="text-purple-600"
                                                />
                                                <span className="font-semibold text-purple-900">Yes (Requires Certificate of Freedom to Marry / Singleness)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bride (Wife) Details */}
                            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4">
                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <User className="w-3.5 h-3.5 text-pink-600" /> Bride (Wife / Babae) Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                            Bride&apos;s Full Name (Maiden Name) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.bride_name || ''}
                                            onChange={e => handleSpecificDataChange('bride_name', e.target.value)}
                                            required
                                            placeholder="First Name, Middle Name, Last Name"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={data.specific_data.bride_dob || ''}
                                            onChange={e => handleSpecificDataChange('bride_dob', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Place of Birth (City / Province)</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.bride_pob || ''}
                                            onChange={e => handleSpecificDataChange('bride_pob', e.target.value)}
                                            placeholder="e.g. Lipa City, Batangas"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Father&apos;s Full Name</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.bride_father_name || ''}
                                            onChange={e => handleSpecificDataChange('bride_father_name', e.target.value)}
                                            placeholder="First Name, Middle Name, Last Name"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Mother&apos;s Full Maiden Name</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.bride_mother_name || ''}
                                            onChange={e => handleSpecificDataChange('bride_mother_name', e.target.value)}
                                            placeholder="Mother's Maiden Name (before marriage)"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">Home Parish / Residential Address</label>
                                        <input
                                            type="text"
                                            value={data.specific_data.bride_parish || ''}
                                            onChange={e => handleSpecificDataChange('bride_parish', e.target.value)}
                                            placeholder="Home parish or current municipality of residence"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                            Is the Bride an OFW, Foreign Citizen, or has worked/resided overseas?
                                        </label>
                                        <div className="flex items-center gap-4 text-xs">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="bride_is_foreign_or_ofw"
                                                    value="no"
                                                    checked={data.specific_data.bride_is_foreign_or_ofw !== 'yes'}
                                                    onChange={() => handleSpecificDataChange('bride_is_foreign_or_ofw', 'no')}
                                                    className="text-purple-600"
                                                />
                                                <span>No (Filipino residing in the Philippines)</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="bride_is_foreign_or_ofw"
                                                    value="yes"
                                                    checked={data.specific_data.bride_is_foreign_or_ofw === 'yes'}
                                                    onChange={() => handleSpecificDataChange('bride_is_foreign_or_ofw', 'yes')}
                                                    className="text-purple-600"
                                                />
                                                <span className="font-semibold text-purple-900">Yes (Requires Certificate of Freedom to Marry / Singleness)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Principal Sponsors (Ninong & Ninang) */}
                            <div className="border-t pt-4">
                                <label className="text-xs font-bold text-slate-900 mb-1 block">
                                    Principal Witnesses / Sponsors (Ninong &amp; Ninang)
                                </label>
                                <p className="text-[11px] text-slate-500 mb-2">
                                    List the full names of the principal sponsors who will sign the marriage contract.
                                </p>
                                <textarea
                                    value={data.specific_data.witnesses || ''}
                                    onChange={e => handleSpecificDataChange('witnesses', e.target.value)}
                                    placeholder="e.g. Hon. Juan dela Cruz, Atty. Maria Santos, Dr. Pedro Reyes..."
                                    rows={2}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            {/* Phase 4: Required Canonical Documents (Physical Submission Notice & Checklist) */}
                            <div className="border-t pt-6 space-y-4">
                                <div className="bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200 rounded-xl p-4 space-y-2">
                                    <h3 className="font-serif text-sm font-bold text-purple-950 flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4 text-purple-700" /> 4. Required Canonical Documents (Physical Office Submission Only)
                                    </h3>
                                    <p className="text-xs text-purple-900 leading-relaxed">
                                        <strong>No online file uploads are required.</strong> All documents must be physically submitted to the parish secretariat for canonical verification. The parish office will maintain a digital checklist of your documents and notify you of any pending requirements.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                                            Original Baptismal Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Original copy for both Groom and Bride, issued within the last 6 months with remark <strong>&quot;For Marriage Purposes&quot;</strong>.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                                            Original Confirmation Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Original copy for both Groom and Bride, issued within 6 months with remark <strong>&quot;For Marriage Purposes&quot;</strong>.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                                            PSA Birth Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Photocopy of PSA Birth Certificate for both Groom and Bride.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                                            PSA CENOMAR
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Certificate of No Marriage Record from PSA, issued within the last 6 months.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                                            Marriage Banns
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            To be created and published by the parish office for 3 consecutive Sundays in both home parishes.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">6</span>
                                            Marriage Permit (if applicable)
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Parish endorsement permit if either groom or bride resides outside this parish territory.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">7</span>
                                            Marriage License
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Civil Marriage License from City/Municipal Civil Registrar (valid for 120 days) or Art. 34 Affidavit.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">8</span>
                                            Certificate of Freedom to Marry / Singleness
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Required if either party is a foreigner, naturalized, or has worked/resided overseas (OFW).
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">9</span>
                                            Pre-Cana Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Certificate of Attendance from the parish or diocese where the couple completed the Pre-Cana seminar.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">10</span>
                                            4R Couple Picture
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            One (1) recent colored photograph of the couple together in 4R size.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Blessings Sacrament Details */}
                    {data.sacrament_type === 'blessing' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                <FileText className="w-4 h-4 text-amber-600" /> 3. Blessing Specifics
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold mb-1 block">Type of Blessing</label>
                                    <select
                                        value={data.specific_data.blessing_category || 'House Blessing'}
                                        onChange={e => handleSpecificDataChange('blessing_category', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-xs bg-white"
                                    >
                                        <option value="House Blessing">House Blessing</option>
                                        <option value="Car/Vehicle Blessing">Car/Vehicle Blessing</option>
                                        <option value="Office/Business Blessing">Office/Business Blessing</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold mb-1 block">Venue Type</label>
                                    <select
                                        value={data.specific_data.venue_type || 'Off-site/At the specified address'}
                                        onChange={e => handleSpecificDataChange('venue_type', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-xs bg-white"
                                    >
                                        <option value="At the Parish/Church Grounds">At the Parish/Church Grounds</option>
                                        <option value="Off-site/At the specified address">Off-site/At the specified address</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <FormActions submitLabel="Submit Sacrament Request" cancelHref="/portal/dashboard" processing={processing} />
                </form>
            </div>
        </PortalLayout>
    );
}
