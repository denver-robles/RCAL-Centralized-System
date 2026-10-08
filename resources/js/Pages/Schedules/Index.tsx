import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Clergy, PageProps, SacramentSchedule, ScheduleStatus, Venue } from '@/types';
import { Calendar, Plus, Clock, MapPin, User, CheckCircle2, XCircle, ArrowRight, ShieldAlert } from 'lucide-react';

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
    const [approvingSchedule, setApprovingSchedule] = useState<SacramentSchedule | null>(null);
    const [approveForm, setApproveForm] = useState({
        starts_at: '',
        ends_at: '',
        presiding_clergy_id: '',
        guest_priest_name: ''
    });

    const openApproveModal = (schedule: SacramentSchedule) => {
        setApprovingSchedule(schedule);
        setApproveForm({
            starts_at: schedule.starts_at.slice(0, 16),
            ends_at: schedule.ends_at.slice(0, 16),
            presiding_clergy_id: schedule.presiding_clergy_id ? schedule.presiding_clergy_id.toString() : '',
            guest_priest_name: schedule.specific_data?.guest_priest_name || ''
        });
    };

    const handleApproveSubmit = () => {
        if (!approvingSchedule) return;
        router.post(`/schedules/${approvingSchedule.id}/status`, {
            status: 'confirmed',
            starts_at: approveForm.starts_at,
            ends_at: approveForm.ends_at,
            presiding_clergy_id: approveForm.presiding_clergy_id === 'guest' ? null : approveForm.presiding_clergy_id || null,
            guest_priest_name: approveForm.presiding_clergy_id === 'guest' ? approveForm.guest_priest_name : ''
        });
        setApprovingSchedule(null);
    };

    const handleFilter = (updates: Partial<typeof filters>) => {
        router.get('/schedules', { ...filters, ...updates }, { preserveState: true, replace: true });
    };

    const handleStatusUpdate = (scheduleId: number, status: ScheduleStatus, reason?: string) => {
        router.post(`/schedules/${scheduleId}/status`, {
            status,
            cancellation_reason: reason || '',
        });
        setCancellingId(null);
        setCancelReason('');
    };

    return (
        <PortalLayout
            title="Sacrament Schedules & Appointments"
            subtitle="Parish liturgical calendar, ceremony appointments, and minister schedules"
            activeTab="schedules"
        >
            <Head title="Sacrament Schedules - RCAL PIMS" />

            {/* Non-negotiable invariant indicator banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 mb-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                        <strong className="font-bold text-amber-800">RCAL Canonical Rule:</strong> This scheduling engine manages sacramental ceremonies (Baptism, Confirmation, Matrimony, Funerals, Blessings). Mass Intentions are strictly excluded.
                    </span>
                </div>
                <Link
                    href="/schedules/create"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-2xs"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Sacrament Appointment
                </Link>
            </div>

            {/* Filter Bar (Crisp White) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filters.status || 'all'}
                        onChange={(e) => handleFilter({ status: e.target.value })}
                        className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                    >
                        <option value="all">All Statuses</option>
                        <option value="requested">Requested (Pending Approval)</option>
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
                        <option value="funeral">Funeral / Mass of the Dead</option>
                        <option value="blessing">Blessing</option>
                        <option value="anointing">Anointing of the Sick</option>
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

            {/* Schedules Table (Crisp White) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                            <tr>
                                <th className="py-3 px-4">Date & Time</th>
                                <th className="py-3 px-4">Sacrament / Ceremony</th>
                                <th className="py-3 px-4">Venue</th>
                                <th className="py-3 px-4">Officiating Clergy</th>
                                <th className="py-3 px-4">Requester / Family</th>
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
                                    const starts = new Date(schedule.starts_at);
                                    const ends = new Date(schedule.ends_at);
                                    const isCompletedWithoutRecord =
                                        schedule.status === 'completed' && !schedule.record_id;

                                    return (
                                        <tr key={schedule.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">
                                                    {starts.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </div>
                                                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                    {starts.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}{' '}
                                                    –{' '}
                                                    {ends.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 capitalize flex items-center gap-2">
                                                    {schedule.title}
                                                </div>
                                                <div className="flex flex-col gap-1 mt-1 text-[10px]">
                                                    <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded capitalize font-medium w-fit">
                                                        {schedule.sacrament_type}
                                                    </span>
                                                    {schedule.specific_data && (
                                                        <div className="text-slate-500 max-w-[200px] truncate" title={JSON.stringify(schedule.specific_data, null, 2)}>
                                                            {Object.entries(schedule.specific_data).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' | ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-slate-700">
                                                <div className="flex items-center gap-1 text-[11px]">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    {schedule.venue?.name || 'Parish Main Altar'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-slate-700">
                                                {schedule.presiding_clergy ? (
                                                    <div className="flex items-center gap-1 text-[11px]">
                                                        <User className="w-3 h-3 text-amber-600" />
                                                        {schedule.presiding_clergy.titled_name}
                                                    </div>
                                                ) : schedule.specific_data?.guest_priest_name ? (
                                                    <div className="flex items-center gap-1 text-[11px]">
                                                        <User className="w-3 h-3 text-blue-600" />
                                                        {schedule.specific_data.guest_priest_name} (Guest)
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-slate-700">
                                                <div className="font-semibold text-slate-900">
                                                    {schedule.requester_name || 'N/A'}
                                                </div>
                                                {schedule.requester_contact && (
                                                    <div className="text-[11px] text-slate-500">
                                                        {schedule.requester_contact}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                <StatusBadge status={schedule.status} />
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewingSchedule(schedule)}
                                                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-medium transition-colors shadow-2xs"
                                                    >
                                                        View
                                                    </button>

                                                    {isCompletedWithoutRecord && (
                                                        <Link
                                                            href={`/records/create?from_schedule_id=${schedule.id}`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shadow-2xs"
                                                        >
                                                            <span>Transcribe</span>
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    )}

                                                    {schedule.status === 'requested' && (
                                                        <button
                                                            onClick={() => openApproveModal(schedule)}
                                                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors shadow-2xs"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}

                                                    {schedule.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => openApproveModal(schedule)}
                                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors shadow-2xs"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}

                                                    {(schedule.status === 'scheduled' || schedule.status === 'confirmed') && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(schedule.id, 'completed')}
                                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors shadow-2xs"
                                                        >
                                                            Mark Completed
                                                        </button>
                                                    )}

                                                    {schedule.status !== 'cancelled' && schedule.status !== 'completed' && (
                                                        <button
                                                            onClick={() => setCancellingId(schedule.id)}
                                                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded text-[11px] transition-colors"
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

            {/* Cancel appointment modal */}
            {cancellingId && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => {
                        setCancellingId(null);
                        setCancelReason('');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setCancellingId(null);
                            setCancelReason('');
                        }
                    }}
                    tabIndex={-1}
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
                                onClick={() => handleStatusUpdate(cancellingId, 'cancelled', cancelReason)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve/Confirm appointment modal */}
            {approvingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setApprovingSchedule(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setApprovingSchedule(null);
                    }}
                    tabIndex={-1}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-amber-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="font-semibold text-sm text-slate-900">Approve / Confirm Appointment</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Scheduled Start Time
                            </label>
                            <input
                                type="datetime-local"
                                value={approveForm.starts_at}
                                onChange={(e) => setApproveForm({...approveForm, starts_at: e.target.value})}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Scheduled End Time
                            </label>
                            <input
                                type="datetime-local"
                                value={approveForm.ends_at}
                                onChange={(e) => setApproveForm({...approveForm, ends_at: e.target.value})}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Presiding Priest / Minister
                            </label>
                            <select
                                value={approveForm.presiding_clergy_id}
                                onChange={(e) => setApproveForm({...approveForm, presiding_clergy_id: e.target.value})}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            >
                                <option value="">-- Assign Later --</option>
                                <option value="guest">Guest / Manual Entry</option>
                                {clergy.map(c => (
                                    <option key={c.id} value={c.id}>{c.titled_name}</option>
                                ))}
                            </select>
                        </div>

                        {approveForm.presiding_clergy_id === 'guest' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Guest Priest Name
                                </label>
                                <input
                                    type="text"
                                    value={approveForm.guest_priest_name}
                                    onChange={(e) => setApproveForm({...approveForm, guest_priest_name: e.target.value})}
                                    placeholder="e.g. Fr. John Doe"
                                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setApprovingSchedule(null)}
                                className="btn-cancel text-xs py-1.5 px-3"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleApproveSubmit}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            >
                                Confirm Appointment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Full Details Modal */}
            {viewingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setViewingSchedule(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setViewingSchedule(null);
                    }}
                    tabIndex={-1}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-serif font-bold text-lg">Request Details: {viewingSchedule.title}</h3>
                            <button onClick={() => setViewingSchedule(null)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Requestor Info</h4>
                                <p><strong>Name:</strong> {viewingSchedule.requester_name}</p>
                                <p><strong>Contact:</strong> {viewingSchedule.requester_contact}</p>
                                <p><strong>Email:</strong> {viewingSchedule.requester_email || 'N/A'}</p>
                                <p><strong>Relationship:</strong> {viewingSchedule.requester_relationship || 'N/A'}</p>
                                <p><strong>Address:</strong> {viewingSchedule.requester_address || 'N/A'}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Schedule Info</h4>
                                <p className="capitalize"><strong>Sacrament:</strong> {viewingSchedule.sacrament_type}</p>
                                <p><strong>Status:</strong> <StatusBadge status={viewingSchedule.status} /></p>
                                <p><strong>Preferred Start:</strong> {new Date(viewingSchedule.starts_at).toLocaleString()}</p>
                                <p><strong>Alt Start:</strong> {viewingSchedule.alternative_starts_at ? new Date(viewingSchedule.alternative_starts_at).toLocaleString() : 'N/A'}</p>
                            </div>

                            <div className="col-span-2 space-y-2 mt-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Sacrament Specific Data</h4>
                                {viewingSchedule.specific_data ? (
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border text-xs">
                                        {Object.entries(viewingSchedule.specific_data).map(([key, value]) => (
                                            <div key={key}>
                                                <strong className="capitalize text-slate-600">{key.replace(/_/g, ' ')}:</strong> {value as string}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No specific data provided.</p>
                                )}
                            </div>
                            
                            <div className="col-span-2 space-y-2 mt-2">
                                <h4 className="font-bold text-slate-800 border-b pb-1">Payment Info</h4>
                                <p><strong>Method:</strong> {viewingSchedule.payment_method || 'N/A'}</p>
                                <p><strong>Status:</strong> <span className="uppercase font-bold">{viewingSchedule.payment_status}</span></p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t">
                            <button onClick={() => setViewingSchedule(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
