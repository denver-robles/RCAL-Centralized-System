import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { PageProps, User } from '@/types';
import { Users as UsersIcon, Trash2, Search, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props extends PageProps {
    users: PaginatedData<User>;
    filters: {
        search: string;
        role: string;
    };
    currentUserId: number;
}

export default function Index({ auth, users, filters, currentUserId }: Props) {
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            router.get('/users', {
                ...filters,
                search: (e.target as HTMLInputElement).value,
            }, { preserveState: true, preserveScroll: true, replace: true });
        }
    };

    const handleRoleFilter = (role: string) => {
        router.get('/users', {
            ...filters,
            role,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const confirmDelete = () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        router.delete(`/users/${userToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setUserToDelete(null);
            },
        });
    };

    return (
        <PortalLayout
            title="Account Directory Management"
            subtitle="Curia user accounts, diocesan access roles, and account lifecycle management"
            activeTab="users"
        >
            <Head title="Account Directory - RCAL PIMS" />

            <div className="space-y-6">
                {/* Search & Filter Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                defaultValue={filters.search}
                                onKeyDown={handleSearch}
                                placeholder="Search by username, name, or email..."
                                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs w-72 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                            />
                        </div>

                        <select
                            value={filters.role}
                            onChange={(e) => handleRoleFilter(e.target.value)}
                            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                        >
                            <option value="all">All Access Roles</option>
                            <option value="curia_admin">Curia Administrator</option>
                            <option value="chancery_staff">Chancery Staff</option>
                            <option value="parish_priest">Parish Priest</option>
                            <option value="parish_staff">Parish Staff</option>
                            <option value="parishioner">Parishioner</option>
                        </select>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                        Active Accounts: <span className="font-bold text-slate-800">{users.total}</span>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
                            <UsersIcon className="w-4 h-4 text-amber-600" />
                            Registered System Accounts
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="py-3 px-4">User / Display Name</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Email & Phone</th>
                                    <th className="py-3 px-4">Assigned Parish</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-400">
                                            No accounts found matching current search.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((u) => {
                                        const isSelf = u.id === currentUserId;
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-slate-900">
                                                        {u.display_name || u.username}
                                                    </div>
                                                    <span className="font-mono text-[11px] text-slate-500 block">
                                                        @{u.username}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        u.role === 'curia_admin'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                            : u.role === 'parish_priest' || u.role === 'chancery_staff'
                                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                            : u.role === 'parish_staff'
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        {u.role_label || u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-700">
                                                    <div>{u.email}</div>
                                                    {u.phone && <div className="text-[11px] text-slate-500 font-mono">{u.phone}</div>}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-700">
                                                    {u.home_parish?.name || (u.is_archdiocese_wide ? 'Archdiocese Curia' : 'None Assigned')}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        u.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {u.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    {isSelf ? (
                                                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold border border-slate-200">
                                                            Your Account
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUserToDelete(u)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors shadow-2xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete Account
                                                        </button>
                                                    )}
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

            {/* Modal: Delete Account Confirmation */}
            {userToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setUserToDelete(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="font-serif font-bold text-base text-rose-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                                Confirm Account Deletion
                            </h3>
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Are you sure you want to delete the account for <strong className="text-slate-900">{userToDelete.display_name || userToDelete.username}</strong> (<span className="font-mono text-slate-700">@{userToDelete.username}</span>)?
                        </p>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                            <strong className="block font-bold">Canonical & Audit Integrity Notice:</strong>
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                                In accordance with Code of Canon Law Can. 535 and RA 10173, account deletion uses archival soft-deletion. All canonical inscriptions, marginal annotations, and audit log entries previously authored by this user remain preserved and tamper-evident.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition text-xs font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-60"
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Soft Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
