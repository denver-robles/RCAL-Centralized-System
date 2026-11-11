import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import ClergySelector from '@/Components/ClergySelector';
import { Clergy, PageProps, Parish, SacramentSetting } from '@/types';
import { parseSacramentDate } from '@/utils/date';
import { Calendar, User, FileText, Upload, AlertTriangle, ShieldCheck, CheckCircle2, Info, Heart, Users, CheckSquare, AlertCircle, Sparkles } from 'lucide-react';

const BASE_NUPTIAL_TOTAL = 7210;

const NUPTIAL_ADD_ONS = [
    { key: 'live_stream', label: 'Live Stream', price: 500, description: 'Parish liturgical multi-camera live stream' },
    { key: 'carpet', label: 'Carpet', price: 1500, description: 'Ceremonial red aisle runner carpet' },
    { key: 'choir', label: 'Choir', price: 1000, description: 'Parish liturgical music ministry / choir' },
    { key: 'flower_stand', label: 'Flower Stand', price: 500, description: 'Sanctuary & altar floral stands' },
    { key: 'candle_pair', label: '1 pair of Candle', price: 100, description: 'Liturgical wedding candles with holders' },
];

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
        certificate_submission_mode: 'follow_up_office',
        
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
            child_name: '',
            candidate_name: '',
            dob: '',
            candidate_dob: '',
            place_of_birth: '',
            address: '',
            candidate_address: '',
            home_parish: '',
            date_baptized: '',
            baptism_date: '',
            place_of_baptism: '',
            baptism_parish: '',
            father_name: '',
            candidate_father_name: '',
            mother_name: '',
            candidate_mother_name: '',
            godfather_name: '',
            godfather_pob: '',
            godfather_address: '',
            godmother_name: '',
            godmother_pob: '',
            godmother_address: '',
            godparent_name: '',

            // Matrimony / Wedding
            groom_name: '',
            groom_nationality: 'Filipino',
            groom_status: 'Single',
            groom_age: '',
            groom_dob: '',
            groom_pob: '',
            groom_address: '',
            groom_father_name: '',
            groom_mother_name: '',
            groom_parish: '',
            groom_is_foreign_or_ofw: 'no', // 'yes' | 'no'

            bride_name: '',
            bride_nationality: 'Filipino',
            bride_status: 'Single',
            bride_age: '',
            bride_dob: '',
            bride_pob: '',
            bride_address: '',
            bride_father_name: '',
            bride_mother_name: '',
            bride_parish: '',
            bride_is_foreign_or_ofw: 'no', // 'yes' | 'no'

            godfather_name: '',
            godfather_address: '',
            godmother_name: '',
            godmother_address: '',
            witnesses: '',

            nuptial_add_ons: {
                live_stream: false,
                carpet: false,
                choir: false,
                flower_stand: false,
                candle_pair: false,
            },
            nuptial_base_fee: 7210,
            amount: 7210,
            donation_amount: 7210,

            // Mass / Blessing for Departed (Funeral / Para sa Yumao)
            service_mass: true,
            service_blessing: false,
            date_of_death: '',
            spouse_name: '',
            mass_location: 'Parish Church / Simbahan',
            informant_name: auth.user?.display_name || '',
            informant_contact: '',
            deceased_name: '',
            deceased_address: '',
            deceased_age: '',
            children_count: '',
            deceased_civil_status: 'Married',
            cause_of_death: '',
            character_traits: '',
            favorite_family_hobby: '',

            // Burial Details
            received_anointing_before_death: 'no',
            burial_date: '',
            burial_location: '',

            // Sponsored Mass
            sponsored_thanksgiving: false,
            sponsored_thanksgiving_of: '',
            sponsored_wedding_anniversary: false,
            sponsored_wedding_anniversary_of: '',
            sponsored_birthday: false,
            sponsored_birthday_of: '',
            sponsored_livestream: false,
            sponsored_choir: false,
            sponsored_base_fee: 2000,

            // Bone / Ash Transfer
            date_today: new Date().toISOString().slice(0, 10),
            target_cemetery: '',

            // Visiting / Guest Clergy Manual Entry
            guest_priest_name: '',
            requested_guest_priest_name: '',
        } as Record<string, any>,
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

    const getMatrimonyAddOnsTotal = (): number => {
        const addOns = data.specific_data.nuptial_add_ons || {};
        let sum = 0;
        NUPTIAL_ADD_ONS.forEach(item => {
            if (addOns[item.key]) {
                sum += item.price;
            }
        });
        return sum;
    };

    const getMatrimonyTotal = (): number => {
        return BASE_NUPTIAL_TOTAL + getMatrimonyAddOnsTotal();
    };

    const handleAddOnToggle = (key: string) => {
        const currentAddOns = data.specific_data.nuptial_add_ons || {};
        const updated = {
            ...currentAddOns,
            [key]: !currentAddOns[key],
        };
        let addOnsSum = 0;
        NUPTIAL_ADD_ONS.forEach(item => {
            if (updated[item.key]) {
                addOnsSum += item.price;
            }
        });
        const total = BASE_NUPTIAL_TOTAL + addOnsSum;
        setData('specific_data', {
            ...data.specific_data,
            nuptial_add_ons: updated,
            nuptial_base_fee: BASE_NUPTIAL_TOTAL,
            amount: total,
            donation_amount: total,
        });
    };

    const SPONSORED_MASS_BASE = 2000;
    const getSponsoredMassTotal = (): number => {
        let total = SPONSORED_MASS_BASE;
        if (data.specific_data.sponsored_livestream) total += 500;
        if (data.specific_data.sponsored_choir) total += 1000;
        return total;
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

    const isSingleParent = data.sacrament_type === 'baptism' && (
        data.specific_data.parents_status === 'Single Parent' ||
        (typeof data.specific_data.parents_status === 'string' && data.specific_data.parents_status.toLowerCase().includes('single'))
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (data.sacrament_type === 'baptism') {
            if (!data.parish_id) {
                alert('Please select a parish church.');
                return;
            }
            if (!data.starts_at) {
                alert('Please select the requested Date of Baptism.');
                return;
            }
            if (isStartInvalid) {
                alert(`The selected preferred date (${getDayName(data.starts_at)}) is not available for this parish. Available days: ${allowedDays?.map(d => d.toUpperCase()).join(', ')}`);
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Please enter a Contact Number.');
                return;
            }
            if (!data.specific_data.child_name?.trim()) {
                alert('Please enter the Name of Child/Adult to be Baptized.');
                return;
            }
            if (!data.specific_data.dob) {
                alert('Please enter the Date of Birth of the person to be baptized.');
                return;
            }
            if (!data.specific_data.place_of_birth?.trim()) {
                alert('Please enter the Birthplace of the person to be baptized.');
                return;
            }

            // Parental information validation:
            // If single parent, at least one parent (Father OR Mother) must be provided.
            // If married / other, both Father and Mother are required.
            if (isSingleParent) {
                if (!data.specific_data.father_name?.trim() && !data.specific_data.mother_name?.trim()) {
                    alert('As a single parent applicant, please provide the details of at least one parent (either Father or Mother).');
                    return;
                }
            } else {
                if (!data.specific_data.father_name?.trim() || !data.specific_data.mother_name?.trim()) {
                    alert('Please provide the information for both Father and Mother (or choose "Single Parent" under Parents Marital Status if applicable).');
                    return;
                }
            }

            // Sync aliases
            const godfather = data.specific_data.godfather_name?.trim() || '';
            const godmother = data.specific_data.godmother_name?.trim() || '';
            const combinedGodparents = [
                godfather ? `${godfather} (Ninong)` : '',
                godmother ? `${godmother} (Ninang)` : '',
            ].filter(Boolean).join(', ');

            data.specific_data.godparents = combinedGodparents;
            data.specific_data.name_to_be_baptized = data.specific_data.child_name;
            data.specific_data.birthplace = data.specific_data.place_of_birth || data.specific_data.birthplace || '';
            data.specific_data.place_of_birth = data.specific_data.birthplace;
            data.specific_data.parents_status = data.specific_data.parents_status || data.specific_data.parents_marital_status || 'Married (Catholic Church)';
            data.specific_data.parents_marital_status = data.specific_data.parents_status;

            if (!data.requester_name) {
                data.requester_name = data.specific_data.child_name || auth.user?.display_name || auth.user?.name || 'Applicant';
            }
            if (!data.requester_email) {
                data.requester_email = auth.user?.email || 'parishioner@rcal.ph';
            }
            if (!data.requester_address) {
                data.requester_address = data.specific_data.father_address || data.specific_data.mother_address || 'Parish Jurisdiction';
            }
            data.certificate_submission_mode = 'follow_up_office';
        } else if (data.sacrament_type === 'confirmation') {
            if (!data.parish_id) {
                alert('Please select a parish church.');
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Please enter a Contact Number for the parent/guardian.');
                return;
            }
            const candidateName = data.specific_data.child_name?.trim() || data.specific_data.candidate_name?.trim();
            if (!candidateName) {
                alert('Please enter the Name of Child.');
                return;
            }
            const candidateDob = data.specific_data.dob || data.specific_data.candidate_dob;
            if (!candidateDob) {
                alert('Please enter the Date of Birth of the child.');
                return;
            }
            const age = calculateAge(candidateDob);
            if (age !== null && age < 12) {
                if (!confirm(`Canonical Notice: The candidate is indicated as ${age} years old. Under Canon 891, the subject for Confirmation must be at least 12 years of age. Do you still wish to submit this application for parish evaluation?`)) {
                    return;
                }
            }
            if (!data.specific_data.place_of_birth?.trim()) {
                alert('Please enter the Place of Birth of the child.');
                return;
            }

            // Sync aliases
            const godfather = data.specific_data.godfather_name?.trim() || '';
            const godmother = data.specific_data.godmother_name?.trim() || '';
            const combinedGodparents = [
                godfather ? `${godfather} (Ninong)` : '',
                godmother ? `${godmother} (Ninang)` : '',
            ].filter(Boolean).join(', ');

            data.specific_data.godparents = combinedGodparents;
            data.specific_data.godparent_name = godfather || godmother || '';
            data.specific_data.child_name = candidateName;
            data.specific_data.candidate_name = candidateName;
            data.specific_data.dob = candidateDob;
            data.specific_data.candidate_dob = candidateDob;
            const candidateAddress = data.specific_data.address?.trim() || data.specific_data.candidate_address?.trim() || '';
            data.specific_data.address = candidateAddress;
            data.specific_data.candidate_address = candidateAddress;
            data.specific_data.father_name = data.specific_data.father_name || '';
            data.specific_data.mother_name = data.specific_data.mother_name || '';
            data.specific_data.candidate_father_name = data.specific_data.father_name;
            data.specific_data.candidate_mother_name = data.specific_data.mother_name;
            data.specific_data.place_of_baptism = data.specific_data.place_of_baptism || '';
            data.specific_data.baptism_parish = data.specific_data.place_of_baptism;
            data.specific_data.date_baptized = data.specific_data.date_baptized || '';
            data.specific_data.baptism_date = data.specific_data.date_baptized;

            if (!data.requester_name) {
                data.requester_name = data.specific_data.father_name || data.specific_data.mother_name || auth.user?.display_name || auth.user?.name || 'Parent / Guardian';
            }
            if (!data.requester_relationship) {
                data.requester_relationship = 'Parent / Guardian';
            }
            if (!data.requester_address) {
                data.requester_address = candidateAddress || data.specific_data.godfather_address || data.specific_data.godmother_address || 'Parish Jurisdiction';
            }
            data.certificate_submission_mode = 'follow_up_office';
            data.starts_at = '';
        } else if (data.sacrament_type === 'matrimony') {
            if (!data.parish_id) {
                alert('Please select a parish church.');
                return;
            }
            if (!data.starts_at) {
                alert('Please select a requested Date of Marriage.');
                return;
            }
            if (isStartInvalid) {
                alert(`The selected preferred date (${getDayName(data.starts_at)}) is not available for matrimony. Available days: ${allowedDays?.map(d => d.toUpperCase()).join(', ')}`);
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Please enter a Contact Number for the matrimony appointment.');
                return;
            }
            const groomName = data.specific_data.groom_name?.trim();
            const brideName = data.specific_data.bride_name?.trim();
            if (!groomName || !brideName) {
                alert('Please enter both the Groom (Husband) and Bride (Wife) full names for the matrimony appointment.');
                return;
            }

            // Sync witnesses
            const godfather = data.specific_data.godfather_name?.trim() || '';
            const godmother = data.specific_data.godmother_name?.trim() || '';
            const witnessList = [
                godfather ? `${godfather} (Ninong)` : '',
                godmother ? `${godmother} (Ninang)` : '',
            ].filter(Boolean).join(', ');
            data.specific_data.witnesses = witnessList || data.specific_data.witnesses || '';

            // Derive DOB from age if dob not set
            if (!data.specific_data.groom_dob && data.specific_data.groom_age) {
                const year = new Date().getFullYear() - parseInt(data.specific_data.groom_age, 10);
                if (!isNaN(year)) {
                    data.specific_data.groom_dob = `${year}-01-01`;
                }
            }
            if (!data.specific_data.bride_dob && data.specific_data.bride_age) {
                const year = new Date().getFullYear() - parseInt(data.specific_data.bride_age, 10);
                if (!isNaN(year)) {
                    data.specific_data.bride_dob = `${year}-01-01`;
                }
            }

            // Ensure amount and quotation is stored
            const total = getMatrimonyTotal();
            data.specific_data.nuptial_base_fee = BASE_NUPTIAL_TOTAL;
            data.specific_data.amount = total;
            data.specific_data.donation_amount = total;

            if (!data.requester_name) {
                data.requester_name = groomName || brideName || auth.user?.display_name || auth.user?.name || 'Groom / Bride';
            }
            if (!data.requester_relationship) {
                data.requester_relationship = 'Groom';
            }
            if (!data.requester_address) {
                data.requester_address = data.specific_data.groom_address || data.specific_data.bride_address || 'Parish Jurisdiction';
            }
            data.certificate_submission_mode = 'follow_up_office';
        } else if (data.sacrament_type === 'funeral') {
            if (!data.parish_id) {
                alert('Pakiusap, pumili ng Parokya / Parish Church.');
                return;
            }
            if (!data.starts_at) {
                alert('Pakiusap, ilagay ang Petsa at Oras ng Misa / Pagbabasbas.');
                return;
            }
            if (isStartInvalid) {
                alert(`Ang napiling petsa (${getDayName(data.starts_at)}) ay hindi available para sa parokyang ito.`);
                return;
            }
            if (!data.specific_data.service_mass && !data.specific_data.service_blessing) {
                alert('Pakiusap, pumili kung Misa, Pagbabasbas, o Pareho para sa serbisyo.');
                return;
            }
            if (!data.specific_data.deceased_name?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Namatay.');
                return;
            }
            const contactNumber = data.requester_contact?.trim() || data.specific_data.informant_contact?.trim();
            if (!contactNumber) {
                alert('Pakiusap, ilagay ang Numero ng Nagpalista.');
                return;
            }
            data.requester_contact = contactNumber;
            data.specific_data.informant_contact = contactNumber;
            const informantName = data.requester_name?.trim() || data.specific_data.informant_name?.trim() || auth.user?.display_name || auth.user?.name || 'Nagpalista';
            data.requester_name = informantName;
            data.specific_data.informant_name = informantName;
            data.requester_relationship = data.requester_relationship || 'Pamilya / Kamag-anak';
            data.requester_address = data.requester_address || data.specific_data.deceased_address || 'Parish Jurisdiction';
            data.certificate_submission_mode = 'follow_up_office';
        } else if (data.sacrament_type === 'sponsored_mass') {
            if (!data.parish_id) {
                alert('Pakiusap, pumili ng Parokya / Parish Church.');
                return;
            }
            if (!data.starts_at) {
                alert('Pakiusap, ilagay ang Petsa at Oras ng Misa (Date and Time of Mass).');
                return;
            }
            if (isStartInvalid) {
                alert(`Ang napiling petsa (${getDayName(data.starts_at)}) ay hindi available para sa parokyang ito.`);
                return;
            }
            if (!data.specific_data.sponsored_thanksgiving && !data.specific_data.sponsored_wedding_anniversary && !data.specific_data.sponsored_birthday) {
                alert('Pakiusap, pumili ng hindi bababa sa isang layunin ng misa (Thanksgiving, Wedding Anniversary, o Birthday).');
                return;
            }
            if (!data.specific_data.mass_location?.trim()) {
                alert('Pakiusap, ilagay ang Lugar ng Misa (Location of Mass).');
                return;
            }
            if (!data.requester_name?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Kinatawan (Name of Representative).');
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Pakiusap, ilagay ang Contact Number.');
                return;
            }
            if (!data.requester_address?.trim()) {
                alert('Pakiusap, ilagay ang Tirahan (Address).');
                return;
            }

            const total = getSponsoredMassTotal();
            data.specific_data.amount = total;
            data.specific_data.donation_amount = total;
            data.certificate_submission_mode = 'follow_up_office';
        } else if (data.sacrament_type === 'bone_transfer') {
            if (!data.parish_id) {
                alert('Pakiusap, pumili ng Parokya / Parish Church.');
                return;
            }
            if (!data.starts_at) {
                alert('Pakiusap, ilagay ang Petsa at Oras ng Pagbabasbas ng Paglilipat (Date and Time of Funeral Blessing).');
                return;
            }
            if (!data.requester_name?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Kinatawan (Name of Representative).');
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Pakiusap, ilagay ang Contact Number.');
                return;
            }
            if (!data.requester_address?.trim()) {
                alert('Pakiusap, ilagay ang Tirahan ng Kinatawan (Address of Representative).');
                return;
            }
            if (!data.specific_data.target_cemetery?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Sementeryo kung saan ililipat ang buto/abo (Name of Cemetery).');
                return;
            }
            if (!data.specific_data.deceased_name?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Namatay (Name of Deceased).');
                return;
            }

            data.specific_data.amount = 100;
            data.specific_data.donation_amount = 100;
            data.certificate_submission_mode = 'follow_up_office';
        } else if (data.sacrament_type === 'blessing') {
            if (!data.parish_id) {
                alert('Pakiusap, pumili ng Parokya / Parish Church.');
                return;
            }
            if (!data.starts_at) {
                alert('Pakiusap, ilagay ang Petsa at Oras ng Pagbabasbas.');
                return;
            }
            if (isStartInvalid) {
                alert(`The selected preferred date (${getDayName(data.starts_at)}) is not available.`);
                return;
            }
            if (!data.requester_name?.trim()) {
                alert('Pakiusap, ilagay ang Pangalan ng Nagpapabasbas.');
                return;
            }
            if (!data.requester_contact?.trim()) {
                alert('Pakiusap, ilagay ang Contact Number.');
                return;
            }
            const isOffsite = data.specific_data.venue_type === 'Off-site/At the specified address';
            if (isOffsite && !data.specific_data.complete_address?.trim()) {
                alert('Pakiusap, ilagay ang Eksaktong Tirahan o Lugar ng Pagbabasbas (Exact Address / Location of Blessing).');
                return;
            }

            data.specific_data.amount = 100;
            data.specific_data.donation_amount = 100;
            data.certificate_submission_mode = 'follow_up_office';
        } else {
            if (isStartInvalid) {
                alert(`The selected preferred date (${getDayName(data.starts_at)}) is not available for this sacrament. Available days: ${allowedDays?.map(d => d.toUpperCase()).join(', ')}`);
                return;
            }
        }

        data.certificate_submission_mode = 'follow_up_office';

        if (data.requested_clergy_id === 'other') {
            data.requested_clergy_id = '';
        }
        if (data.specific_data.guest_priest_name) {
            data.specific_data.requested_guest_priest_name = data.specific_data.guest_priest_name;
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

                    {/* DEDICATED BAPTISM SACRAMENT FORM */}
                    {data.sacrament_type === 'baptism' ? (
                        <div className="space-y-6">
                            {/* 1. Parish & Schedule Details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> Parish Church &amp; Schedule
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
                                            <option value="">-- Select Parish Church --</option>
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
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    {/* Allowed Days Notice for Baptism */}
                                    {allowedDays && allowedDays.length > 0 && (
                                        <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-700">
                                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>
                                                Available Days for <strong>BAPTISM</strong>:
                                                <span className="font-bold text-amber-800 ml-1">
                                                    {allowedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                                                </span>
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Date of Baptism (Requested): <span className="text-rose-500">*</span>
                                        </label>
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
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 or 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Name of Child/Adult to be Baptized */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> Person to be Baptized
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Name of Child/Adult to be Baptized <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.child_name || ''}
                                            onChange={e => handleSpecificDataChange('child_name', e.target.value)}
                                            required
                                            placeholder="Full Name (First Name, Middle Name, Last Name)"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Date of Birth <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.specific_data.dob || ''}
                                            onChange={e => handleSpecificDataChange('dob', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Birthplace <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.place_of_birth || ''}
                                            onChange={e => handleSpecificDataChange('place_of_birth', e.target.value)}
                                            required
                                            placeholder="Hospital / City / Municipality, Province"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Parents Information */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-1">
                                    <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-amber-600" /> Parents Information
                                    </h2>
                                    {isSingleParent ? (
                                        <span className="text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 font-semibold">
                                            Optional for Single Parent
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-500 font-medium">
                                            Required for Married Parents <span className="text-rose-500">*</span>
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Father's Information */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-blue-600" /> Father&apos;s Information
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Father {!isSingleParent && <span className="text-rose-500">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.father_name || ''}
                                                onChange={e => handleSpecificDataChange('father_name', e.target.value)}
                                                placeholder="Full Name of Father"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birthdate</label>
                                            <input
                                                type="date"
                                                value={data.specific_data.father_dob || ''}
                                                onChange={e => handleSpecificDataChange('father_dob', e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birth Place</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.father_pob || ''}
                                                onChange={e => handleSpecificDataChange('father_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Present Address</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.father_address || ''}
                                                onChange={e => handleSpecificDataChange('father_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Mother's Information */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-pink-600" /> Mother&apos;s Information
                                            </h3>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Mother {!isSingleParent && <span className="text-rose-500">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.mother_name || ''}
                                                onChange={e => handleSpecificDataChange('mother_name', e.target.value)}
                                                placeholder="Full Maiden Name of Mother"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birthdate</label>
                                            <input
                                                type="date"
                                                value={data.specific_data.mother_dob || ''}
                                                onChange={e => handleSpecificDataChange('mother_dob', e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birth place</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.mother_pob || ''}
                                                onChange={e => handleSpecificDataChange('mother_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-800">Present Address</label>
                                                {data.specific_data.father_address && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSpecificDataChange('mother_address', data.specific_data.father_address)}
                                                        className="text-[10px] text-amber-700 hover:text-amber-800 underline font-semibold"
                                                    >
                                                        Same as Father&apos;s
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={data.specific_data.mother_address || ''}
                                                onChange={e => handleSpecificDataChange('mother_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Parents Marital Status */}
                                <div className="border-t border-slate-200 pt-4 space-y-2">
                                    <label className="text-xs font-bold text-slate-800 block">Parents Marital Status</label>
                                    <select
                                        value={data.specific_data.parents_status || 'Married (Catholic Church)'}
                                        onChange={e => handleSpecificDataChange('parents_status', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="Married (Catholic Church)">Married (Catholic Church)</option>
                                        <option value="Civilly Married">Civilly Married</option>
                                        <option value="Not Married / Living Together">Not Married / Living Together</option>
                                        <option value="Single Parent">Single Parent</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {isSingleParent && (
                                        <div className="mt-2 text-[11px] text-sky-900 bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2">
                                            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Single Parent Status:</strong> You are not required to fill in both parents&apos; sections. You only need to provide the information for the custodial parent (either Father or Mother).
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. Principal Sponsors / Godparents (Ninong & Ninang) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Users className="w-4 h-4 text-amber-600" /> Principal Sponsors / Godparents (Ninong &amp; Ninang)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Godfather */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-blue-600" /> Godfather (Ninong)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Name of Godfather (Ninong)</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_name || ''}
                                                onChange={e => handleSpecificDataChange('godfather_name', e.target.value)}
                                                placeholder="Full Name of Godfather"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birthplace</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_pob || ''}
                                                onChange={e => handleSpecificDataChange('godfather_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Present Address</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_address || ''}
                                                onChange={e => handleSpecificDataChange('godfather_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Godmother */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-pink-600" /> Godmother (Ninang)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Name of Godmother (Ninang)</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_name || ''}
                                                onChange={e => handleSpecificDataChange('godmother_name', e.target.value)}
                                                placeholder="Full Name of Godmother"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Birthplace</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_pob || ''}
                                                onChange={e => handleSpecificDataChange('godmother_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">Present Address</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_address || ''}
                                                onChange={e => handleSpecificDataChange('godmother_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Officiating Clergy Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magbibinyag (Officiating Priest / Clergy)"
                                subtitle="Piliin ang nais na pari para sa binyag o maglagay ng visiting priest"
                            />
                        </div>
                    ) : data.sacrament_type === 'confirmation' ? (
                        <div className="space-y-6">
                            {/* 1. Canonical Norms & Adult Confirmation Notice */}
                            <div className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-100/40 border-2 border-amber-300 rounded-2xl p-5 text-xs text-amber-950 space-y-3 shadow-xs">
                                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    Canonical Norms &amp; Guidelines for the Sacrament of Confirmation (Kumpil)
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
                                            Under Canon 874 §1 / Canon 893, the godparent (Ninong / Ninang) must be a confirmed practicing Catholic at least 16 years of age.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-amber-100/70 border border-amber-300/80 p-3 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <span className="font-bold text-amber-900">Notice for Adult Confirmation &amp; Conversion:</span>
                                        <p className="text-[11px] text-amber-800 leading-relaxed">
                                            For adult confirmation candidates (18+), converts to the Catholic faith, or RCIA inquiries, please direct your concerns and coordinate directly with the <strong>Parish Secretariat / Office</strong> for adult catechetical formation and individual appointment scheduling.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Parish Church & Schedule */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> Parish Church &amp; Schedule
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
                                            <option value="">-- Select Parish Church --</option>
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
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Contact Number (Parent / Guardian) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 or 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Email / Gmail (Parent / Guardian) <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={data.requester_email}
                                            onChange={e => setData('requester_email', e.target.value)}
                                            placeholder="e.g. parent.guardian@gmail.com"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_email && <p className="text-xs text-rose-500 mt-1">{errors.requester_email}</p>}
                                    </div>

                                    <div className="sm:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5">
                                        <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                                            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                                            Confirmation Schedule &amp; Presider Assignment by Parish Office
                                        </div>
                                        <p className="leading-relaxed text-[11px] text-amber-800">
                                            The Sacrament of Confirmation (Kumpil) is administered communally or during episcopal pastoral visits. The specific ceremony date and presiding minister are <strong>assigned directly by the parish office</strong> after evaluating your application and canonical documents.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Candidate Information */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> Candidate Information
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Name of Child <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.child_name || ''}
                                            onChange={e => handleSpecificDataChange('child_name', e.target.value)}
                                            required
                                            placeholder="Full Name of Child (First Name, Middle Name, Last Name)"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-800">
                                                Date of Birth <span className="text-rose-500">*</span>
                                            </label>
                                            {data.specific_data.dob && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    (calculateAge(data.specific_data.dob) ?? 0) >= 12
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    Age: {calculateAge(data.specific_data.dob)} yrs old
                                                    {(calculateAge(data.specific_data.dob) ?? 0) >= 12
                                                        ? ' (Eligible: 12+)'
                                                        : ' (Under 12: Canon 891)'}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="date"
                                            value={data.specific_data.dob || ''}
                                            onChange={e => handleSpecificDataChange('dob', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Place of Birth <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.place_of_birth || ''}
                                            onChange={e => handleSpecificDataChange('place_of_birth', e.target.value)}
                                            required
                                            placeholder="Hospital / City / Municipality, Province"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Address / Residence
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.address || ''}
                                            onChange={e => handleSpecificDataChange('address', e.target.value)}
                                            placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Home Parish <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.home_parish || ''}
                                            onChange={e => handleSpecificDataChange('home_parish', e.target.value)}
                                            placeholder="e.g. San Sebastian Cathedral Parish, Lipa City"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Date Baptized
                                        </label>
                                        <input
                                            type="date"
                                            value={data.specific_data.date_baptized || ''}
                                            onChange={e => handleSpecificDataChange('date_baptized', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-800 mb-1 block">
                                            Place of Baptism: Postal Code/ Baranggay/ City
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.place_of_baptism || ''}
                                            onChange={e => handleSpecificDataChange('place_of_baptism', e.target.value)}
                                            placeholder="Postal Code / Barangay / City"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Parents Information */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Heart className="w-4 h-4 text-amber-600" /> Parents Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Father */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-blue-600" /> Father
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Father
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.father_name || ''}
                                                onChange={e => handleSpecificDataChange('father_name', e.target.value)}
                                                placeholder="Full Name of Father"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Mother */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-pink-600" /> Mother
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Mother
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.mother_name || ''}
                                                onChange={e => handleSpecificDataChange('mother_name', e.target.value)}
                                                placeholder="Full Maiden Name of Mother"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Principal Sponsors / Witnesses (Ninong & Ninang) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Users className="w-4 h-4 text-amber-600" /> Principal Sponsors / Witnesses (Ninong &amp; Ninang)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Godfather */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-blue-600" /> Godfather (Ninong)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Godfather
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_name || ''}
                                                onChange={e => handleSpecificDataChange('godfather_name', e.target.value)}
                                                placeholder="Full Name of Godfather"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Birth Place
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_pob || ''}
                                                onChange={e => handleSpecificDataChange('godfather_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Residence / Present Address
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_address || ''}
                                                onChange={e => handleSpecificDataChange('godfather_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Godmother */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-pink-600" /> Godmother (Ninang)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Name of Godmother
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_name || ''}
                                                onChange={e => handleSpecificDataChange('godmother_name', e.target.value)}
                                                placeholder="Full Name of Godmother"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Birth Place
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_pob || ''}
                                                onChange={e => handleSpecificDataChange('godmother_pob', e.target.value)}
                                                placeholder="City / Municipality, Province"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 mb-1 block">
                                                Residence / Present Address
                                            </label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_address || ''}
                                                onChange={e => handleSpecificDataChange('godmother_address', e.target.value)}
                                                placeholder="Complete Present Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 7. Physical Document Submission Notice */}
                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-xs text-amber-950 space-y-3">
                                <div className="flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <span className="font-bold text-slate-900 text-sm">Physical Document Submission at Parish Office:</span>
                                        <p className="text-slate-700 leading-relaxed text-[11px]">
                                            No online file uploads are required. All required certificates must be presented physically in original copies to the parish office prior to the confirmed ceremony date:
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                                    <div className="font-bold text-slate-900 text-xs">Required Physical Documents:</div>
                                    <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium text-[11px]">
                                        <li>Candidate&apos;s Catholic Baptismal Certificate (Original copy issued within the last 6 months for Confirmation purposes)</li>
                                        <li>Candidate&apos;s PSA Birth Certificate (Photocopy)</li>
                                        <li>Sponsor&apos;s Confirmation Certificate or Catholic Marriage Certificate (Proof of eligibility)</li>
                                    </ul>
                                </div>
                                <p className="text-[11px] text-amber-900 italic">
                                    The parish office will assign and confirm the solemn Confirmation schedule once your physical requirements have been verified.
                                </p>
                            </div>

                            {/* Preferred Officiating Minister Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magkukumpil (Officiating Bishop / Clergy)"
                                subtitle="Piliin ang nais na Obispo o Pari para sa kumpil o maglagay ng visiting priest"
                            />
                        </div>
                    ) : data.sacrament_type === 'matrimony' ? (
                        <div className="space-y-6">
                            {/* Archdiocesan Directives Banner & Physical Document Submission Reminder */}
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

                            {/* 1. Parish Church & Schedule */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-purple-600" /> Parish Church &amp; Schedule
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Parish</label>
                                        <select
                                            value={data.parish_id}
                                            onChange={e => setData('parish_id', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                                        >
                                            <option value="">-- Select Parish Church --</option>
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
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Date of Marriage (Requested) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={data.starts_at}
                                            onChange={e => setData('starts_at', e.target.value)}
                                            required
                                            className={`w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-purple-500 ${
                                                isStartInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                                            }`}
                                        />
                                        {isStartInvalid && (
                                            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                Preferred date ({getDayName(data.starts_at)}) is not available. Available: {allowedDays?.map(d => d.toUpperCase()).join(', ')}
                                            </p>
                                        )}
                                        {errors.starts_at && <p className="text-xs text-rose-500 mt-1">{errors.starts_at}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Contact Number (Groom / Bride / Representative) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 or 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Email / Gmail <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={data.requester_email}
                                            onChange={e => setData('requester_email', e.target.value)}
                                            placeholder="e.g. couple@gmail.com"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                        />
                                        {errors.requester_email && <p className="text-xs text-rose-500 mt-1">{errors.requester_email}</p>}
                                    </div>

                                    {/* Preferred Clergy with indexing & manual entry */}
                                    <div className="sm:col-span-2">
                                        <ClergySelector
                                            clergy={clergy}
                                            selectedClergyId={data.requested_clergy_id}
                                            onSelectClergyId={id => setData('requested_clergy_id', id)}
                                            guestPriestName={data.specific_data.guest_priest_name}
                                            onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                            label="Paring Magkakasal (Solemnizing Clergy)"
                                            subtitle="Piliin ang nais na pari o maglagay ng visiting priest para sa kasal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Details of the Spouse and Bride (Table View) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-1">
                                    <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-purple-600" /> Details of the Spouse and Bride
                                    </h2>
                                    <span className="text-[11px] text-slate-500 font-medium">Side-by-side comparative canonical table</span>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                                    <table className="w-full text-left border-collapse min-w-[620px] text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="w-1/4 bg-slate-100 text-slate-700 font-bold px-3.5 py-2.5 uppercase tracking-wider text-[11px]">
                                                    Information
                                                </th>
                                                <th className="w-3/8 bg-purple-50 text-purple-950 font-bold px-3.5 py-2.5 text-xs border-l border-slate-200">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                                        Groom (Lalaki / Husband)
                                                    </span>
                                                </th>
                                                <th className="w-3/8 bg-pink-50 text-pink-950 font-bold px-3.5 py-2.5 text-xs border-l border-slate-200">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                                                        Bride (Babae / Wife)
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {/* 1. Full Name */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Full Name <span className="text-rose-500">*</span>
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.groom_name || ''}
                                                        onChange={e => handleSpecificDataChange('groom_name', e.target.value)}
                                                        required
                                                        placeholder="Groom's Full Legal Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.bride_name || ''}
                                                        onChange={e => handleSpecificDataChange('bride_name', e.target.value)}
                                                        required
                                                        placeholder="Bride's Full Maiden Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 2. Nationality */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Nationality
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.groom_nationality || 'Filipino'}
                                                        onChange={e => handleSpecificDataChange('groom_nationality', e.target.value)}
                                                        placeholder="e.g. Filipino"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.bride_nationality || 'Filipino'}
                                                        onChange={e => handleSpecificDataChange('bride_nationality', e.target.value)}
                                                        placeholder="e.g. Filipino"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 3. Status */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Status
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <select
                                                        value={data.specific_data.groom_status || 'Single'}
                                                        onChange={e => handleSpecificDataChange('groom_status', e.target.value)}
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                                                    >
                                                        <option value="Single">Single</option>
                                                        <option value="Widowed">Widowed</option>
                                                        <option value="Divorced">Divorced</option>
                                                    </select>
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <select
                                                        value={data.specific_data.bride_status || 'Single'}
                                                        onChange={e => handleSpecificDataChange('bride_status', e.target.value)}
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-pink-500"
                                                    >
                                                        <option value="Single">Single</option>
                                                        <option value="Widowed">Widowed</option>
                                                        <option value="Divorced">Divorced</option>
                                                    </select>
                                                </td>
                                            </tr>

                                            {/* 4. Age */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Age
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="number"
                                                        min="18"
                                                        max="120"
                                                        value={data.specific_data.groom_age || ''}
                                                        onChange={e => handleSpecificDataChange('groom_age', e.target.value)}
                                                        placeholder="Age in years"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="number"
                                                        min="18"
                                                        max="120"
                                                        value={data.specific_data.bride_age || ''}
                                                        onChange={e => handleSpecificDataChange('bride_age', e.target.value)}
                                                        placeholder="Age in years"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 5. Birthplace */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Birthplace
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.groom_pob || ''}
                                                        onChange={e => handleSpecificDataChange('groom_pob', e.target.value)}
                                                        placeholder="City / Municipality, Province"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.bride_pob || ''}
                                                        onChange={e => handleSpecificDataChange('bride_pob', e.target.value)}
                                                        placeholder="City / Municipality, Province"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 6. Address / Residence */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Address / Residence
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <textarea
                                                        rows={2}
                                                        value={data.specific_data.groom_address || ''}
                                                        onChange={e => handleSpecificDataChange('groom_address', e.target.value)}
                                                        placeholder="Complete residential address"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 resize-none"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <textarea
                                                        rows={2}
                                                        value={data.specific_data.bride_address || ''}
                                                        onChange={e => handleSpecificDataChange('bride_address', e.target.value)}
                                                        placeholder="Complete residential address"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500 resize-none"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 7. Name of Father */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Name of Father
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.groom_father_name || ''}
                                                        onChange={e => handleSpecificDataChange('groom_father_name', e.target.value)}
                                                        placeholder="Father's Full Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.bride_father_name || ''}
                                                        onChange={e => handleSpecificDataChange('bride_father_name', e.target.value)}
                                                        placeholder="Father's Full Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>

                                            {/* 8. Name of Mother */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-3.5 py-2.5 font-bold text-slate-800 bg-slate-50/60 align-middle">
                                                    Name of Mother
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.groom_mother_name || ''}
                                                        onChange={e => handleSpecificDataChange('groom_mother_name', e.target.value)}
                                                        placeholder="Mother's Full Maiden Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-2.5 border-l border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.bride_mother_name || ''}
                                                        onChange={e => handleSpecificDataChange('bride_mother_name', e.target.value)}
                                                        placeholder="Mother's Full Maiden Name"
                                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-pink-500"
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. Details of Principal Sponsors (Ninong & Ninang) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Users className="w-4 h-4 text-purple-600" /> Details of Principal Sponsors / Witnesses (God Father &amp; God Mother)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Godfather */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-purple-600" /> God Father (Ninong)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_name || ''}
                                                onChange={e => handleSpecificDataChange('godfather_name', e.target.value)}
                                                placeholder="Full Name of Godfather"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Address / Residence</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godfather_address || ''}
                                                onChange={e => handleSpecificDataChange('godfather_address', e.target.value)}
                                                placeholder="Complete Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Godmother */}
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <User className="w-3.5 h-3.5 text-pink-600" /> God Mother (Ninang)
                                        </h3>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_name || ''}
                                                onChange={e => handleSpecificDataChange('godmother_name', e.target.value)}
                                                placeholder="Full Name of Godmother"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pink-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Address / Residence</label>
                                            <input
                                                type="text"
                                                value={data.specific_data.godmother_address || ''}
                                                onChange={e => handleSpecificDataChange('godmother_address', e.target.value)}
                                                placeholder="Complete Residential Address"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pink-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Quotation Information & Optional Add-ons Checklist */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-1">
                                    <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-purple-600" /> Quotation Information &amp; Optional Add-Ons
                                    </h2>
                                    <span className="text-[11px] text-slate-500 font-medium">Sacramental donation schedule &amp; liturgical checklist</span>
                                </div>

                                {/* Standard Nuptial Processing Fees */}
                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                        Standard Nuptial Processing Fees
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200 text-xs">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-slate-700 font-medium">Nuptial Processing fee</span>
                                            <span className="font-bold text-slate-900">Php 5,500</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-slate-700 font-medium">Pre-Cana</span>
                                            <span className="font-bold text-slate-900">Php 1,700</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-slate-700 font-medium">Mass card</span>
                                            <span className="font-bold text-slate-900">Php 10</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 font-bold text-purple-950">
                                            <span>Base Nuptial Subtotal</span>
                                            <span>Php 7,210</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Add Ons Checklist (Optional) */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            Add Ons Checklist <span className="text-slate-500 font-normal">(Optional)</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Select any optional liturgical amenities you wish to include in your nuptial ceremony.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {NUPTIAL_ADD_ONS.map(addon => {
                                            const isSelected = Boolean(data.specific_data.nuptial_add_ons?.[addon.key]);
                                            return (
                                                <label
                                                    key={addon.key}
                                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-purple-50/70 border-purple-300 text-purple-950 shadow-2xs'
                                                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleAddOnToggle(addon.key)}
                                                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                                                    />
                                                    <div className="flex-1 text-xs">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-slate-900">{addon.label}</span>
                                                            <span className="font-bold text-purple-700">Php {addon.price.toLocaleString('en-PH')}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{addon.description}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Live Quotation Summary Card */}
                                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-purple-200 uppercase tracking-wider">Total Nuptial Quotation / Donation</span>
                                        <div className="text-2xl font-serif font-black tracking-tight text-white">
                                            Php {getMatrimonyTotal().toLocaleString('en-PH')}
                                        </div>
                                        <p className="text-[11px] text-purple-200">
                                            Base fee (Php 7,210) {getMatrimonyAddOnsTotal() > 0 ? `+ optional add-ons (Php ${getMatrimonyAddOnsTotal().toLocaleString('en-PH')})` : '+ no add-ons selected'}
                                        </p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-lg px-3 py-2 text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-200">Payment Notice</span>
                                        <span className="text-xs font-bold text-amber-300">To be settled at parish office</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Required Canonical Documents (Physical Office Submission Only) */}
                            <div className="border-t pt-6 space-y-4">
                                <div className="bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200 rounded-xl p-4 space-y-2">
                                    <h3 className="font-serif text-sm font-bold text-purple-950 flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4 text-purple-700" /> Required Canonical Documents (Physical Office Submission Only)
                                    </h3>
                                    <p className="text-xs text-purple-900 leading-relaxed">
                                        <strong>No online file uploads are required.</strong> All documents must be physically submitted in original copies to the parish secretariat for canonical verification. The parish office will maintain a digital checklist of your documents and notify you of any pending requirements.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                                            Canonical Interview Form
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Pre-nuptial Investigation interview with the Parish Priest / assigned canonical examiner.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                                            Original Baptismal Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Original copy for both Groom and Bride, issued within the last 6 months with remark <strong>&quot;For Marriage Purposes&quot;</strong>.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                                            Original Confirmation Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Original copy for both Groom and Bride, issued within 6 months with remark <strong>&quot;For Marriage Purposes&quot;</strong>.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                                            PSA Birth Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Photocopy of PSA Birth Certificate for both Groom and Bride.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                                            PSA CENOMAR
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Certificate of No Marriage Record from PSA, issued within the last 6 months.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">6</span>
                                            Marriage Banns
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            To be created and published by the parish office for 3 consecutive Sundays in both home parishes.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">7</span>
                                            Marriage Permit (if applicable)
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Parish endorsement permit if either groom or bride resides outside this parish territory.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">8</span>
                                            Marriage License
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Civil Marriage License from City/Municipal Civil Registrar (valid for 120 days) or Art. 34 Affidavit.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">9</span>
                                            Certificate of Freedom to Marry / Singleness
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Required if either party is a foreigner, naturalized, or has worked/resided overseas (OFW).
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">10</span>
                                            Pre-Cana Certificate
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Certificate of Attendance from the parish or diocese where the couple completed the Pre-Cana seminar.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1 sm:col-span-2">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">11</span>
                                            Two (2) Copies of 4R Couple Picture
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Two (2) copies of recent colored photographs of the couple together in 4R size.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : data.sacrament_type === 'funeral' ? (
                        <div className="space-y-6">
                            {/* Header / Pastoral Banner */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-700">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs text-amber-300">
                                        <Heart className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
                                            Liturhiya at Panalangin para sa Yumao
                                        </span>
                                        <h1 className="text-xl font-bold font-serif">
                                            Mass / Blessing for Departed Ones (Para sa Yumao)
                                        </h1>
                                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                                            Ang Banal na Misa at Pagbabasbas para sa ating mga yumao ay pag-alaala at paghahandog ng panalangin para sa kapayapaan ng kanilang kaluluwa sa piling ng Poong Maykapal.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Detalye ng Serbisyo at Parokya */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> Detalye ng Serbisyo at Parokya
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Parish */}
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Parokya / Parish Church <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={data.parish_id}
                                            onChange={e => setData('parish_id', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">-- Piliin ang Parokya --</option>
                                            {parishes.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.city_municipality})</option>
                                            ))}
                                        </select>
                                        {errors.parish_id && <p className="text-xs text-rose-500 mt-1">{errors.parish_id}</p>}
                                    </div>

                                    {/* Sacrament / Ceremony Dropdown */}
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Serbisyo / Sakramento</label>
                                        <select
                                            value={data.sacrament_type}
                                            onChange={e => {
                                                const newType = e.target.value;
                                                setData({
                                                    ...data,
                                                    sacrament_type: newType,
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    {/* Checkbox if mass or blessing */}
                                    <div className="sm:col-span-2 bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                                        <label className="block text-xs font-bold text-slate-800">
                                            Uri ng Serbisyo (Piliin kung Misa, Pagbabasbas, o Pareho) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <label className="flex items-center gap-2.5 p-3 rounded-lg border bg-white cursor-pointer hover:border-amber-400 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!data.specific_data.service_mass}
                                                    onChange={e => handleSpecificDataChange('service_mass', e.target.checked)}
                                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 block">Misa para sa Yumao</span>
                                                    <span className="text-[11px] text-slate-500">Holy Mass for the Deceased / Funeral Mass</span>
                                                </div>
                                            </label>

                                            <label className="flex items-center gap-2.5 p-3 rounded-lg border bg-white cursor-pointer hover:border-amber-400 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!data.specific_data.service_blessing}
                                                    onChange={e => handleSpecificDataChange('service_blessing', e.target.checked)}
                                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 block">Pagbabasbas para sa Yumao</span>
                                                    <span className="text-[11px] text-slate-500">Blessing of the Remains / Wake Blessing</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Petsa at Oras ng Misa */}
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Petsa at Oras ng Misa / Serbisyo <span className="text-rose-500">*</span>
                                        </label>
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
                                                Piniling Araw: {getDayName(data.starts_at)} {isStartInvalid && '— Hindi available na araw para sa parokya.'}
                                            </p>
                                        )}
                                        {errors.starts_at && <p className="text-xs text-rose-500 mt-1">{errors.starts_at}</p>}
                                    </div>

                                    {/* Lugar ng Misa */}
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Lugar ng Misa / Pagbabasbas <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.mass_location || ''}
                                            onChange={e => handleSpecificDataChange('mass_location', e.target.value)}
                                            required
                                            placeholder="Hal. Parokya / Simbahan, Funeral Parlor, o Tirahan"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    {/* Petsa ng Kamatayan */}
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Petsa ng Kamatayan (Date of Death) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.specific_data.date_of_death || ''}
                                            onChange={e => handleSpecificDataChange('date_of_death', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    {/* Pangalan ng Asawa ng Namatay */}
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Pangalan ng Asawa ng Namatay (Kung mayroon / kung kasal)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.spouse_name || ''}
                                            onChange={e => handleSpecificDataChange('spouse_name', e.target.value)}
                                            placeholder="Buong pangalan ng asawa"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pangalan at Numero ng Nagpalista */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> Pangalan at Numero ng Nagpalista (Informant / Contact Person)
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Pangalan ng Nagpalista <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_name}
                                            onChange={e => {
                                                setData('requester_name', e.target.value);
                                                handleSpecificDataChange('informant_name', e.target.value);
                                            }}
                                            required
                                            placeholder="Buong pangalan ng nagpalista"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Numero ng Nagpalista <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => {
                                                setData('requester_contact', e.target.value);
                                                handleSpecificDataChange('informant_contact', e.target.value);
                                            }}
                                            required
                                            placeholder="Hal. 09171234567 o telepono"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Kaugnayan sa Namatay (Relationship)
                                        </label>
                                        <select
                                            value={data.requester_relationship || 'Pamilya'}
                                            onChange={e => setData('requester_relationship', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="Asawa">Asawa (Spouse)</option>
                                            <option value="Anak">Anak (Child)</option>
                                            <option value="Magulang">Magulang (Parent)</option>
                                            <option value="Kapatid">Kapatid (Sibling)</option>
                                            <option value="Kamag-anak">Kamag-anak (Relative)</option>
                                            <option value="Kinatawan">Kinatawan (Authorized Representative)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Paring Magmimisa Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magmimisa / Magbabasbas (Presiding Clergy)"
                                subtitle="Piliin ang nais na pari para sa misa o pagbabasbas, o maglagay ng visiting priest"
                            />

                            {/* 2. Tungkol sa Namatay */}
                            <div className="space-y-4">
                                <div className="border-b pb-2">
                                    <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-amber-600" /> Tungkol sa Namatay (Information About the Deceased)
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Mahalaga ang mga detalyeng ito para sa talaan ng parokya at sa paghahanda ng homilya ng pari.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Card 1: Pangunahing Impormasyon ng Namatay */}
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            Pangunahing Detalye ng Yumao
                                        </h3>

                                        <div className="space-y-3">
                                            {/* Pangalan ng Namatay */}
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-800">
                                                    Pangalan ng Namatay <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.specific_data.deceased_name || ''}
                                                    onChange={e => handleSpecificDataChange('deceased_name', e.target.value)}
                                                    required
                                                    placeholder="Buong Pangalan ng Yumao"
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                                />
                                            </div>

                                            {/* Tirahan */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                    Tirahan (Address / Residence) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.specific_data.deceased_address || ''}
                                                    onChange={e => handleSpecificDataChange('deceased_address', e.target.value)}
                                                    required
                                                    placeholder="Tirahan / Huling Address ng Namatay"
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Edad */}
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                        Edad (Age) <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="130"
                                                        value={data.specific_data.deceased_age || ''}
                                                        onChange={e => handleSpecificDataChange('deceased_age', e.target.value)}
                                                        required
                                                        placeholder="Hal. 65"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                                    />
                                                </div>

                                                {/* Bilang ng Anak */}
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                        Bilang ng Anak
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={data.specific_data.children_count || ''}
                                                        onChange={e => handleSpecificDataChange('children_count', e.target.value)}
                                                        placeholder="Hal. 3"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Civil Status */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                    Civil Status
                                                </label>
                                                <select
                                                    value={data.specific_data.deceased_civil_status || 'Married'}
                                                    onChange={e => handleSpecificDataChange('deceased_civil_status', e.target.value)}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                                >
                                                    <option value="Single">Single (Walang Asawa)</option>
                                                    <option value="Married">Kasal (Married)</option>
                                                    <option value="Widowed">Balo (Widowed)</option>
                                                    <option value="Separated">Hiwalay (Separated)</option>
                                                </select>
                                            </div>

                                            {/* Dahilan ng Pagkamatay */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                    Dahilan ng Pagkamatay (Cause of Death)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.specific_data.cause_of_death || ''}
                                                    onChange={e => handleSpecificDataChange('cause_of_death', e.target.value)}
                                                    placeholder="Hal. Sakit sa puso, katandaan, atbp."
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2: Para sa Homilya at Pag-alaala */}
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                Para sa Homilya at Pag-alaala
                                            </h3>

                                            {/* Katangian ng Namatay */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                    Katangian ng Namatay (Character &amp; Virtues)
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    value={data.specific_data.character_traits || ''}
                                                    onChange={e => handleSpecificDataChange('character_traits', e.target.value)}
                                                    placeholder="Hal. Mapagmahal na magulang, masayahin, matulungin sa kapwa, tapat na lingkod ng simbahan..."
                                                    className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-amber-500 leading-relaxed"
                                                />
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    Maaaring gamitin ito ng paring magmimisa para sa kanyang pagninilay at homilya.
                                                </p>
                                            </div>

                                            {/* Paboritong libangan kapag kasama ang Pamilya */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-slate-700">
                                                    Paboritong libangan kapag kasama ang Pamilya (Favorite Family Hobby/Pastime)
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={data.specific_data.favorite_family_hobby || ''}
                                                    onChange={e => handleSpecificDataChange('favorite_family_hobby', e.target.value)}
                                                    placeholder="Hal. Sama-samang nagsisimba tuwing Linggo, nagluluto ng pagkain para sa pamilya, nagkukuwentuhan sa hapag-kainan..."
                                                    className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-amber-500 leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2 mt-2">
                                            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                            <span>Ang mga impormasyong ito ay nakatutulong upang gawing mas personal at makahulugan ang Banal na Misa at Panalangin.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Detalye ng Paglilibing (Burial Details) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <div className="border-b pb-3">
                                    <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-amber-600" /> Detalye ng Paglilibing (Burial Details)
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Impormasyon ukol sa huling hantungan at sakramento bago ang pagpanaw ng yumao.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Nakapag pahid ba ng langis para sa mga may sakit bago ang kamatayan? */}
                                    <div className="sm:col-span-2 bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2">
                                        <label className="block text-xs font-bold text-slate-800">
                                            Nakapag pahid ba ng langis para sa mga may sakit bago ang kamatayan? <span className="text-slate-500 font-normal">(Anointing of the Sick / Viaticum)</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                            {[
                                                { value: 'yes', label: 'Oo (Nakatanggap ng langis)' },
                                                { value: 'no', label: 'Hindi (Hindi nakapag-pahid)' },
                                                { value: 'unsure', label: 'Hindi Sigurado' },
                                            ].map(opt => (
                                                <label
                                                    key={opt.value}
                                                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                        data.specific_data.received_anointing_before_death === opt.value
                                                            ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="received_anointing_before_death"
                                                        value={opt.value}
                                                        checked={data.specific_data.received_anointing_before_death === opt.value}
                                                        onChange={e => handleSpecificDataChange('received_anointing_before_death', e.target.value)}
                                                        className="text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                                    />
                                                    <span>{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Kelan ililibing ang yumao? */}
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Kelan ililibing ang yumao? <span className="text-slate-500 font-normal">(Date &amp; Time of Burial)</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={data.specific_data.burial_date || ''}
                                            onChange={e => handleSpecificDataChange('burial_date', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Araw at oras ng paghahatid sa huling hantungan o libingan.
                                        </p>
                                    </div>

                                    {/* Saan ililibing ang yumao: */}
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Saan ililibing ang yumao: <span className="text-slate-500 font-normal">(Cemetery / Memorial Location)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.burial_location || ''}
                                            onChange={e => handleSpecificDataChange('burial_location', e.target.value)}
                                            placeholder="Hal. Sementeryo, Memorial Park, o Columbarium..."
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Pangalan at lugar ng sementeryo o columbarium.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Physical Document Submission Notice */}
                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-amber-950 font-serif">
                                            Paalala ukol sa Pagsusumite ng mga Dokumento
                                        </h3>
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                            Hindi na kailangan mag-upload ng mga dokumento online. Mangyaring dalhin at isumite nang pisikal sa Tanggapan ng Parokya (Parish Office) ang sumusunod na kinakailangang dokumento para sa pagpapatunay:
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            Death Certificate (Katibayan ng Pagkamatay)
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-6">
                                            Orihinal o Certified True Copy / Photocopy mula sa Local Civil Registrar o PSA.
                                        </p>
                                    </div>

                                    <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
                                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            Valid ID ng Nagpalista
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-6">
                                            Kopya ng valid government-issued ID ng taong nagpalista / representative.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : data.sacrament_type === 'sponsored_mass' ? (
                        <div className="space-y-6">
                            {/* 1. Detalye ng Serbisyo at Parokya */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> Detalye ng Misa at Parokya (Sponsored Mass)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Parokya / Parish Church <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={data.parish_id}
                                            onChange={e => setData('parish_id', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">-- Piliin ang Parokya --</option>
                                            {parishes.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.city_municipality})</option>
                                            ))}
                                        </select>
                                        {errors.parish_id && <p className="text-xs text-rose-500 mt-1">{errors.parish_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Serbisyo / Sakramento</label>
                                        <select
                                            value={data.sacrament_type}
                                            onChange={e => {
                                                const newType = e.target.value;
                                                setData({
                                                    ...data,
                                                    sacrament_type: newType,
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Date and Time of Mass (Petsa at Oras ng Misa) <span className="text-rose-500">*</span>
                                        </label>
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
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Location of Mass (Lugar ng Misa) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.mass_location || ''}
                                            onChange={e => handleSpecificDataChange('mass_location', e.target.value)}
                                            required
                                            placeholder="Hal. Parish Main Church, Chapel ng Barangay, o Residence"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Layunin ng Misa (Mass Intentions Checkbox Group) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Sparkles className="w-4 h-4 text-amber-600" /> Layunin ng Misa / Mass Intention
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Piliin ang naaangkop na layunin ng sponsored mass at ilagay ang pangalan ng pararangalan o pasasalamatan:
                                </p>

                                <div className="space-y-3.5 bg-amber-50/40 p-4 rounded-xl border border-amber-200/80">
                                    {/* Thanksgiving */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={data.specific_data.sponsored_thanksgiving || false}
                                                onChange={e => handleSpecificDataChange('sponsored_thanksgiving', e.target.checked)}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>Thanksgiving mass of:</span>
                                        </label>
                                        {data.specific_data.sponsored_thanksgiving && (
                                            <input
                                                type="text"
                                                value={data.specific_data.sponsored_thanksgiving_of || ''}
                                                onChange={e => handleSpecificDataChange('sponsored_thanksgiving_of', e.target.value)}
                                                placeholder="Pangalan ng indibidwal, pamilya, o grupo na nagpapasalamat"
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 ml-6 max-w-[calc(100%-1.5rem)]"
                                            />
                                        )}
                                    </div>

                                    {/* Wedding Anniversary */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={data.specific_data.sponsored_wedding_anniversary || false}
                                                onChange={e => handleSpecificDataChange('sponsored_wedding_anniversary', e.target.checked)}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>Wedding Anniversary of:</span>
                                        </label>
                                        {data.specific_data.sponsored_wedding_anniversary && (
                                            <input
                                                type="text"
                                                value={data.specific_data.sponsored_wedding_anniversary_of || ''}
                                                onChange={e => handleSpecificDataChange('sponsored_wedding_anniversary_of', e.target.value)}
                                                placeholder="Hal. Mr. & Mrs. Juan at Maria Dela Cruz (25th Anniversary)"
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 ml-6 max-w-[calc(100%-1.5rem)]"
                                            />
                                        )}
                                    </div>

                                    {/* Birthday */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={data.specific_data.sponsored_birthday || false}
                                                onChange={e => handleSpecificDataChange('sponsored_birthday', e.target.checked)}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>Birthday of:</span>
                                        </label>
                                        {data.specific_data.sponsored_birthday && (
                                            <input
                                                type="text"
                                                value={data.specific_data.sponsored_birthday_of || ''}
                                                onChange={e => handleSpecificDataChange('sponsored_birthday_of', e.target.value)}
                                                placeholder="Pangalan ng nagdiriwang ng kaarawan"
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 ml-6 max-w-[calc(100%-1.5rem)]"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Detalye ng Kinatawan / Representative */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> Detalye ng Kinatawan (Representative)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Name of Representative (Pangalan ng Kinatawan) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_name}
                                            onChange={e => setData('requester_name', e.target.value)}
                                            required
                                            placeholder="Buong pangalan ng kinatawan / nagpalista"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                        />
                                        {errors.requester_name && <p className="text-xs text-rose-500 mt-1">{errors.requester_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 o 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Address (Tirahan ng Kinatawan) <span className="text-rose-500">*</span>
                                        </label>
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

                            {/* 4. Preferred Clergy Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magmimisa (Presiding Clergy)"
                                subtitle="Piliin ang nais na pari para sa sponsored mass o maglagay ng visiting priest"
                            />

                            {/* 5. Quotation Reminder & Add-ons Checklist */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-6 shadow-xs space-y-4">
                                <div className="flex items-start justify-between border-b border-amber-200/80 pb-3">
                                    <div className="space-y-1">
                                        <h3 className="font-serif text-base font-bold text-amber-950 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-amber-600" />
                                            Quotation Information &amp; Add-ons
                                        </h3>
                                        <p className="text-xs text-amber-900">
                                            Base price for sponsored masses: <strong>Php 2,000</strong>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-amber-700 uppercase block">Total Quotation</span>
                                        <span className="text-xl font-black text-amber-950 font-serif">
                                            Php {getSponsoredMassTotal().toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-800 block">Add Ons Checklist (Optional):</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                            data.specific_data.sponsored_livestream ? 'bg-amber-100/70 border-amber-400 font-semibold' : 'bg-white border-amber-200 hover:border-amber-300'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={data.specific_data.sponsored_livestream || false}
                                                onChange={e => handleSpecificDataChange('sponsored_livestream', e.target.checked)}
                                                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <div className="space-y-0.5 text-xs">
                                                <span className="text-slate-900 font-bold block">Livestream</span>
                                                <span className="text-amber-800 font-bold block">+ Php 500</span>
                                                <p className="text-[11px] text-slate-500">Parish liturgical multi-camera livestream coverage</p>
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                            data.specific_data.sponsored_choir ? 'bg-amber-100/70 border-amber-400 font-semibold' : 'bg-white border-amber-200 hover:border-amber-300'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={data.specific_data.sponsored_choir || false}
                                                onChange={e => handleSpecificDataChange('sponsored_choir', e.target.checked)}
                                                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <div className="space-y-0.5 text-xs">
                                                <span className="text-slate-900 font-bold block">Choir</span>
                                                <span className="text-amber-800 font-bold block">+ Php 1,000</span>
                                                <p className="text-[11px] text-slate-500">Parish liturgical choir / music ministry</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                    <span>
                                        Ang stipend/offering ay maaaring bayaran nang pisikal sa Tanggapan ng Parokya bago o sa araw ng nakatakdang misa.
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : data.sacrament_type === 'bone_transfer' ? (
                        <div className="space-y-6">
                            {/* 1. Schedule at Detalye ng Paglilipat */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> Detalye ng Paglilipat ng Buto / Abo (Bone/Ash Transfer)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Date Today (Petsa Ngayon)
                                        </label>
                                        <input
                                            type="date"
                                            value={data.specific_data.date_today || new Date().toISOString().slice(0, 10)}
                                            onChange={e => handleSpecificDataChange('date_today', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Parokya / Parish Church <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={data.parish_id}
                                            onChange={e => setData('parish_id', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">-- Piliin ang Parokya --</option>
                                            {parishes.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.city_municipality})</option>
                                            ))}
                                        </select>
                                        {errors.parish_id && <p className="text-xs text-rose-500 mt-1">{errors.parish_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Serbisyo / Sakramento</label>
                                        <select
                                            value={data.sacrament_type}
                                            onChange={e => {
                                                const newType = e.target.value;
                                                setData({
                                                    ...data,
                                                    sacrament_type: newType,
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Date and Time of Funeral Blessing (Petsa at Oras ng Pagbabasbas) <span className="text-rose-500">*</span>
                                        </label>
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

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Name of Cemetery where bone will be transferred (Sementeryong Paglilipatan) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.target_cemetery || ''}
                                            onChange={e => handleSpecificDataChange('target_cemetery', e.target.value)}
                                            required
                                            placeholder="Pangalan at lokasyon ng sementeryo o columbarium na paglilipatan ng buto o abo"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Detalye ng Kinatawan / Representative */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> Detalye ng Kinatawan (Representative)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Name of Representative (Pangalan ng Kinatawan) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_name}
                                            onChange={e => setData('requester_name', e.target.value)}
                                            required
                                            placeholder="Buong pangalan ng kinatawan"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                        />
                                        {errors.requester_name && <p className="text-xs text-rose-500 mt-1">{errors.requester_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 o 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Address of Representative (Tirahan ng Kinatawan) <span className="text-rose-500">*</span>
                                        </label>
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

                            {/* 3. Transfer of Bones Details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <FileText className="w-4 h-4 text-amber-600" /> Transfer of Bones Details (Tungkol sa Namatay)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Name of Deceased (Pangalan ng Namatay) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.deceased_name || ''}
                                            onChange={e => handleSpecificDataChange('deceased_name', e.target.value)}
                                            required
                                            placeholder="Buong pangalan ng yumaong ililipat ang buto o abo"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Age when he/she died (Edad nang Pumanaw)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="130"
                                            value={data.specific_data.deceased_age || ''}
                                            onChange={e => handleSpecificDataChange('deceased_age', e.target.value)}
                                            placeholder="Hal. 65"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Civil Status</label>
                                        <select
                                            value={data.specific_data.deceased_civil_status || 'Single'}
                                            onChange={e => handleSpecificDataChange('deceased_civil_status', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            If married, indicate number of sons/daughters (Bilang ng Anak)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.children_count || ''}
                                            onChange={e => handleSpecificDataChange('children_count', e.target.value)}
                                            placeholder="Hal. 3 lalaki, 2 babae (o 5 anak)"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Address of Residency (Tirahan ng Yumao)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.specific_data.deceased_address || ''}
                                            onChange={e => handleSpecificDataChange('deceased_address', e.target.value)}
                                            placeholder="Dating tirahan ng yumaong ililipat ang mga labi"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Preferred Clergy Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magbabasbas (Presiding Clergy)"
                                subtitle="Piliin ang nais na pari para sa pagbabasbas ng paglilipat ng buto o maglagay ng visiting priest"
                            />

                            {/* 5. Quotation Reminder & Canonical Requirements Notice */}
                            <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-700" />
                                        <h3 className="font-serif font-bold text-amber-950 text-sm sm:text-base">
                                            Quotation Reminder
                                        </h3>
                                    </div>
                                    <div className="bg-amber-100 text-amber-950 font-bold px-3 py-1 rounded-lg text-xs border border-amber-300">
                                        Php 100 + any amount of donation for the clergy
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs text-amber-900 leading-relaxed">
                                    <p>
                                        <strong>Kinakailangang Pisikal na Dokumento:</strong> Mangyaring dalhin at isumite sa tanggapan ng parokya ang mga sumusunod bago ang araw ng pagbabasbas:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                                        <li>Exhumation Permit mula sa City o Municipal Health Office</li>
                                        <li>Transfer / Transit Permit ng buto o abo</li>
                                        <li>Photocopy ng Death Certificate ng yumao</li>
                                        <li>Valid ID ng Kinatawan / Nagpalista</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : data.sacrament_type === 'blessing' ? (
                        <div className="space-y-6">
                            {/* 1. Parish Church & Schedule */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <Calendar className="w-4 h-4 text-amber-600" /> 1. Parish Church &amp; Schedule (Pagbabasbas / Blessing)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">
                                            Parokya / Parish Church <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={data.parish_id}
                                            onChange={e => setData('parish_id', e.target.value)}
                                            required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">-- Piliin ang Parokya --</option>
                                            {parishes.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.city_municipality})</option>
                                            ))}
                                        </select>
                                        {errors.parish_id && <p className="text-xs text-rose-500 mt-1">{errors.parish_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Serbisyo / Sakramento</label>
                                        <select
                                            value={data.sacrament_type}
                                            onChange={e => {
                                                const newType = e.target.value;
                                                setData({
                                                    ...data,
                                                    sacrament_type: newType,
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Preferred Date &amp; Time (Nais na Araw at Oras) <span className="text-rose-500">*</span>
                                        </label>
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
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Alternative Date &amp; Time (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={data.alternative_starts_at}
                                            onChange={e => setData('alternative_starts_at', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Applicant Details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <User className="w-4 h-4 text-amber-600" /> 2. Detalye ng Nagpapabasbas (Applicant Details)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_name}
                                            onChange={e => setData('requester_name', e.target.value)}
                                            required
                                            placeholder="Pangalan ng nagpapabasbas"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                                        />
                                        {errors.requester_name && <p className="text-xs text-rose-500 mt-1">{errors.requester_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-800">
                                            Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.requester_contact}
                                            onChange={e => setData('requester_contact', e.target.value)}
                                            required
                                            placeholder="e.g. 09171234567 o 7562572"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_contact && <p className="text-xs text-rose-500 mt-1">{errors.requester_contact}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Current Residential Address</label>
                                        <input
                                            type="text"
                                            value={data.requester_address}
                                            onChange={e => setData('requester_address', e.target.value)}
                                            placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Blessing Specifics & Location */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                                    <FileText className="w-4 h-4 text-amber-600" /> 3. Blessing Specifics &amp; Exact Location
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold mb-1 block">Type of Blessing</label>
                                        <select
                                            value={data.specific_data.blessing_category || 'House Blessing'}
                                            onChange={e => handleSpecificDataChange('blessing_category', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="House Blessing">House Blessing (Bahay / Tirahan)</option>
                                            <option value="Car/Vehicle Blessing">Car / Vehicle Blessing (Sasakyan)</option>
                                            <option value="Office/Business Blessing">Office / Business Blessing (Opisina / Tindahan)</option>
                                            <option value="Religious Article Blessing">Religious Articles / Image Blessing (Imahen / Santo)</option>
                                            <option value="Other Blessing">Other Solemn Blessing (Iba pang Pagbabasbas)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold mb-1 block">Venue Type</label>
                                        <select
                                            value={data.specific_data.venue_type || 'Off-site/At the specified address'}
                                            onChange={e => handleSpecificDataChange('venue_type', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500 font-semibold text-slate-800"
                                        >
                                            <option value="Off-site/At the specified address">Off-site / Outside Church Grounds (Sa Tirahan / Lugar)</option>
                                            <option value="At the Parish/Church Grounds">At the Parish / Church Grounds (Sa Loob ng Parokya)</option>
                                        </select>
                                    </div>

                                    {/* EXACT ADDRESS / LOCATION (Prominently shown and required if outside parish grounds) */}
                                    {data.specific_data.venue_type !== 'At the Parish/Church Grounds' && (
                                        <div className="sm:col-span-2 bg-amber-50/50 border border-amber-300 rounded-xl p-4 space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-amber-950">
                                                    Exact Address / Location of Blessing (Eksaktong Tirahan o Lugar ng Pagbabasbas) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.specific_data.complete_address || ''}
                                                    onChange={e => handleSpecificDataChange('complete_address', e.target.value)}
                                                    required
                                                    placeholder="House/Unit No., Street/Subdivision, Barangay, City/Municipality, Landmark"
                                                    className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 text-slate-900"
                                                />
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    Pakilagay ang kumpletong direksyon at kilalang landmark upang madaling marating ng pari ang lokasyon.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1 text-slate-700">Transportation Arrangement</label>
                                                    <select
                                                        value={data.specific_data.transport_arrangement || 'Requestor will pick up/drop off the priest'}
                                                        onChange={e => handleSpecificDataChange('transport_arrangement', e.target.value)}
                                                        className="w-full border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500"
                                                    >
                                                        <option value="Requestor will pick up/drop off the priest">Susunduin at ihahatid ang pari ng nagpapabasbas</option>
                                                        <option value="Priest will use own vehicle/transport">Gagamitin ng pari ang kanyang sariling sasakyan</option>
                                                        <option value="To be coordinated with parish office">Pag-uusapan pa sa tanggapan ng parokya</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold mb-1 text-slate-700">On-site Contact Person &amp; Number</label>
                                                    <input
                                                        type="text"
                                                        value={data.specific_data.onsite_contact_name || ''}
                                                        onChange={e => handleSpecificDataChange('onsite_contact_name', e.target.value)}
                                                        placeholder="Hal. Juan Dela Cruz - 09171234567"
                                                        className="w-full border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. Preferred Clergy Selection */}
                            <ClergySelector
                                clergy={clergy}
                                selectedClergyId={data.requested_clergy_id}
                                onSelectClergyId={id => setData('requested_clergy_id', id)}
                                guestPriestName={data.specific_data.guest_priest_name}
                                onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                label="Paring Magbabasbas (Presiding Clergy)"
                                subtitle="Piliin ang nais na pari para sa pagbabasbas o maglagay ng visiting priest"
                            />

                            {/* 5. Quotation Reminder */}
                            <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
                                    <div className="space-y-0.5">
                                        <h3 className="font-serif font-bold text-amber-950 text-sm sm:text-base">
                                            Quotation Reminder
                                        </h3>
                                        <p className="text-xs text-amber-900">
                                            Pamantayang taripa para sa pagbabasbas at abuloy para sa naglilingkod na pari
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-amber-100 text-amber-950 font-bold px-3.5 py-1.5 rounded-xl text-xs sm:text-sm border border-amber-300 shrink-0">
                                    Php 100 + any amount of donation for the clergy
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Phase 1: Requestor Details (General Fallback) */}
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
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
                                        />
                                        {errors.requester_email && <p className="text-xs text-rose-500 mt-1">{errors.requester_email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Relationship</label>
                                        <select
                                            value={data.requester_relationship}
                                            onChange={e => setData('requester_relationship', e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="Self">Self / Applicant</option>
                                            <option value="Parent">Parent (Father / Mother)</option>
                                            <option value="Family Member">Family Member</option>
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
                                    <Calendar className="w-4 h-4 text-amber-600" /> 2. Parish &amp; Liturgical Schedule
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
                                                    certificate_submission_mode: 'follow_up_office',
                                                });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="baptism">Baptism (Binyag)</option>
                                            <option value="confirmation">Confirmation (Kumpil)</option>
                                            <option value="matrimony">Matrimony / Wedding</option>
                                            <option value="funeral">Mass / Blessing for Departed (Para sa Yumao)</option>
                                            <option value="sponsored_mass">Sponsored Mass</option>
                                            <option value="bone_transfer">Bone / Ash Transfer (Paglilipat ng Buto / Abo)</option>
                                            <option value="blessing">Blessing</option>
                                        </select>
                                    </div>

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
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Preferred Date &amp; Time</label>
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
                                        <label className="block text-xs font-semibold mb-1 text-slate-700">Alternative Date &amp; Time (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={data.alternative_starts_at}
                                            onChange={e => setData('alternative_starts_at', e.target.value)}
                                            className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 ${
                                                isAltInvalid ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 bg-white'
                                            }`}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <ClergySelector
                                            clergy={clergy}
                                            selectedClergyId={data.requested_clergy_id}
                                            onSelectClergyId={id => setData('requested_clergy_id', id)}
                                            guestPriestName={data.specific_data.guest_priest_name}
                                            onChangeGuestPriestName={name => handleSpecificDataChange('guest_priest_name', name)}
                                            label="Nais na Pari / Officiating Clergy (Opsyonal)"
                                            subtitle="Piliin ang nais na pari o maglagay ng visiting priest para sa serbisyo"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <FormActions
                        submitLabel={
                            data.sacrament_type === 'baptism'
                                ? 'Submit Baptism Appointment Request'
                                : data.sacrament_type === 'confirmation'
                                ? 'Submit Confirmation Appointment Request'
                                : data.sacrament_type === 'matrimony'
                                ? 'Submit Nuptial / Matrimony Appointment Request'
                                : data.sacrament_type === 'funeral'
                                ? 'Submit Mass / Blessing for Departed Request'
                                : data.sacrament_type === 'sponsored_mass'
                                ? 'Submit Sponsored Mass Appointment Request'
                                : data.sacrament_type === 'bone_transfer'
                                ? 'Submit Bone / Ash Transfer Request'
                                : data.sacrament_type === 'blessing'
                                ? 'Submit Blessing Appointment Request'
                                : 'Submit Sacrament Request'
                        }
                        cancelHref="/portal/dashboard"
                        processing={processing}
                    />
                </form>
            </div>
        </PortalLayout>
    );
}
