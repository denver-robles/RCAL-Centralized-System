import React from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { CuriaFooter } from '@/Components/CuriaFooter';
import {
    BookOpen,
    FileCheck,
    Calendar,
    Shield,
    BarChart3,
    LogOut,
    User as UserIcon,
    Users,
    UserCheck,
    Church,
    Clock,
    FileText,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

interface PortalLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    activeTab?: 'records' | 'certificates' | 'schedules' | 'clergy' | 'users' | 'audit' | 'analytics' | 'portal';
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, title, subtitle, activeTab }) => {
    const { auth, flash, curia } = usePage<PageProps>().props;
    const user = auth.user;

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/logout');
    };

    const isStaff = user?.is_staff ?? false;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
            {/* Top Elevated Nav */}
            <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 shadow-sm text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Brand & Jurisdiction Chips */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5">
                                    <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                                        <Church className="w-4 h-4 text-amber-400" />
                                    </div>
                                </div>
                                <span className="font-serif font-bold text-slate-100 tracking-tight hidden sm:inline">
                                    RCAL PIMS
                                </span>
                            </Link>

                            {/* Staff Jurisdiction Scope Chip */}
                            {isStaff ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-medium">
                                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                                    <span>
                                        {user?.is_archdiocese_wide
                                            ? 'Archdiocese Jurisdiction • Curia'
                                            : `Parish Scope: ${user?.home_parish_name || 'Assigned Parish'}`}
                                    </span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/40 text-sky-300 text-xs font-medium">
                                    <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                                    <span>Parishioner Self-Service Portal</span>
                                </div>
                            )}

                            {/* Curia Calendar Date Pill */}
                            {curia?.current_date && (
                                <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{curia.current_date}</span>
                                </div>
                            )}
                        </div>

                        {/* User Profile & Actions */}
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <span className="block text-xs font-bold text-slate-100">
                                    {user?.display_name || user?.username}
                                </span>
                                <span className="block text-[11px] text-amber-400 font-medium">
                                    {user?.role_label}
                                </span>
                            </div>

                            <form onSubmit={handleLogout}>
                                <button
                                    type="submit"
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Secondary Navigation Ribbon */}
                    <div className="flex items-center flex-nowrap space-x-1 sm:space-x-3 overflow-x-auto py-2 border-t border-slate-800/80 text-xs sm:text-sm font-medium scrollbar-hide [-webkit-overflow-scrolling:touch] [&>a]:shrink-0">
                        {isStaff ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'dashboard'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <Church className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>
                                <Link
                                    href="/records"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'records'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span>Canonical Registers</span>
                                </Link>

                                <Link
                                    href="/certificates"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'certificates'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <FileCheck className="w-4 h-4" />
                                    <span>Certificate Requests</span>
                                </Link>

                                <Link
                                    href="/schedules"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'schedules'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <Calendar className="w-4 h-4" />
                                    <span>Sacrament Schedules</span>
                                </Link>

                                <Link
                                    href="/clergy"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'clergy'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span>Clergy Directory</span>
                                </Link>

                                {user?.is_archdiocese_wide && (
                                    <>
                                        <Link
                                            href="/audit"
                                            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                                activeTab === 'audit'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                            }`}
                                        >
                                            <Shield className="w-4 h-4" />
                                            <span>Audit Trail (RA 10173)</span>
                                        </Link>

                                        <Link
                                            href="/analytics"
                                            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                                activeTab === 'analytics'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                            }`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            <span>Curia Analytics</span>
                                        </Link>

                                        <Link
                                            href="/users"
                                            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                                activeTab === 'users'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                            }`}
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            <span>Account Directory</span>
                                        </Link>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/portal/dashboard"
                                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'portal'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-850'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>My Claims & Orders</span>
                                </Link>

                                <Link
                                    href="/portal/requests/create"
                                    className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    <PlusCircle className="w-4 h-4 text-amber-400" />
                                    <span>Request Church Document</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Flash Feedback Alert Banner */}
            {flash?.success && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 text-emerald-800 text-sm flex items-center justify-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium">{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-rose-800 text-sm flex items-center justify-center gap-2 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span className="font-medium">{flash.error}</span>
                </div>
            )}

            {/* Viewport Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {title && (
                    <div className="mb-6">
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-slate-600 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}
                {children}
            </main>

            {/* Comprehensive Institutional Curia Footer */}
            <CuriaFooter />
        </div>
    );
};

export default PortalLayout;
