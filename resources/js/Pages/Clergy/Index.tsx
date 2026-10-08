import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { Clergy, PageProps, Parish } from '@/types';
import { Users, Plus, Search, Church, Calendar, X, ShieldCheck } from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props extends PageProps {
    clergy: PaginatedData<Clergy>;
    parishes: Parish[];
    filters: {
        search: string;
        title: string;
    };
}

export default function Index({ auth, clergy, parishes, filters }: Props) {
    const [addModalOpen, setAddModalOpen] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        title: 'father',
        ordination_date: '',
        date_of_birth: '',
        status: 'Active Ministry',
        parish_id: '',
        assignment_role: 'parish_priest',
    });

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            router.get('/clergy', {
                ...filters,
                search: (e.target as HTMLInputElement).value,
            }, { preserveState: true, preserveScroll: true, replace: true });
        }
    };

    const handleTitleFilter = (title: string) => {
        router.get('/clergy', {
            ...filters,
            title,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/clergy', {
            onSuccess: () => {
                setAddModalOpen(false);
                reset();
            },
        });
    };

    return (
        <PortalLayout
            title="Archdiocesan Clergy Directory"
            subtitle="Register of the ordained presbyterate, ecclesiastical titles, and canonical parish assignments"
            activeTab="clergy"
        >
            <Head title="Clergy Directory - RCAL PIMS" />

            <div className="space-y-6">
                {/* Top Control Bar (Crisp White) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                defaultValue={filters.search}
                                onKeyDown={handleSearch}
                                placeholder="Search clergy by name..."
                                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs w-64 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                            />
                        </div>

                        <select
                            value={filters.title}
                            onChange={(e) => handleTitleFilter(e.target.value)}
                            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                        >
                            <option value="all">All Ecclesiastical Titles</option>
                            <option value="archbishop">Archbishops (Most Rev.)</option>
                            <option value="bishop">Bishops (Most Rev.)</option>
                            <option value="monsignor">Monsignors (Msgr.)</option>
                            <option value="father">Priests (Rev. Fr.)</option>
                            <option value="deacon">Deacons (Rev. Mr.)</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAddModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <Plus className="w-4 h-4" />
                        Inscribe Clergy Member
                    </button>
                </div>

                {/* Clergy Listing Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
                            <Church className="w-4 h-4 text-amber-600" />
                            Presbyterate of the Archdiocese of Lipa
                        </div>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                            Total: {clergy.total} Ordained Ministers
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Title & Name</th>
                                    <th className="py-3 px-4">Canonical Dignity</th>
                                    <th className="py-3 px-4">Current Parish Assignment</th>
                                    <th className="py-3 px-4">Ordination Date</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clergy.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-slate-400">
                                            No clergy members found matching the specified filter.
                                        </td>
                                    </tr>
                                ) : (
                                    clergy.data.map((c) => {
                                        const currentAssignment = c.assignments?.find((a: any) => a.is_current);
                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-serif font-bold text-slate-900 text-sm">
                                                        {c.title ? (c.title === 'archbishop' || c.title === 'bishop' ? 'Most Rev.' : c.title === 'monsignor' ? 'Msgr.' : c.title === 'deacon' ? 'Rev. Mr.' : 'Rev. Fr.') : 'Rev. Fr.'}{' '}
                                                        {c.first_name} {c.middle_name ? `${c.middle_name} ` : ''}{c.last_name} {c.suffix || ''}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-sans">
                                                        Clergy Identifier: #CLG-{c.id}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 capitalize font-medium text-slate-700">
                                                    {c.title || 'Priest'}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-800">
                                                    {currentAssignment?.parish?.name ? (
                                                        <div>
                                                            <strong className="block text-slate-900">{currentAssignment.parish.name}</strong>
                                                            <span className="text-[11px] text-slate-500">{currentAssignment.role}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Archdiocesan Curia / Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 font-mono">
                                                    {c.ordination_date ? c.ordination_date.slice(0, 10) : 'Not recorded'}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {c.status || 'Active Ministry'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Inscribe New Clergy */}
            {addModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setAddModalOpen(false)}
                >
                    <div
                        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <Church className="w-5 h-5 text-amber-600" />
                                    Inscribe New Clergy Member
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Register ordained presbyter / deacon into the official Archdiocesan directory
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAddModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Ecclesiastical Title <span className="text-rose-600">*</span>
                                    </label>
                                    <select
                                        required
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    >
                                        <option value="father">Rev. Fr. (Priest)</option>
                                        <option value="monsignor">Msgr. (Monsignor)</option>
                                        <option value="bishop">Most Rev. (Bishop)</option>
                                        <option value="archbishop">Most Rev. (Archbishop)</option>
                                        <option value="deacon">Rev. Mr. (Deacon)</option>
                                    </select>
                                    {errors.title && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.title}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        First Name <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        placeholder="e.g. Juan"
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                    {errors.first_name && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.first_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Middle Name</label>
                                    <input
                                        type="text"
                                        value={data.middle_name}
                                        onChange={(e) => setData('middle_name', e.target.value)}
                                        placeholder="e.g. Alcantara"
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Last Name <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        placeholder="e.g. Reyes"
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                    {errors.last_name && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.last_name}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Suffix (Optional)</label>
                                    <select
                                        value={data.suffix}
                                        onChange={(e) => setData('suffix', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Date of Ordination</label>
                                    <input
                                        type="date"
                                        max={today}
                                        value={data.ordination_date}
                                        onChange={(e) => setData('ordination_date', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        max={today}
                                        value={data.date_of_birth}
                                        onChange={(e) => setData('date_of_birth', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Initial Parish Assignment</label>
                                    <select
                                        value={data.parish_id}
                                        onChange={(e) => setData('parish_id', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    >
                                        <option value="">-- Archdiocesan Curia / Unassigned --</option>
                                        {parishes.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.city_municipality ? `(${p.city_municipality})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Assignment Role</label>
                                    <select
                                        value={data.assignment_role}
                                        onChange={(e) => setData('assignment_role', e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                                    >
                                        <option value="parish_priest">Parish Priest</option>
                                        <option value="parochial_vicar">Parochial Vicar / Assistant Priest</option>
                                        <option value="parish_administrator">Parish Administrator</option>
                                        <option value="guest_priest">Guest Priest / Sacramental Minister</option>
                                        <option value="assistant_priest">Assistant Priest</option>
                                        <option value="chaplain">Chaplain</option>
                                        <option value="deacon">Deacon</option>
                                        <option value="retired">Retired</option>
                                    </select>
                                    {errors.assignment_role && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.assignment_role}</p>}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-xs disabled:opacity-60"
                                >
                                    {processing ? 'Inscribing...' : 'Inscribe Clergy Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
