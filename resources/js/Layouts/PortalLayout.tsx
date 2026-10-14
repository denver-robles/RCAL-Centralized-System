import React, { useState } from 'react';
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
    Settings,
    Menu,
    X,
    LayoutDashboard,
    ChevronRight,
} from 'lucide-react';

interface PortalLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    activeTab?: 'dashboard' | 'records' | 'certificates' | 'schedules' | 'clergy' | 'users' | 'audit' | 'analytics' | 'portal' | 'portal_request' | 'portal_schedule';
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, title, subtitle, activeTab }) => {
    const { auth, flash, curia } = usePage<PageProps>().props;
    const user = auth.user;
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/logout', {}, {
            onFinish: () => {
                window.location.replace('/login');
            },
        });
    };

    const handleExitToLanding = (e: React.MouseEvent) => {
        e.preventDefault();
        router.post('/logout', { redirect: '/' }, {
            onFinish: () => {
                window.location.replace('/');
            },
        });
    };

    React.useEffect(() => {
        if (!user) {
            window.location.replace('/login');
        }
    }, [user]);

    const isStaff = user?.is_staff ?? false;

    // Navigation links helper
    const renderNavLinks = (onItemClick?: () => void) => {
        const linkClass = (isActive: boolean) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                isActive
                    ? 'bg-amber-500/20 text-amber-300 font-bold border-l-4 border-amber-400 pl-3 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`;

        if (isStaff) {
            return (
                <div className="space-y-6">
                    <div>
                        <div className="px-3.5 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Canonical Administration
                        </div>
                        <nav className="space-y-1">
                            <Link
                                href="/dashboard"
                                onClick={onItemClick}
                                className={linkClass(activeTab === 'dashboard')}
                            >
                                <LayoutDashboard className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Curia Dashboard</span>
                            </Link>

                            <Link
                                href="/records"
                                onClick={onItemClick}
                                className={linkClass(activeTab === 'records')}
                            >
                                <BookOpen className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Canonical Registers</span>
                            </Link>

                            <Link
                                href="/certificates"
                                onClick={onItemClick}
                                className={linkClass(activeTab === 'certificates')}
                            >
                                <FileCheck className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Certificate Requests</span>
                            </Link>

                            <Link
                                href="/schedules"
                                onClick={onItemClick}
                                className={linkClass(activeTab === 'schedules')}
                            >
                                <Calendar className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Sacrament Schedules</span>
                            </Link>

                            <Link
                                href="/schedules/settings"
                                onClick={onItemClick}
                                className={linkClass(false)}
                            >
                                <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                                <span>Sacrament Settings</span>
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <div className="px-3.5 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Diocesan Directories
                        </div>
                        <nav className="space-y-1">
                            <Link
                                href="/clergy"
                                onClick={onItemClick}
                                className={linkClass(activeTab === 'clergy')}
                            >
                                <Users className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Clergy Directory</span>
                            </Link>

                            {user?.is_archdiocese_wide && (
                                <>
                                    <Link
                                        href="/users"
                                        onClick={onItemClick}
                                        className={linkClass(activeTab === 'users')}
                                    >
                                        <UserCheck className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>Account Directory</span>
                                    </Link>

                                    <Link
                                        href="/audit"
                                        onClick={onItemClick}
                                        className={linkClass(activeTab === 'audit')}
                                    >
                                        <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>Audit Trail (RA 10173)</span>
                                    </Link>

                                    <Link
                                        href="/analytics"
                                        onClick={onItemClick}
                                        className={linkClass(activeTab === 'analytics')}
                                    >
                                        <BarChart3 className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>Curia Analytics</span>
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            );
        }

        // Parishioner Navigation
        return (
            <div className="space-y-6">
                <div>
                    <div className="px-3.5 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Parishioner Services
                    </div>
                    <nav className="space-y-1">
                        <Link
                            href="/portal/dashboard"
                            onClick={onItemClick}
                            className={linkClass(activeTab === 'portal')}
                        >
                            <FileText className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>My Claims & Orders</span>
                        </Link>

                        <Link
                            href="/portal/requests/create"
                            onClick={onItemClick}
                            className={linkClass(activeTab === 'portal_request')}
                        >
                            <PlusCircle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>Request Church Document</span>
                        </Link>

                        <Link
                            href="/portal/schedule-requests/create"
                            onClick={onItemClick}
                            className={linkClass(activeTab === 'portal_schedule')}
                        >
                            <Calendar className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>Book Sacrament Schedule</span>
                        </Link>
                    </nav>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            {/* Desktop Left Sidebar Navigation */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 bg-[#0a0f1d] border-r border-slate-800 text-white">
                {/* Brand & Archdiocesan Seal Header */}
                <div className="p-5 border-b border-slate-800/80 flex items-center gap-3 shrink-0">
                    <img
                        src="/images/logo.png"
                        alt="Archdiocese Logo"
                        className="w-10 h-10 object-contain rounded-full shadow-xs border border-amber-400/30"
                    />
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={handleExitToLanding}
                            className="group block text-left focus:outline-none"
                            title="Sign Out & Return to Landing Page"
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="font-serif font-black text-sm tracking-wide text-white group-hover:text-amber-400 transition-colors uppercase block leading-tight">
                                    RCAL PIMS
                                </span>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-rose-950 group-hover:text-rose-300 border border-slate-700 group-hover:border-rose-600/50 transition-colors">
                                    Exit
                                </span>
                            </div>
                            <span className="text-[10px] text-amber-400/90 font-medium block truncate">
                                Archdiocese of Lipa
                            </span>
                        </button>
                    </div>
                </div>

                {/* Jurisdiction / Scope Pill */}
                <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 shrink-0">
                    {isStaff ? (
                        <div className="flex items-center gap-2 text-xs text-amber-300">
                            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate font-medium text-[11px]">
                                {user?.is_archdiocese_wide
                                    ? 'Curia Chancery Scope'
                                    : user?.home_parish_name || 'Assigned Parish'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-sky-300">
                            <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="truncate font-medium text-[11px]">
                                Parishioner Self-Service
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Links Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 scrollbar-thin scrollbar-thumb-slate-800">
                    {renderNavLinks()}
                </div>

                {/* Sidebar Footer: Curia Date & User Card */}
                <div className="p-4 border-t border-slate-800 bg-[#070b16] shrink-0 space-y-3">
                    {curia?.current_date && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{curia.current_date}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="block text-xs font-bold text-slate-100 truncate">
                                    {user?.display_name || user?.username}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="block text-[10px] text-amber-400 truncate">
                                        {user?.role_label}
                                    </span>
                                    {user?.is_parishioner && (
                                        user?.identity_status === 'verified' ? (
                                            <span className="text-[9px] text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                                ✓ ID Verified
                                            </span>
                                        ) : (
                                            <Link
                                                href="/identity/verify"
                                                className="text-[9px] text-amber-300 hover:text-amber-200 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded font-medium hover:underline inline-flex items-center gap-0.5"
                                            >
                                                Verify ID
                                            </Link>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleLogout}>
                            <button
                                type="submit"
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Sign Out"
                                aria-label="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Mobile Header Bar */}
            <header className="lg:hidden h-16 bg-[#0a0f1d] border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(true)}
                        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Open Navigation Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleExitToLanding}
                        className="flex items-center gap-2 group text-left focus:outline-none"
                        title="Sign Out & Return to Landing Page"
                    >
                        <img
                            src="/images/logo.png"
                            alt="Archdiocese Logo"
                            className="w-8 h-8 object-contain rounded-full shadow-xs border border-amber-400/30"
                        />
                        <div>
                            <div className="flex items-center gap-1">
                                <span className="font-serif font-black text-sm text-white group-hover:text-amber-400 tracking-wide uppercase block leading-tight">
                                    RCAL PIMS
                                </span>
                                <span className="text-[9px] uppercase font-bold px-1 rounded bg-slate-800 text-slate-300 group-hover:bg-rose-950 group-hover:text-rose-300 border border-slate-700 transition-colors">
                                    Exit
                                </span>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {user?.role_label}
                    </span>
                    <form onSubmit={handleLogout}>
                        <button
                            type="submit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {mobileDrawerOpen && (
                <div
                    className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMobileDrawerOpen(false)}
                >
                    <div
                        className="w-72 bg-[#0a0f1d] h-full flex flex-col border-r border-slate-800 text-white p-4 shadow-2xl animate-in slide-in-from-left duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                            <button
                                type="button"
                                onClick={handleExitToLanding}
                                className="flex items-center gap-2.5 group text-left focus:outline-none"
                                title="Sign Out & Return to Landing Page"
                            >
                                <img
                                    src="/images/logo.png"
                                    alt="Archdiocese Logo"
                                    className="w-9 h-9 object-contain rounded-full border border-amber-400/30"
                                />
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-serif font-bold text-sm text-white group-hover:text-amber-400 block leading-tight">
                                            RCAL PIMS
                                        </span>
                                        <span className="text-[9px] uppercase font-bold px-1 rounded bg-slate-800 text-slate-300 group-hover:bg-rose-950 group-hover:text-rose-300 border border-slate-700 transition-colors">
                                            Exit
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-amber-400 block">Archdiocese of Lipa</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4">
                            {renderNavLinks(() => setMobileDrawerOpen(false))}
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="text-xs">
                                    <span className="block font-bold text-slate-100">{user?.display_name || user?.username}</span>
                                    <span className="block text-[10px] text-amber-400">{user?.role_label}</span>
                                </div>
                                <form onSubmit={handleLogout}>
                                    <button
                                        type="submit"
                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Application Area (Padded on desktop for sidebar) */}
            <div className="lg:pl-64 flex flex-col flex-1">
                {/* Readable Elevated Header Section */}
                {title && (
                    <header className="bg-white border-b border-slate-200 px-6 sm:px-10 py-6 sm:py-7 shadow-2xs">
                        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                                        {isStaff
                                            ? (user?.is_archdiocese_wide ? 'Archdiocesan Curia' : user?.home_parish_name || 'Parish Administration')
                                            : 'Parishioner Self-Service'}
                                    </span>
                                    {curia?.current_date && (
                                        <span className="text-[11px] text-slate-500 hidden sm:inline-flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {curia.current_date}
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-slate-900 tracking-tight leading-snug">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-3xl leading-relaxed font-normal">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    </header>
                )}

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 text-emerald-800 text-sm flex items-center justify-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-rose-50 border-b border-rose-200 px-6 py-3.5 text-rose-800 text-sm flex items-center justify-center gap-2 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">{flash.error}</span>
                    </div>
                )}

                {/* Viewport Content */}
                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-8">
                    {children}
                </main>

                {/* Archdiocesan Curia Footer */}
                <CuriaFooter />
            </div>
        </div>
    );
};

export default PortalLayout;
