import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import FormActions from '@/Components/FormActions';
import { Clergy, PageProps, Parish, ScheduleType, Venue } from '@/types';
import { Calendar, Clock, MapPin, User, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props extends PageProps {
    parishes: Parish[];
    venues: Venue[];
    clergy: Clergy[];
}

export default function Create({ auth, parishes, venues, clergy }: Props) {
    const defaultParishId = auth.user?.home_parish_id || (parishes.length > 0 ? parishes[0].id : '');

    const { data, setData, post, processing, errors } = useForm({
        parish_id: defaultParishId,
        venue_id: '',
        presiding_clergy_id: '',
        sacrament_type: 'baptism' as ScheduleType,
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        requester_name: '',
        requester_contact: '',
        expected_attendees: '',
    });

    const [conflict, setConflict] = useState<{ has_conflict: boolean; message?: string } | null>(null);
    const [isCheckingConflict, setIsCheckingConflict] = useState(false);

    // Real-time conflict inspection trigger
    useEffect(() => {
        if (!data.starts_at || !data.ends_at || !data.parish_id) {
            setConflict(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingConflict(true);
            try {
                const params = new URLSearchParams({
                    parish_id: String(data.parish_id),
                    starts_at: data.starts_at,
                    ends_at: data.ends_at,
                    ...(data.venue_id ? { venue_id: String(data.venue_id) } : {}),
                    ...(data.presiding_clergy_id ? { clergy_id: String(data.presiding_clergy_id) } : {}),
                });

                const res = await fetch(`/schedules/check-conflict?${params.toString()}`);
                if (res.ok) {
                    const result = await res.json();
                    setConflict(result);
                }
            } catch (err) {
                console.error('Error checking scheduling conflicts:', err);
            } finally {
                setIsCheckingConflict(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [data.starts_at, data.ends_at, data.parish_id, data.venue_id, data.presiding_clergy_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/schedules');
    };

    return (
        <PortalLayout
            title="Book Sacrament Appointment"
            subtitle="Register sacramental ceremonies with automated venue and clergy conflict detection"
            activeTab="schedules"
        >
            <Head title="Book Sacrament - RCAL PIMS" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Non-negotiable invariant reminder banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-xs shadow-xs">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <strong className="text-amber-800 font-bold">Strict Archdiocesan Invariant:</strong> Mass Intentions are forbidden and excluded from this appointment register. Only sacramental rites and official pastoral appointments may be recorded.
                    </div>
                </div>

                {/* Real-time Conflict Alert Box */}
                {conflict?.has_conflict && (
                    <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-xs shadow-sm animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-sm block mb-1 text-rose-900">Liturgical Schedule Conflict Detected!</span>
                            <p>{conflict.message}</p>
                            <span className="text-[11px] text-rose-700 block mt-1 font-medium">
                                Adjust the time window, select an alternate parish venue, or reassign the officiating clergy to resolve the conflict.
                            </span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                            <Calendar className="w-5 h-5 text-amber-600" />
                            Sacrament & Ceremony Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Parish Jurisdiction <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.parish_id}
                                    disabled={!auth.user?.is_archdiocese_wide}
                                    onChange={(e) => setData('parish_id', parseInt(e.target.value))}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-60 shadow-2xs transition-colors"
                                >
                                    {parishes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.parish_id && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.parish_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Sacrament / Ceremony Type <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.sacrament_type}
                                    onChange={(e) => setData('sacrament_type', e.target.value as ScheduleType)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="baptism">Baptism (Baptismus)</option>
                                    <option value="confirmation">Confirmation (Confirmatio)</option>
                                    <option value="wedding">Matrimony / Wedding (Matrimonium)</option>
                                    <option value="funeral">Funeral Rite / Mass of the Dead</option>
                                    <option value="blessing">Solemn Blessing</option>
                                    <option value="anointing">Anointing of the Sick</option>
                                    <option value="reconciliation">Sacrament of Reconciliation</option>
                                    <option value="meeting">Pastoral Council Meeting</option>
                                    <option value="office_activity">Chancery / Office Activity</option>
                                    <option value="other">Other Pastoral Rites</option>
                                </select>
                                {errors.sacrament_type && (
                                    <p className="text-rose-600 text-xs mt-1 font-medium">{errors.sacrament_type}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Appointment Title / Ceremony Heading <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="e.g. Holy Matrimony: Dela Cruz - Santos Nuptials"
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                            />
                            {errors.title && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.title}</p>}
                        </div>

                        {/* Date & Time Window */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Starts At <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    min={new Date().toISOString().slice(0, 16)}
                                    value={data.starts_at}
                                    onChange={(e) => setData('starts_at', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                <span className="text-[10px] text-slate-500 mt-0.5 block">Appointments must be scheduled for today or future dates.</span>
                                {errors.starts_at && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.starts_at}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ends At <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    min={data.starts_at || new Date().toISOString().slice(0, 16)}
                                    value={data.ends_at}
                                    onChange={(e) => setData('ends_at', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.ends_at && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.ends_at}</p>}
                            </div>
                        </div>

                        {/* Venue & Clergy Assignment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Parish Venue / Chapel
                                </label>
                                <select
                                    value={data.venue_id}
                                    onChange={(e) => setData('venue_id', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="">-- Main Parish Church --</option>
                                    {venues.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name} {v.capacity ? `(Cap: ${v.capacity})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Presiding Clergy (Minister)
                                </label>
                                <select
                                    value={data.presiding_clergy_id}
                                    onChange={(e) => setData('presiding_clergy_id', e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                >
                                    <option value="">-- To Be Assigned --</option>
                                    {clergy.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} {c.first_name} {c.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Requester Contact info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Requester / Family Contact Name
                                </label>
                                <input
                                    type="text"
                                    value={data.requester_name}
                                    onChange={(e) => setData('requester_name', e.target.value)}
                                    placeholder="e.g. Maria Santos"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                {errors.requester_name && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.requester_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone (7 Digits)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{7}"
                                    maxLength={7}
                                    value={data.requester_contact}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 7);
                                        setData('requester_contact', clean);
                                    }}
                                    placeholder="e.g. 7562572"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                                <span className="text-[10px] text-slate-500 mt-0.5 block">Must be exactly 7 numeric digits.</span>
                                {errors.requester_contact && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.requester_contact}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Attendees</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.expected_attendees}
                                    onChange={(e) => setData('expected_attendees', e.target.value)}
                                    placeholder="Estimated guest count"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Liturgical Notes / Pastoral Remarks
                            </label>
                            <textarea
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Any special choir, flower decorations, or ritual requirements..."
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-colors"
                            />
                        </div>
                    </div>

                    <FormActions
                        submitLabel="Confirm & Book Sacrament Appointment"
                        cancelHref="/schedules"
                        processing={processing || isCheckingConflict}
                    />
                </form>
            </div>
        </PortalLayout>
    );
}
