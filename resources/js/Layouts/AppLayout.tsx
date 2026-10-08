import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { CuriaFooter } from '@/Components/CuriaFooter';
import { Menu, X, Shield, Clock, BookOpen, FileCheck, Calendar, LogIn, User as UserIcon } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { auth, curia } = usePage<PageProps>().props;
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-500 selection:text-slate-950 font-sans">
            {/* Top Chancery Notification Bar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950 border-b border-slate-800/80 transition-all text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Brand Logo & Curia Identity */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md shadow-amber-500/10 group-hover:shadow-amber-500/20 transition-all">
                                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
                                        <img
                                            src="/images/logo.png"
                                            alt="RCAL Seal"
                                            className="w-7 h-7 object-contain"
                                            onError={(e) => {
                                                // Fallback if image not ready
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold tracking-widest text-amber-400 uppercase font-serif">
                                        Archdiocese of Lipa
                                    </span>
                                    <span className="block text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-tight">
                                        Centralized PIMS
                                    </span>
                                </div>
                            </Link>

                            {/* Curia Operating Hours Pill */}
                            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium ml-4">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>{curia.operating_hours}</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link
                                href="/"
                                className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors"
                            >
                                Home
                            </Link>
                            <a
                                href="#guidelines"
                                className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors"
                            >
                                Canonical Guidelines
                            </a>
                            <a
                                href="#helpdesk"
                                className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors"
                            >
                                Helpdesk & FAQ
                            </a>

                            {auth.user ? (
                                <Link
                                    href={auth.user.is_staff ? '/records' : '/portal/dashboard'}
                                    className="btn-primary"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    <span>{auth.user.is_staff ? 'Staff Console' : 'Parishioner Portal'}</span>
                                </Link>
                            ) : (
                                <Link href="/login" className="btn-primary">
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign In</span>
                                </Link>
                            )}
                        </nav>

                        {/* Mobile Drawer Trigger */}
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setDrawerOpen(!drawerOpen)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                aria-label="Toggle navigation"
                            >
                                {drawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Touch Drawer Navigation */}
                {drawerOpen && (
                    <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium w-full justify-center mb-2">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{curia.operating_hours}</span>
                        </div>

                        <Link
                            href="/"
                            onClick={() => setDrawerOpen(false)}
                            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-amber-400"
                        >
                            Home
                        </Link>
                        <a
                            href="#guidelines"
                            onClick={() => setDrawerOpen(false)}
                            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-amber-400"
                        >
                            Canonical Guidelines
                        </a>
                        <a
                            href="#helpdesk"
                            onClick={() => setDrawerOpen(false)}
                            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-amber-400"
                        >
                            Helpdesk & FAQ
                        </a>

                        <div className="pt-3">
                            {auth.user ? (
                                <Link
                                    href={auth.user.is_staff ? '/records' : '/portal/dashboard'}
                                    className="btn-primary w-full"
                                    onClick={() => setDrawerOpen(false)}
                                >
                                    <UserIcon className="w-4 h-4" />
                                    <span>{auth.user.is_staff ? 'Staff Console' : 'Parishioner Portal'}</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="btn-primary w-full"
                                    onClick={() => setDrawerOpen(false)}
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign In</span>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Viewport */}
            <main className="flex-1">{children}</main>

            {/* Comprehensive Institutional Curia Footer */}
            <CuriaFooter />
        </div>
    );
};

export default AppLayout;
