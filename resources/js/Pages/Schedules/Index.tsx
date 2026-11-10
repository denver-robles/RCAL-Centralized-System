import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Clergy, PageProps, SacramentSchedule, ScheduleStatus, Venue } from '@/types';
import {
    parseSacramentDate,
    formatSacramentDate,
    formatSacramentTime,
    formatSacramentTimeRange,
    toDateTimeLocalString,
    addHoursToDateTimeLocal,
} from '@/utils/date';
import {
    Calendar,
    Plus,
    Clock,
    MapPin,
    User,
    CheckCircle2,
    XCircle,
    ArrowRight,
    ShieldAlert,
    FileText,
    Download,
    CheckSquare,
    Square,
    AlertCircle,
    BookOpen,
    MessageSquare,
    Sparkles,
    Eye,
    CalendarDays,
    Settings,
    Church,
    CreditCard,
} from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props extends PageProps {
    schedules: PaginatedData<SacramentSchedule>;
    venues: Venue[];
    clergy: Clergy[];
    filters: {
        status?: string;
        sacrament_type?: string;
        date?: string;
    };
}

export default function Index({ schedules, venues, clergy, filters }: Props) {
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [viewingSchedule, setViewingSchedule] = useState<SacramentSchedule | null>(null);

    // Helper for calculating standard baptism fee: Mon-Fri Special = 1500; Sat-Sun Regular or Special = 800
    const getRecommendedBaptismFee = (startsAt?: string | null, baptismType?: string | null): number => {
        const isSolo = baptismType === 'solo';
        if (!startsAt) {
            return isSolo ? 1500 : 800;
        }
        const datePart = startsAt.slice(0, 10);
        const [y, m, d] = datePart.split('-').map(Number);
        if (!y || !m || !d) {
            return isSolo ? 1500 : 800;
        }
        const day = new Date(y, m - 1, d).getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = day === 0 || day === 6;

        if (!isWeekend && isSolo) {
            return 1500;
        }
        return 800;
    };

    // Processing modal state
    const [processingSchedule, setProcessingSchedule] = useState<SacramentSchedule | null>(null);
    const [processForm, setProcessForm] = useState({
        status: 'processing' as ScheduleStatus,
        starts_at: '',
        ends_at: '',
        presiding_clergy_id: '',
        guest_priest_name: '',
        add_to_clergy_directory: true,
        staff_notes: '',
        baptism_type: 'regular',
        amount: '' as string | number,
        document_checklist: {
            baptism_subject: false,
            confirmation_witnesses: false,
            marriage_parents: false,
            baptism_parents: false,
            baptismal_permit: false,
            psa_birth_cert: false,

            // Marriage / Matrimony
            marriage_baptismal_cert: false,
            marriage_confirmation_cert: false,
            marriage_psa_birth: false,
            marriage_cenomar: false,
            marriage_banns: false,
            marriage_permit: false,
            marriage_license: false,
            marriage_singleness: false,
            marriage_precana: false,
            marriage_couple_pic: false,
        } as Record<string, boolean>,
    });

    // Completion / Handwritten Register Citation modal state
    const [completingSchedule, setCompletingSchedule] = useState<SacramentSchedule | null>(null);
    const [previewAttachment, setPreviewAttachment] = useState<any>(null);
    const [completionForm, setCompletionForm] = useState({
        book_number: '1',
        page_number: '1',
        entry_number: '1',
    });

    const openProcessModal = (schedule: SacramentSchedule) => {
        setProcessingSchedule(schedule);
        const startStr = toDateTimeLocalString(schedule.starts_at);
        let endStr = toDateTimeLocalString(schedule.ends_at);
        if (!endStr && startStr) {
            endStr = addHoursToDateTimeLocal(startStr, 1);
        }

        const existingType = schedule.baptism_type || schedule.specific_data?.baptism_type || '';
        const rawAmount = schedule.amount ?? schedule.donation_amount ?? schedule.specific_data?.amount ?? schedule.specific_data?.donation_amount;

        let initialType = existingType || 'regular';
        if (!existingType && startStr) {
            const datePart = startStr.slice(0, 10);
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) {
                const day = new Date(y, m - 1, d).getDay();
                const isWeekend = day === 0 || day === 6;
                initialType = isWeekend ? 'regular' : 'solo';
            }
        }

        let initialAmount: string | number = rawAmount !== null && rawAmount !== undefined && rawAmount !== '' ? rawAmount : '';
        if (schedule.sacrament_type === 'baptism' && (initialAmount === '' || initialAmount === null || initialAmount === undefined)) {
            initialAmount = getRecommendedBaptismFee(startStr, initialType);
        }

        const requestedGuest = schedule.specific_data?.guest_priest_name || schedule.specific_data?.requested_guest_priest_name || '';
        const initialClergyId = schedule.presiding_clergy_id
            ? schedule.presiding_clergy_id.toString()
            : (schedule.requested_clergy_id ? schedule.requested_clergy_id.toString() : (requestedGuest ? 'guest' : ''));

        setProcessForm({
            status: schedule.status === 'requested' ? 'processing' : schedule.status,
            starts_at: startStr,
            ends_at: endStr,
            presiding_clergy_id: initialClergyId,
            guest_priest_name: requestedGuest,
            add_to_clergy_directory: true,
            staff_notes: schedule.staff_notes || '',
            baptism_type: initialType,
            amount: initialAmount,
            document_checklist: {
                baptism_subject: schedule.document_checklist?.baptism_subject || false,
                confirmation_witnesses: schedule.document_checklist?.confirmation_witnesses || false,
                marriage_parents: schedule.document_checklist?.marriage_parents || false,
                baptism_parents: schedule.document_checklist?.baptism_parents || false,
                baptismal_permit: schedule.document_checklist?.baptismal_permit || false,
                psa_birth_cert: schedule.document_checklist?.psa_birth_cert || false,

                // Marriage / Matrimony
                marriage_baptismal_cert: schedule.document_checklist?.marriage_baptismal_cert || false,
                marriage_confirmation_cert: schedule.document_checklist?.marriage_confirmation_cert || false,
                marriage_psa_birth: schedule.document_checklist?.marriage_psa_birth || false,
                marriage_cenomar: schedule.document_checklist?.marriage_cenomar || false,
                marriage_banns: schedule.document_checklist?.marriage_banns || false,
                marriage_permit: schedule.document_checklist?.marriage_permit || false,
                marriage_license: schedule.document_checklist?.marriage_license || false,
                marriage_singleness: schedule.document_checklist?.marriage_singleness || false,
                marriage_precana: schedule.document_checklist?.marriage_precana || false,
                marriage_couple_pic: schedule.document_checklist?.marriage_couple_pic || false,
            },
        });
    };

    const handleBaptismTypeChange = (newType: string) => {
        const recommended = getRecommendedBaptismFee(processForm.starts_at, newType);
        setProcessForm(prev => ({
            ...prev,
            baptism_type: newType,
            amount: recommended,
        }));
    };

    const handleProcessSubmit = () => {
        if (!processingSchedule) return;
        router.post(`/schedules/${processingSchedule.id}/status`, {
            status: processForm.status,
            starts_at: processForm.starts_at || null,
            ends_at: processForm.ends_at || null,
            presiding_clergy_id: processForm.presiding_clergy_id === 'guest' ? null : (processForm.presiding_clergy_id ? parseInt(processForm.presiding_clergy_id) : null),
            guest_priest_name: processForm.presiding_clergy_id === 'guest' ? processForm.guest_priest_name : null,
            add_to_clergy_directory: processForm.presiding_clergy_id === 'guest' ? (processForm.add_to_clergy_directory ?? true) : false,
            staff_notes: processForm.staff_notes,
            document_checklist: processForm.document_checklist,
            baptism_type: processingSchedule.sacrament_type === 'baptism' ? processForm.baptism_type : null,
            amount: processingSchedule.sacrament_type === 'baptism' ? (processForm.amount !== '' && processForm.amount !== null ? parseFloat(processForm.amount.toString()) : null) : null,
        });
        setProcessingSchedule(null);
    };

    const openCompleteModal = (schedule: SacramentSchedule) => {
        setCompletingSchedule(schedule);
        setCompletionForm({
            book_number: '1',
            page_number: '1',
            entry_number: '1',
        });
    };

    const handleCompleteSubmit = () => {
        if (!completingSchedule) return;
        if (!completionForm.book_number || !completionForm.page_number || !completionForm.entry_number) {
            alert('Please specify the handwritten Book Volume, Page Number, and Entry Number from the parish register.');
            return;
        }

        router.post(`/schedules/${completingSchedule.id}/status`, {
            status: 'completed',
            book_number: parseInt(completionForm.book_number),
            page_number: parseInt(completionForm.page_number),
            entry_number: parseInt(completionForm.entry_number),
        });
        setCompletingSchedule(null);
    };

    const handleFilter = (updates: Partial<typeof filters>) => {
        router.get('/schedules', { ...filters, ...updates }, { preserveState: true, replace: true });
    };

    const handleCancelSubmit = () => {
        if (!cancellingId) return;
        router.post(`/schedules/${cancellingId}/status`, {
            status: 'cancelled',
            cancellation_reason: cancelReason || 'Cancelled by parish staff',
        });
        setCancellingId(null);
        setCancelReason('');
    };

    const getDocTypeLabel = (type: string) => {
        switch (type) {
            case 'psa_birth_cert': return "Child's / Candidate's PSA Birth Certificate";
            case 'baptismal_cert_subject': return "Candidate's Catholic Baptismal Certificate";
            case 'confirmation_cert_godparents': return "Confirmation / Marriage Certificate of Godparent(s)";
            case 'confirmation_permit': return "Confirmation Permit (Territorial Jurisdiction)";
            case 'marriage_cert_parents': return "Parents' Marriage Certificate";
            case 'baptismal_cert_father': return "Father's Catholic Baptismal Certificate";
            case 'baptismal_cert_mother': return "Mother's Catholic Baptismal Certificate";
            case 'baptismal_cert_parents': return "Parents' Baptismal Certificate";
            case 'baptismal_permit': return "Baptismal Permit (Territorial Jurisdiction)";
            case 'gov_id': return "Government Issued ID";
            case 'cenomar': return "PSA CENOMAR";
            case 'prev_certificate': return "Previous Canonical Certificate";
            default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    return (
        <PortalLayout
            title="Sacrament Schedules & Appointments"
            subtitle="Parish liturgical calendar, sacrament ceremony appointments, and minister schedules"
            activeTab="schedules"
        >
            <Head title="Sacrament Schedules - RCAL PIMS" />

            {/* Non-negotiable invariant indicator banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 mb-5 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                        <strong className="font-bold text-amber-800">RCAL Canonical Rule:</strong> This scheduling engine manages sacramental ceremonies (Baptism, Confirmation, Matrimony, Funerals, Blessings). Mass Intentions are strictly excluded.
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/schedules/settings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded-lg text-xs transition-colors shadow-2xs"
                    >
                        Schedule Settings & Days
                    </Link>
                    <Link
                        href="/schedules/create"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Appointment
                    </Link>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 mb-5 pb-2">
                <Link
                    href="/schedules"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-xs"
                >
                    <FileText className="w-4 h-4" />
                    <span>List View</span>
                </Link>
                <Link
                    href="/schedules/calendar"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <CalendarDays className="w-4 h-4 text-amber-600" />
                    <span>Calendar View</span>
                </Link>
                <Link
                    href="/schedules/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Sacrament Settings &amp; Days</span>
                </Link>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filters.status || 'all'}
                        onChange={(e) => handleFilter({ status: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                    >
                        <option value="all">All Statuses</option>
                        <option value="requested">Requested (Pending Approval)</option>
                        <option value="on_hold">On Hold</option>
                        <option value="processing">Processing</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={filters.sacrament_type || 'all'}
                        onChange={(e) => handleFilter({ sacrament_type: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                    >
                        <option value="all">All Sacrament Types</option>
                        <option value="baptism">Baptism</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="wedding">Wedding / Matrimony</option>
                        <option value="funeral">Mass / Blessing for Departed</option>
                        <option value="blessing">Blessing</option>
                        <option value="sponsored_mass">Sponsored Mass</option>
                        <option value="bone_transfer">Bone / Ash Transfer</option>
                        <option value="reconciliation">Reconciliation / Confession</option>
                    </select>

                    <input
                        type="date"
                        value={filters.date || ''}
                        onChange={(e) => handleFilter({ date: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                    />

                    {(filters.status || filters.sacrament_type || filters.date) && (
                        <button
                            onClick={() => router.get('/schedules')}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500 font-medium">Total Appointments: {schedules.total}</div>
            </div>

            {/* Schedules Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                            <tr>
                                <th className="py-3 px-4">Date & Time</th>
                                <th className="py-3 px-4">Sacrament / Ceremony</th>
                                <th className="py-3 px-4">Officiating Clergy</th>
                                <th className="py-3 px-4">Requester / Subject</th>
                                <th className="py-3 px-4">Documents & Notes</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schedules.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-400">
                                        No sacrament appointments found for the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                schedules.data.map((schedule) => {
                                    const starts = schedule.starts_at ? new Date(schedule.starts_at) : null;
                                    const ends = schedule.ends_at ? new Date(schedule.ends_at) : null;
                                    const hasAttachments = (schedule.attachments || []).length > 0;
                                    const isCompletedWithoutRecord = schedule.status === 'completed' && !schedule.record_id;

                                    return (
                                        <tr key={schedule.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Date */}
                                            <td className="py-3 px-4">
                                                {schedule.starts_at ? (
                                                    <>
                                                        <div className="font-semibold text-slate-900">
                                                            {formatSacramentDate(schedule.starts_at)}
                                                        </div>
                                                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            {schedule.formatted_time || formatSacramentTimeRange(schedule.starts_at, schedule.ends_at)}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                                                        <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                                                        <span>Pending Assignment</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Sacrament */}
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 capitalize">
                                                    {schedule.title}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                                                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded capitalize font-medium">
                                                        {schedule.sacrament_type}
                                                    </span>
                                                    {schedule.certificate_submission_mode && (
                                                        <span className={`px-2 py-0.5 rounded border font-medium ${
                                                            schedule.certificate_submission_mode === 'online'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                                        }`}>
                                                            {schedule.certificate_submission_mode === 'online' ? 'Online Docs' : 'In-Person Submission'}
                                                        </span>
                                                    )}
                                                    {schedule.sacrament_type === 'baptism' && (schedule.baptism_type || schedule.specific_data?.baptism_type) && (
                                                        <span className={`px-2 py-0.5 rounded border font-bold ${
                                                            (schedule.baptism_type || schedule.specific_data?.baptism_type) === 'solo'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            {(schedule.baptism_type || schedule.specific_data?.baptism_type) === 'solo' ? 'Solo Baptism' : 'Regular Baptism'}
                                                        </span>
                                                    )}
                                                    {(schedule.amount ?? schedule.donation_amount ?? schedule.specific_data?.amount ?? schedule.specific_data?.donation_amount) !== undefined &&
                                                     (schedule.amount ?? schedule.donation_amount ?? schedule.specific_data?.amount ?? schedule.specific_data?.donation_amount) !== null &&
                                                     (schedule.amount ?? schedule.donation_amount ?? schedule.specific_data?.amount ?? schedule.specific_data?.donation_amount) !== '' && (
                                                        <span className="bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">
                                                            ₱{Number(schedule.amount ?? schedule.donation_amount ?? schedule.specific_data?.amount ?? schedule.specific_data?.donation_amount).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Clergy */}
                                            <td className="py-3 px-4 text-slate-700">
                                                {schedule.presiding_clergy ? (
                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-900">
                                                        <User className="w-3.5 h-3.5 text-amber-600" />
                                                        {schedule.presiding_clergy.titled_name}
                                                    </div>
                                                ) : schedule.specific_data?.guest_priest_name ? (
                                                    <div className="flex items-center gap-1 text-[11px] text-blue-700">
                                                        <User className="w-3.5 h-3.5 text-blue-600" />
                                                        {schedule.specific_data.guest_priest_name} (Guest)
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                )}

                                                {schedule.requested_clergy && !schedule.presiding_clergy && (
                                                    <div className="text-[10px] text-amber-700 mt-0.5">
                                                        Requested: {schedule.requested_clergy.titled_name}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Requester */}
                                            <td className="py-3 px-4 text-slate-700">
                                                <div className="font-semibold text-slate-900">
                                                    {schedule.specific_data?.groom_name && schedule.specific_data?.bride_name
                                                        ? `${schedule.specific_data.groom_name} & ${schedule.specific_data.bride_name}`
                                                        : (schedule.specific_data?.candidate_name || schedule.specific_data?.child_name || schedule.requester_name || 'N/A')}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    By: {schedule.requester_name} ({schedule.requester_relationship || 'Applicant'})
                                                </div>
                                                {schedule.requester_contact && (
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {schedule.requester_contact}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Documents & Notes */}
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-1 text-[11px]">
                                                    {hasAttachments ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                                            <CheckSquare className="w-3 h-3 text-emerald-600" />
                                                            {schedule.attachments?.length} files uploaded
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-slate-400">
                                                            <Square className="w-3 h-3" /> No digital files
                                                        </span>
                                                    )}

                                                    {schedule.staff_notes && (
                                                        <span className="inline-flex items-center gap-1 text-amber-700 text-[10px] truncate max-w-[150px]" title={schedule.staff_notes}>
                                                            <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                                                            {schedule.staff_notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4">
                                                <StatusBadge status={schedule.status} />
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {/* View Details */}
                                                    <button
                                                        onClick={() => setViewingSchedule(schedule)}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                                                    >
                                                        View
                                                    </button>

                                                    {/* Process Request (Stage & Checklist) */}
                                                    {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                                                        <button
                                                            onClick={() => openProcessModal(schedule)}
                                                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors shadow-2xs"
                                                        >
                                                            Process
                                                        </button>
                                                    )}

                                                    {/* Complete Request (Handwritten prompt) */}
                                                    {(schedule.status === 'scheduled' || schedule.status === 'confirmed') && (
                                                        <button
                                                            onClick={() => openCompleteModal(schedule)}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                                                        >
                                                            <BookOpen className="w-3 h-3" />
                                                            Complete
                                                        </button>
                                                    )}

                                                    {/* Fallback transcribe if already completed without record */}
                                                    {isCompletedWithoutRecord && (
                                                        <button
                                                            onClick={() => openCompleteModal(schedule)}
                                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium"
                                                        >
                                                            Transcribe
                                                        </button>
                                                    )}

                                                    {/* Cancel / Reject */}
                                                    {schedule.status !== 'cancelled' && schedule.status !== 'completed' && (
                                                        <button
                                                            onClick={() => setCancellingId(schedule.id)}
                                                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-[11px] transition-colors"
                                                        >
                                                            {schedule.status === 'requested' ? 'Reject' : 'Cancel'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal 1: View Full Details & Uploaded Files */}
            {viewingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setViewingSchedule(null)}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900">{viewingSchedule.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <StatusBadge status={viewingSchedule.status} />
                                    <span className="text-xs text-slate-500 capitalize">Parish: {viewingSchedule.parish?.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setViewingSchedule(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            {/* Requestor Info */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Applicant Details</h4>
                                <p><strong>Name:</strong> {viewingSchedule.requester_name}</p>
                                <p><strong>Relationship:</strong> {viewingSchedule.requester_relationship || 'N/A'}</p>
                                <p><strong>Contact:</strong> {viewingSchedule.requester_contact}</p>
                                <p><strong>Email:</strong> {viewingSchedule.requester_email || 'N/A'}</p>
                                <p><strong>Address:</strong> {viewingSchedule.requester_address || 'N/A'}</p>
                            </div>

                            {/* Schedule Info */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Schedule & Clergy</h4>
                                <p><strong>Preferred Start:</strong> {viewingSchedule.starts_at ? `${formatSacramentDate(viewingSchedule.starts_at)} at ${formatSacramentTime(viewingSchedule.starts_at)}` : 'Pending Office Assignment'}</p>
                                <p><strong>Alternative Start:</strong> {viewingSchedule.alternative_starts_at ? `${formatSacramentDate(viewingSchedule.alternative_starts_at)} at ${formatSacramentTime(viewingSchedule.alternative_starts_at)}` : 'None'}</p>
                                <p><strong>Assigned Minister:</strong> {viewingSchedule.presiding_clergy?.titled_name || viewingSchedule.specific_data?.guest_priest_name || 'Unassigned'}</p>
                                {viewingSchedule.requested_clergy && (
                                    <p className="text-amber-800"><strong>Parishioner Request:</strong> {viewingSchedule.requested_clergy.titled_name}</p>
                                )}
                                {viewingSchedule.specific_data?.requested_guest_priest_name && (
                                    <p className="text-amber-800"><strong>Parishioner Request (Visiting Priest):</strong> {viewingSchedule.specific_data.requested_guest_priest_name}</p>
                                )}
                                <p>
                                    <strong>Submission Mode:</strong>{' '}
                                    <span className="font-semibold text-slate-800">
                                        {viewingSchedule.certificate_submission_mode === 'follow_up_office' ? 'Follow Up at Office' : 'Online Upload'}
                                    </span>
                                </p>
                            </div>

                            {/* Sacrament-Specific Data */}
                            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Candidate & Sacramental Information</h4>
                                {viewingSchedule.specific_data ? (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                        {/* Matrimony specific keys */}
                                        {viewingSchedule.specific_data.groom_name && (
                                            <div><strong>Groom (Husband):</strong> {viewingSchedule.specific_data.groom_name} {viewingSchedule.specific_data.groom_dob && `(DOB: ${viewingSchedule.specific_data.groom_dob})`}</div>
                                        )}
                                        {viewingSchedule.specific_data.bride_name && (
                                            <div><strong>Bride (Wife):</strong> {viewingSchedule.specific_data.bride_name} {viewingSchedule.specific_data.bride_dob && `(DOB: ${viewingSchedule.specific_data.bride_dob})`}</div>
                                        )}
                                        {viewingSchedule.specific_data.groom_father_name && (
                                            <div><strong>Groom&apos;s Parents:</strong> {viewingSchedule.specific_data.groom_father_name} &amp; {viewingSchedule.specific_data.groom_mother_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.bride_father_name && (
                                            <div><strong>Bride&apos;s Parents:</strong> {viewingSchedule.specific_data.bride_father_name} &amp; {viewingSchedule.specific_data.bride_mother_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.groom_parish && (
                                            <div><strong>Groom Residence:</strong> {viewingSchedule.specific_data.groom_parish} {viewingSchedule.specific_data.groom_is_foreign_or_ofw === 'yes' && '(OFW / Foreign National)'}</div>
                                        )}
                                        {viewingSchedule.specific_data.bride_parish && (
                                            <div><strong>Bride Residence:</strong> {viewingSchedule.specific_data.bride_parish} {viewingSchedule.specific_data.bride_is_foreign_or_ofw === 'yes' && '(OFW / Foreign National)'}</div>
                                        )}
                                        {viewingSchedule.specific_data.witnesses && (
                                            <div className="col-span-2">
                                                <strong>Principal Sponsors:</strong> {viewingSchedule.specific_data.witnesses}
                                            </div>
                                        )}

                                        {/* Confirmation specific keys */}
                                        {viewingSchedule.specific_data.candidate_name && (
                                            <div><strong>Candidate (Confirmation):</strong> {viewingSchedule.specific_data.candidate_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.candidate_dob && (
                                            <div><strong>Date of Birth:</strong> {viewingSchedule.specific_data.candidate_dob}</div>
                                        )}
                                        {viewingSchedule.specific_data.candidate_gender && (
                                            <div><strong>Gender:</strong> {viewingSchedule.specific_data.candidate_gender}</div>
                                        )}
                                        {viewingSchedule.specific_data.candidate_father_name && (
                                            <div><strong>Father:</strong> {viewingSchedule.specific_data.candidate_father_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.candidate_mother_name && (
                                            <div><strong>Mother:</strong> {viewingSchedule.specific_data.candidate_mother_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.baptism_parish && (
                                            <div><strong>Baptism Parish:</strong> {viewingSchedule.specific_data.baptism_parish}</div>
                                        )}
                                        {viewingSchedule.specific_data.baptism_date && (
                                            <div><strong>Baptism Date:</strong> {viewingSchedule.specific_data.baptism_date}</div>
                                        )}
                                        {viewingSchedule.specific_data.godparent_name && (
                                            <div><strong>Sponsor (Ninong/Ninang):</strong> {viewingSchedule.specific_data.godparent_name} {viewingSchedule.specific_data.godparent_age && `(${viewingSchedule.specific_data.godparent_age} yrs old)`}</div>
                                        )}
                                        {viewingSchedule.specific_data.godparent_certificate_type && (
                                            <div><strong>Sponsor Canonical Cert:</strong> {viewingSchedule.specific_data.godparent_certificate_type === 'marriage' ? 'Catholic Marriage Cert' : 'Confirmation Cert'}</div>
                                        )}
                                        {viewingSchedule.specific_data.confirmation_resides_within_parish && (
                                            <div><strong>Territory Vicinity:</strong> {viewingSchedule.specific_data.confirmation_resides_within_parish === 'yes' ? 'Within Parish' : 'Outside Parish (Confirmation Permit Required)'}</div>
                                        )}

                                        {/* Baptism specific keys */}
                                        {viewingSchedule.specific_data.child_name && (
                                            <div><strong>Name of Child/Adult:</strong> {viewingSchedule.specific_data.child_name}</div>
                                        )}
                                        {viewingSchedule.specific_data.dob && (
                                            <div><strong>Date of Birth:</strong> {viewingSchedule.specific_data.dob}</div>
                                        )}
                                        {(viewingSchedule.specific_data.place_of_birth || viewingSchedule.specific_data.birthplace) && (
                                            <div><strong>Birthplace:</strong> {viewingSchedule.specific_data.place_of_birth || viewingSchedule.specific_data.birthplace}</div>
                                        )}
                                        {viewingSchedule.specific_data.gender && (
                                            <div><strong>Gender:</strong> {viewingSchedule.specific_data.gender}</div>
                                        )}

                                        {/* Father Information */}
                                        {viewingSchedule.specific_data.father_name && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Father:</strong> {viewingSchedule.specific_data.father_name}
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-0.5">
                                                    {viewingSchedule.specific_data.father_dob && <span>Birthdate: {viewingSchedule.specific_data.father_dob}</span>}
                                                    {viewingSchedule.specific_data.father_pob && <span>Birth Place: {viewingSchedule.specific_data.father_pob}</span>}
                                                    {viewingSchedule.specific_data.father_address && <span className="col-span-2">Address: {viewingSchedule.specific_data.father_address}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mother Information */}
                                        {viewingSchedule.specific_data.mother_name && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Mother:</strong> {viewingSchedule.specific_data.mother_name}
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-0.5">
                                                    {viewingSchedule.specific_data.mother_dob && <span>Birthdate: {viewingSchedule.specific_data.mother_dob}</span>}
                                                    {viewingSchedule.specific_data.mother_pob && <span>Birth Place: {viewingSchedule.specific_data.mother_pob}</span>}
                                                    {viewingSchedule.specific_data.mother_address && <span className="col-span-2">Address: {viewingSchedule.specific_data.mother_address}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Parents Marital Status */}
                                        {(viewingSchedule.specific_data.parents_status || viewingSchedule.specific_data.parents_marital_status) && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Parents Marital Status:</strong> {viewingSchedule.specific_data.parents_status || viewingSchedule.specific_data.parents_marital_status}
                                            </div>
                                        )}

                                        {/* Godfather (Ninong) */}
                                        {viewingSchedule.specific_data.godfather_name && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Godfather (Ninong):</strong> {viewingSchedule.specific_data.godfather_name}
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-0.5">
                                                    {viewingSchedule.specific_data.godfather_pob && <span>Birthplace: {viewingSchedule.specific_data.godfather_pob}</span>}
                                                    {viewingSchedule.specific_data.godfather_address && <span className="col-span-2">Address: {viewingSchedule.specific_data.godfather_address}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Godmother (Ninang) */}
                                        {viewingSchedule.specific_data.godmother_name && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Godmother (Ninang):</strong> {viewingSchedule.specific_data.godmother_name}
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-0.5">
                                                    {viewingSchedule.specific_data.godmother_pob && <span>Birthplace: {viewingSchedule.specific_data.godmother_pob}</span>}
                                                    {viewingSchedule.specific_data.godmother_address && <span className="col-span-2">Address: {viewingSchedule.specific_data.godmother_address}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legacy Godparents string if neither godfather_name nor godmother_name is present */}
                                        {!viewingSchedule.specific_data.godfather_name && !viewingSchedule.specific_data.godmother_name && viewingSchedule.specific_data.godparents && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong>Godparents / Witnesses:</strong>{' '}
                                                {typeof viewingSchedule.specific_data.godparents === 'string'
                                                    ? viewingSchedule.specific_data.godparents
                                                    : JSON.stringify(viewingSchedule.specific_data.godparents)}
                                            </div>
                                        )}

                                        {/* Mass / Blessing for Departed specific keys */}
                                        {(viewingSchedule.specific_data.deceased_name || viewingSchedule.sacrament_type === 'funeral') && (
                                            <div className="col-span-2 border-t border-slate-200/80 pt-1.5 mt-1">
                                                <strong className="text-amber-900 block mb-1">Para sa Yumao (Mass / Blessing for Departed):</strong>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                                                    {viewingSchedule.specific_data.deceased_name && (
                                                        <div><strong>Pangalan ng Namatay:</strong> {viewingSchedule.specific_data.deceased_name}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.date_of_death && (
                                                        <div><strong>Petsa ng Kamatayan:</strong> {viewingSchedule.specific_data.date_of_death}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.deceased_age && (
                                                        <div><strong>Edad:</strong> {viewingSchedule.specific_data.deceased_age} yrs old</div>
                                                    )}
                                                    {viewingSchedule.specific_data.deceased_civil_status && (
                                                        <div><strong>Civil Status:</strong> {viewingSchedule.specific_data.deceased_civil_status}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.spouse_name && (
                                                        <div><strong>Pangalan ng Asawa:</strong> {viewingSchedule.specific_data.spouse_name}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.children_count && (
                                                        <div><strong>Bilang ng Anak:</strong> {viewingSchedule.specific_data.children_count}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.cause_of_death && (
                                                        <div><strong>Dahilan ng Pagkamatay:</strong> {viewingSchedule.specific_data.cause_of_death}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.deceased_address && (
                                                        <div><strong>Tirahan:</strong> {viewingSchedule.specific_data.deceased_address}</div>
                                                    )}
                                                    <div>
                                                        <strong>Uri ng Serbisyo:</strong>{' '}
                                                        {[viewingSchedule.specific_data.service_mass && 'Misa', viewingSchedule.specific_data.service_blessing && 'Pagbabasbas'].filter(Boolean).join(' & ') || 'Misa / Pagbabasbas'}
                                                    </div>
                                                    {viewingSchedule.specific_data.mass_location && (
                                                        <div><strong>Lugar ng Misa:</strong> {viewingSchedule.specific_data.mass_location}</div>
                                                    )}
                                                    <div>
                                                        <strong>Nagpalista:</strong> {viewingSchedule.specific_data.informant_name || viewingSchedule.requester_name}{' '}
                                                        ({viewingSchedule.specific_data.informant_contact || viewingSchedule.requester_contact})
                                                    </div>
                                                    {viewingSchedule.specific_data.received_anointing_before_death && (
                                                        <div>
                                                            <strong>Pahid ng Langis:</strong>{' '}
                                                            {viewingSchedule.specific_data.received_anointing_before_death === 'yes'
                                                                ? 'Oo (Nakatanggap bago pumanaw)'
                                                                : viewingSchedule.specific_data.received_anointing_before_death === 'no'
                                                                ? 'Hindi nakatanggap'
                                                                : 'Hindi sigurado'}
                                                        </div>
                                                    )}
                                                    {viewingSchedule.specific_data.burial_date && (
                                                        <div><strong>Araw/Oras ng Libing:</strong> {viewingSchedule.specific_data.burial_date}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.burial_location && (
                                                        <div><strong>Lugar ng Libingan:</strong> {viewingSchedule.specific_data.burial_location}</div>
                                                    )}
                                                    {viewingSchedule.specific_data.character_traits && (
                                                        <div className="col-span-2 mt-1 pt-1 border-t border-slate-200">
                                                            <strong>Katangian ng Namatay (Homily):</strong>
                                                            <p className="text-slate-600 mt-0.5">{viewingSchedule.specific_data.character_traits}</p>
                                                        </div>
                                                    )}
                                                    {viewingSchedule.specific_data.favorite_family_hobby && (
                                                        <div className="col-span-2 mt-1">
                                                            <strong>Paboritong Libangan kasama ang Pamilya:</strong>
                                                            <p className="text-slate-600 mt-0.5">{viewingSchedule.specific_data.favorite_family_hobby}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">No specific details recorded.</p>
                                )}
                            </div>

                            {/* Uploaded Requirement Files */}
                            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1 flex items-center justify-between">
                                    <span>Uploaded Requirement Files</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                        {(viewingSchedule.attachments || []).length} file(s)
                                    </span>
                                </h4>

                                {(viewingSchedule.attachments || []).length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {viewingSchedule.attachments?.map((att) => {
                                            const viewUrl = att.view_url || `/schedule-attachments/${att.id}/view`;
                                            const downloadUrl = att.download_url || `/schedule-attachments/${att.id}/download`;

                                            return (
                                                <div
                                                    key={att.id}
                                                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-2">
                                                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                                                        <span className="font-medium text-slate-800 truncate text-xs" title={getDocTypeLabel(att.document_type)}>
                                                            {getDocTypeLabel(att.document_type)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewAttachment(att)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition"
                                                            title="Preview document inline"
                                                        >
                                                            <Eye className="w-3 h-3 text-amber-700" />
                                                            <span>Preview</span>
                                                        </button>
                                                        <a
                                                            href={viewUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition"
                                                            title="Open in new tab"
                                                        >
                                                            <span className="text-[11px] font-bold">↗</span>
                                                        </a>
                                                        <a
                                                            href={downloadUrl}
                                                            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition"
                                                            title="Download file"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic py-1">
                                        {viewingSchedule.certificate_submission_mode === 'follow_up_office'
                                            ? 'No online files uploaded. Parishioner indicated they will submit physical certificates directly to the parish office.'
                                            : 'No document attachments uploaded.'}
                                    </p>
                                )}
                            </div>

                            {/* Staff Notes & Checklist Status */}
                            {viewingSchedule.staff_notes && (
                                <div className="sm:col-span-2 bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
                                    <strong className="text-amber-900 block mb-1">Staff Notes / Reminders Sent:</strong>
                                    <p className="text-amber-950 whitespace-pre-wrap">{viewingSchedule.staff_notes}</p>
                                </div>
                            )}

                            {/* Payment Info & Receipt Review */}
                            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Payment &amp; Receipt Verification</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <p><strong>Method:</strong> {viewingSchedule.payment_method || 'N/A'}</p>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        <span className="uppercase font-bold text-slate-900">
                                            {viewingSchedule.payment_status?.replace(/_/g, ' ') || 'UNPAID'}
                                        </span>
                                    </p>
                                </div>

                                {viewingSchedule.payment_receipt_path && (
                                    <div className="pt-1">
                                        <a
                                            href={`/schedules/${viewingSchedule.id}/receipt`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-amber-700 underline font-semibold hover:text-amber-800"
                                        >
                                            View Uploaded Payment Receipt (Secure)
                                        </a>
                                    </div>
                                )}

                                {viewingSchedule.payment_status === 'pending_verification' && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                router.post(`/schedules/${viewingSchedule.id}/verify-payment`, {
                                                    payment_status: 'paid',
                                                }, {
                                                    onSuccess: () => setViewingSchedule(null),
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                        >
                                            Confirm Receipt as Paid
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                router.post(`/schedules/${viewingSchedule.id}/verify-payment`, {
                                                    payment_status: 'unpaid',
                                                }, {
                                                    onSuccess: () => setViewingSchedule(null),
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                        >
                                            Reject Receipt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                            <button
                                onClick={() => {
                                    const sch = viewingSchedule;
                                    setViewingSchedule(null);
                                    openProcessModal(sch);
                                }}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                            >
                                Process this Request
                            </button>
                            <button
                                onClick={() => setViewingSchedule(null)}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Processing Hub (Checklist, Status, Staff Message, Clergy Assignment) */}
            {processingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setProcessingSchedule(null)}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    Process Request: {processingSchedule.title}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Update request status, verify canonical certificate checklist, and send reminders.
                                </p>
                            </div>
                            <button onClick={() => setProcessingSchedule(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            {/* Action Status Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Request Lifecycle Status
                                </label>
                                <select
                                    value={processForm.status}
                                    onChange={(e) => setProcessForm({ ...processForm, status: e.target.value as ScheduleStatus })}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="on_hold">On Hold (Pending Requirements / Incomplete)</option>
                                    <option value="processing">Processing (Under Verification)</option>
                                    <option value="scheduled">Scheduled (Agreed Schedule Set)</option>
                                    <option value="confirmed">Confirmed (Approved & Finalized)</option>
                                </select>
                            </div>

                            {/* Baptism Ceremony Type & Offering / Stipend */}
                            {processingSchedule.sacrament_type === 'baptism' && (
                                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
                                    <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                                        <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                                            <Church className="w-4 h-4 text-amber-600" />
                                            Baptism Classification &amp; Offering (Stipend)
                                        </h4>
                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                            Parish Schedule Rate
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                                                Baptism Ceremony Type <span className="text-amber-600">*</span>
                                            </label>
                                            <select
                                                value={processForm.baptism_type}
                                                onChange={(e) => handleBaptismTypeChange(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                                            >
                                                <option value="regular">Regular Baptism</option>
                                                <option value="solo">Solo / Special Baptism</option>
                                            </select>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Choose whether the sacrament is community regular or solo / private.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                                                Sacrament Amount / Donation (PHP) <span className="text-amber-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                                    ₱
                                                </span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={processForm.amount}
                                                    onChange={(e) => setProcessForm({ ...processForm, amount: e.target.value })}
                                                    placeholder="e.g. 800 or 1500"
                                                    className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-7 pr-2.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-amber-900 mt-1">
                                                <span>Mon–Fri Special: ₱1,500 | Sat–Sun: ₱800</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const rec = getRecommendedBaptismFee(processForm.starts_at, processForm.baptism_type);
                                                        setProcessForm(prev => ({ ...prev, amount: rec }));
                                                    }}
                                                    className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
                                                >
                                                    Auto-fill
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Physical Certificate Checklist */}
                            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-2.5">
                                <div className="border-b border-amber-200/70 pb-2">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4 text-amber-600" />
                                        Physical Documents Still Needed (Notify Parishioner)
                                    </h4>
                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                        Check each certificate the parishioner still needs to submit to the parish office. These checked items will form the notification modal on the parishioner portal.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-1">
                                    {processingSchedule.sacrament_type === 'confirmation' ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.baptism_subject || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                baptism_subject: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Candidate's Catholic Baptismal Certificate (Can. 889 §1 Prerequisite)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.confirmation_witnesses || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                confirmation_witnesses: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Confirmation / Marriage Certificate of Sponsor (Godparent / Witness)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.psa_birth_cert || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                psa_birth_cert: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Candidate's PSA Birth Certificate</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.baptismal_permit || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                baptismal_permit: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Confirmation Permit / Endorsement (if residing outside parish territory)</span>
                                            </label>
                                        </>
                                    ) : (processingSchedule.sacrament_type === 'matrimony' || processingSchedule.sacrament_type === 'wedding') ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_baptismal_cert || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_baptismal_cert: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Original Baptismal Certificate (For Marriage Purposes - Groom &amp; Bride)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_confirmation_cert || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_confirmation_cert: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Original Confirmation Certificate (For Marriage Purposes - Groom &amp; Bride)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_psa_birth || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_psa_birth: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>PSA Birth Certificate (Photocopy - Groom &amp; Bride)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_cenomar || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_cenomar: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>PSA CENOMAR (Certificate of No Marriage Record)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_interview_form || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_interview_form: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Canonical Interview Form (Pre-nuptial Investigation)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_banns || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_banns: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Marriage Banns (To be created &amp; published by parish office)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_permit || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_permit: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Marriage Permit (Parish endorsement if residing outside vicinity)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_license || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_license: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Marriage License (from City / Municipal Civil Registrar)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_singleness || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_singleness: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Certificate of Freedom to Marry / Singleness (for OFW / Foreigner)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_precana || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_precana: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>Pre-Cana Certificate (from parish where couple attended seminar)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_couple_pic || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_couple_pic: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span>4R Couple Picture (2 copies - Colored photo together)</span>
                                            </label>
                                        </>
                                    ) : processingSchedule.sacrament_type === 'funeral' ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.death_certificate || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                death_certificate: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Death Certificate (PSA or Local Civil Registrar photocopy verified)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.informant_valid_id || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                informant_valid_id: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Valid ID of Registrant / Family Representative verified</span>
                                            </label>
                                        </>
                                    ) : processingSchedule.sacrament_type === 'sponsored_mass' ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.sponsored_mass_intention || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 sponsored_mass_intention: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-rose-600 focus:ring-rose-500"
                                                />
                                                <span>Mass Intention Details &amp; Representative Information Verified</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.sponsored_mass_clergy || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 sponsored_mass_clergy: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-rose-600 focus:ring-rose-500"
                                                />
                                                <span>Officiating Clergy Availability Confirmed</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.sponsored_mass_stipend || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 sponsored_mass_stipend: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-rose-600 focus:ring-rose-500"
                                                />
                                                <span>Sponsored Mass Stipend Received (Base ₱2,000 + Add-ons)</span>
                                            </label>
                                        </>
                                    ) : (processingSchedule.sacrament_type === 'bone_transfer' || processingSchedule.sacrament_type === 'transfer_of_bones') ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.exhumation_permit || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 exhumation_permit: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-zinc-600 focus:ring-zinc-500"
                                                />
                                                <span>Exhumation Permit (from City/Municipal Health Office verified)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.transfer_permit || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 transfer_permit: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-zinc-600 focus:ring-zinc-500"
                                                />
                                                <span>Transfer / Transit Permit for Bones or Ashes verified</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.death_certificate || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 death_certificate: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-zinc-600 focus:ring-zinc-500"
                                                />
                                                <span>Death Certificate (PSA or Local Civil Registrar photocopy verified)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.bone_transfer_clergy || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 bone_transfer_clergy: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-zinc-600 focus:ring-zinc-500"
                                                />
                                                <span>Presiding Clergy Availability Confirmed</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.bone_transfer_stipend || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 bone_transfer_stipend: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-zinc-600 focus:ring-zinc-500"
                                                />
                                                <span>Blessing Offering / Donation Received (₱100 + clergy donation)</span>
                                            </label>
                                        </>
                                    ) : processingSchedule.sacrament_type === 'blessing' ? (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.blessing_location_verified || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 blessing_location_verified: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span>Blessing Venue &amp; Exact Location Details Verified</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.blessing_clergy_confirmed || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 blessing_clergy_confirmed: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span>Presiding Clergy Schedule Confirmed</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.blessing_stipend || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                             ...processForm,
                                                             document_checklist: {
                                                                 ...processForm.document_checklist,
                                                                 blessing_stipend: e.target.checked,
                                                             },
                                                        })
                                                    }
                                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span>Blessing Offering / Donation Received (₱100 + clergy donation)</span>
                                            </label>
                                        </>
                                    ) : (
                                        <>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.confirmation_witnesses || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                confirmation_witnesses: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Confirmation Certificate of Witnesses / Godparents</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.marriage_parents || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                marriage_parents: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Marriage Certificate of Parents (if married)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.baptism_parents || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                baptism_parents: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Catholic Baptismal Certificate of Parents (if not married)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.baptismal_permit || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                baptismal_permit: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Baptismal Permit / Endorsement (for requests outside parish territory)</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 hover:text-slate-950">
                                                <input
                                                    type="checkbox"
                                                    checked={processForm.document_checklist.psa_birth_cert || false}
                                                    onChange={(e) =>
                                                        setProcessForm({
                                                            ...processForm,
                                                            document_checklist: {
                                                                ...processForm.document_checklist,
                                                                psa_birth_cert: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Child's PSA Birth Certificate</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Additional Reminders / Message for Parishioner */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                    Reminders / Message for Parishioner (Included in Notice Modal)
                                </label>
                                <textarea
                                    value={processForm.staff_notes}
                                    onChange={(e) => setProcessForm({ ...processForm, staff_notes: e.target.value })}
                                    placeholder="Type specific instructions or missing requirements (e.g. 'Please bring original confirmation certificate of Ninong to the office before Friday 4:00 PM.')"
                                    rows={3}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            {/* Agreed Schedule & Officiating Clergy */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                <h4 className="font-bold text-slate-800 text-xs border-b pb-1">
                                    Agreed Liturgical Schedule & Presiding Clergy
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Start Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={processForm.starts_at}
                                            onChange={(e) => {
                                                const newStart = e.target.value;
                                                let newEnd = processForm.ends_at;
                                                if (newStart && (!newEnd || newEnd <= newStart)) {
                                                    newEnd = addHoursToDateTimeLocal(newStart, 1);
                                                }
                                                let newAmount = processForm.amount;
                                                let newType = processForm.baptism_type;
                                                if (processingSchedule?.sacrament_type === 'baptism' && newStart) {
                                                    const datePart = newStart.slice(0, 10);
                                                    const [y, m, d] = datePart.split('-').map(Number);
                                                    if (y && m && d) {
                                                        const day = new Date(y, m - 1, d).getDay();
                                                        const isWeekend = day === 0 || day === 6;
                                                        if (!isWeekend && newType === 'regular') {
                                                            newType = 'solo';
                                                        }
                                                        newAmount = getRecommendedBaptismFee(newStart, newType);
                                                    }
                                                }
                                                setProcessForm({
                                                    ...processForm,
                                                    starts_at: newStart,
                                                    ends_at: newEnd,
                                                    baptism_type: newType,
                                                    amount: newAmount,
                                                });
                                            }}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            End Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={processForm.ends_at}
                                            onChange={(e) => setProcessForm({ ...processForm, ends_at: e.target.value })}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Assign Officiating Priest / Minister
                                    </label>
                                    <select
                                        value={processForm.presiding_clergy_id}
                                        onChange={(e) => setProcessForm({ ...processForm, presiding_clergy_id: e.target.value })}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                    >
                                        <option value="">-- Assign Later --</option>
                                        <option value="guest">Guest / Manual Entry</option>
                                        {clergy.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.titled_name} {c.id === processingSchedule.requested_clergy_id ? '★ (Requested by Parishioner)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {processingSchedule.requested_clergy && (
                                        <p className="text-[10px] text-amber-800 mt-1">
                                            Parishioner requested: <strong>{processingSchedule.requested_clergy.titled_name}</strong>
                                        </p>
                                    )}
                                    {processingSchedule.specific_data?.requested_guest_priest_name && (
                                        <p className="text-[10px] text-purple-900 mt-1 bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                                            Parishioner requested (Visiting Priest): <strong>{processingSchedule.specific_data.requested_guest_priest_name}</strong>
                                        </p>
                                    )}
                                </div>

                                {processForm.presiding_clergy_id === 'guest' && (
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                                Guest Priest Name
                                            </label>
                                            <input
                                                type="text"
                                                value={processForm.guest_priest_name}
                                                onChange={(e) => setProcessForm({ ...processForm, guest_priest_name: e.target.value })}
                                                placeholder="e.g. Rev. Fr. Juan Santos, SDB"
                                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-950 bg-amber-50/90 p-2 rounded-lg border border-amber-200">
                                            <input
                                                type="checkbox"
                                                checked={processForm.add_to_clergy_directory ?? true}
                                                onChange={(e) => setProcessForm({ ...processForm, add_to_clergy_directory: e.target.checked })}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>
                                                <strong>Add to Clergy Directory</strong> upon confirming (will be saved for future selection).
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setProcessingSchedule(null)}
                                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleProcessSubmit}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
                            >
                                Save Changes & Update Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Mark Completed & Handwritten Book Prompt */}
            {completingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setCompletingSchedule(null)}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2.5 text-emerald-700 border-b pb-3">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <BookOpen className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                    Handwrite In Book & Transcribe Record
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Canon 535 §1: Required physical inscription in parish register
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                            <strong>Mandatory Canonical Requirement:</strong> The parish staff must first handwrite this sacramental entry into the parish canonical register book. Enter the physical citation details below to complete the transcription.
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Book Volume *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={completionForm.book_number}
                                    onChange={(e) => setCompletionForm({ ...completionForm, book_number: e.target.value })}
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Page Number *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={completionForm.page_number}
                                    onChange={(e) => setCompletionForm({ ...completionForm, page_number: e.target.value })}
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Entry Number *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={completionForm.entry_number}
                                    onChange={(e) => setCompletionForm({ ...completionForm, entry_number: e.target.value })}
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 text-center"
                                />
                            </div>
                        </div>

                        {/* Automatically transcribed preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                Automatically Transcribed Details
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                                <div><strong>Name:</strong> {completingSchedule.specific_data?.child_name || completingSchedule.requester_name}</div>
                                <div><strong>Sacrament:</strong> <span className="capitalize">{completingSchedule.sacrament_type}</span></div>
                                <div><strong>Date of Event:</strong> {new Date(completingSchedule.starts_at).toLocaleDateString()}</div>
                                <div><strong>Date of Birth:</strong> {completingSchedule.specific_data?.dob || 'N/A'}</div>
                                <div><strong>Father:</strong> {completingSchedule.specific_data?.father_name || 'N/A'}</div>
                                <div><strong>Mother:</strong> {completingSchedule.specific_data?.mother_name || 'N/A'}</div>
                                <div className="col-span-2">
                                    <strong>Godparents:</strong>{' '}
                                    {typeof completingSchedule.specific_data?.godparents === 'string'
                                        ? completingSchedule.specific_data?.godparents
                                        : 'Recorded from schedule'}
                                </div>
                                <div className="col-span-2">
                                    <strong>Minister:</strong>{' '}
                                    {completingSchedule.presiding_clergy?.titled_name || completingSchedule.specific_data?.guest_priest_name || 'Assigned Clergy'}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setCompletingSchedule(null)}
                                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleCompleteSubmit}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
                            >
                                Transcribe & Mark Completed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 4: Cancel appointment */}
            {cancellingId && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => {
                        setCancellingId(null);
                        setCancelReason('');
                    }}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-rose-600">
                            <XCircle className="w-5 h-5" />
                            <h3 className="font-semibold text-sm text-slate-900">Cancel Sacrament Appointment</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Cancellation Reason
                            </label>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Requester request, rescheduled..."
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-colors"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setCancellingId(null);
                                    setCancelReason('');
                                }}
                                className="btn-cancel text-xs py-1.5 px-3"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSubmit}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Document Preview Modal */}
            {previewAttachment && (
                <div
                    className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
                    onClick={() => setPreviewAttachment(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl space-y-3 max-h-[92vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-600" />
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 truncate">
                                        {getDocTypeLabel(previewAttachment.document_type)}
                                    </h3>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {previewAttachment.file_path.split('/').pop()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewAttachment.view_url || `/schedule-attachments/${previewAttachment.id}/view`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition"
                                >
                                    <span>Open Tab</span>
                                    <span className="font-bold">↗</span>
                                </a>
                                <a
                                    href={previewAttachment.download_url || `/schedule-attachments/${previewAttachment.id}/download`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-900/5 rounded-xl p-2 flex items-center justify-center min-h-[420px]">
                            {previewAttachment.file_path.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={previewAttachment.view_url || `/schedule-attachments/${previewAttachment.id}/view`}
                                    className="w-full h-[68vh] rounded-lg border border-slate-200 bg-white"
                                    title="Document Preview"
                                />
                            ) : (
                                <img
                                    src={previewAttachment.view_url || `/schedule-attachments/${previewAttachment.id}/view`}
                                    alt="Document Preview"
                                    className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-sm"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
