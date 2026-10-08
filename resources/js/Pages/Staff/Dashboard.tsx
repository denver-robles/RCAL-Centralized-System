import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { PortalLayout } from '@/Layouts/PortalLayout';
import { PageProps } from '@/types';
import { Activity, BookOpen, FileCheck, Calendar, Users, Church } from 'lucide-react';

interface StatsProps {
    total: number;
    pending: number;
    verified: number;
    approved: number;
    processing: number;
    ready: number;
    issued: number;
    rejected: number;
    cancelled: number;
}

interface DashboardProps extends PageProps {
    stats: StatsProps;
    sacramentCounts: {
        total: number;
        baptism: number;
        confirmation: number;
        marriage: number;
        death: number;
    };
}

export default function Dashboard({ auth, stats, sacramentCounts }: DashboardProps) {
    const { user } = auth;

    return (
        <PortalLayout activeTab="dashboard" title="Administrative Dashboard">
            <Head title="Staff Dashboard — RCAL PIMS" />

            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                        <Church className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-amber-900">
                            Welcome back, {user?.display_name || user?.username}!
                        </h1>
                        <p className="text-sm text-amber-800">
                            {user?.is_archdiocese_wide 
                                ? 'Archdiocesan Curia Overview' 
                                : `Parish Dashboard: ${user?.home_parish_name || 'Assigned Parish'}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Certificates Widget */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <FileCheck className="w-5 h-5 text-amber-600" />
                        <h2 className="font-bold text-lg">Certificate Requests</h2>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-2">{stats.pending}</div>
                    <p className="text-sm text-slate-500 mb-6">Pending actions required</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 mb-1">Processing</span>
                            <span className="font-bold text-slate-700">{stats.processing}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 mb-1">Ready</span>
                            <span className="font-bold text-emerald-600">{stats.ready}</span>
                        </div>
                    </div>
                    
                    <Link href="/certificates" className="mt-4 btn-primary py-2 w-full text-center text-xs justify-center">
                        Manage Requests
                    </Link>
                </div>

                {/* Sacramental Registers Widget */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <BookOpen className="w-5 h-5 text-amber-600" />
                        <h2 className="font-bold text-lg">Canonical Records</h2>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-2">{sacramentCounts.total}</div>
                    <p className="text-sm text-slate-500 mb-6">Total inscribed folios</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 mb-1">Baptisms</span>
                            <span className="font-bold text-slate-700">{sacramentCounts.baptism}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 mb-1">Marriages</span>
                            <span className="font-bold text-slate-700">{sacramentCounts.marriage}</span>
                        </div>
                    </div>
                    
                    <Link href="/records" className="mt-4 btn-primary py-2 w-full text-center text-xs justify-center">
                        View Registers
                    </Link>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <Activity className="w-5 h-5 text-amber-600" />
                        <h2 className="font-bold text-lg">Quick Actions</h2>
                    </div>
                    
                    <div className="space-y-3 mt-auto">
                        <Link href="/records/create" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-colors">
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-slate-700">Inscribe New Record</span>
                        </Link>
                        
                        <Link href="/schedules/create" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-colors">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-slate-700">Schedule Sacrament</span>
                        </Link>
                        
                        {auth.user?.is_archdiocese_wide && (
                            <Link href="/clergy" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-colors">
                                <Users className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium text-slate-700">Manage Clergy Directory</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
