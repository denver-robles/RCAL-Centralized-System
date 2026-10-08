import React from 'react';
import { Head } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { PageProps } from '@/types';
import { BookOpen, Church, Award, Users, TrendingUp, MapPin } from 'lucide-react';

interface VicariateData {
    id: number;
    name: string;
    parishes_count: number;
    records_count: number;
}

interface TopParish {
    id: number;
    name: string;
    city_municipality?: string | null;
    sacramental_records_count: number;
}

interface Props extends PageProps {
    archdioceseCounts: {
        parishes: number;
        vicariates: number;
        municipalities: number;
        priests: number;
        clergy: number;
        records: number;
        persons: number;
    };
    sacramentCounts: {
        baptism: number;
        confirmation: number;
        marriage: number;
        death: number;
    };
    requestStats: {
        open: number;
        issued: number;
        pending: number;
        rejected: number;
        total: number;
        cert_total: number;
        doc_total: number;
    };
    vicariatesData: VicariateData[];
    topParishes: TopParish[];
}

export default function Index({ archdioceseCounts, sacramentCounts, requestStats, vicariatesData, topParishes }: Props) {
    const totalSacraments =
        (sacramentCounts.baptism || 0) +
        (sacramentCounts.confirmation || 0) +
        (sacramentCounts.marriage || 0) +
        (sacramentCounts.death || 0) || 1;

    return (
        <PortalLayout
            title="Archdiocesan Curia Analytics & Statistical Reports"
            subtitle="Centralized oversight of sacramental registries, parish vicariates, and certificate throughput"
        >
            <Head title="Curia Analytics - RCAL PIMS" />

            <div className="space-y-6">
                {/* Headline Archdiocesan Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-amber-600 mb-2">
                            <Church className="w-6 h-6" />
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                                {archdioceseCounts.vicariates} Vicariates
                            </span>
                        </div>
                        <div className="text-3xl font-serif font-bold text-slate-900">
                            {archdioceseCounts.parishes}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Active Parishes & Shrines</div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-sky-600 mb-2">
                            <BookOpen className="w-6 h-6" />
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                                Can. 535 Registers
                            </span>
                        </div>
                        <div className="text-3xl font-serif font-bold text-slate-900">
                            {archdioceseCounts.records.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Inscribed Sacramental Entries</div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-emerald-600 mb-2">
                            <Award className="w-6 h-6" />
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                                Released
                            </span>
                        </div>
                        <div className="text-3xl font-serif font-bold text-slate-900">
                            {requestStats.issued.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Official Certificates Issued</div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-purple-600 mb-2">
                            <Users className="w-6 h-6" />
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                                Presbytery
                            </span>
                        </div>
                        <div className="text-3xl font-serif font-bold text-slate-900">
                            {archdioceseCounts.clergy}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Archdiocesan Clergy & Priests</div>
                    </div>
                </div>

                {/* Second Row: Sacraments Breakdown & Request Pipeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sacrament Type Distribution */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-600" />
                                Sacramental Registry Distribution
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">Total: {totalSacraments.toLocaleString()}</span>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-800">Baptisms (Baptismus)</span>
                                    <span className="text-amber-800 font-mono font-bold">
                                        {sacramentCounts.baptism.toLocaleString()} (
                                        {Math.round((sacramentCounts.baptism / totalSacraments) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-2.5 rounded-full"
                                        style={{ width: `${(sacramentCounts.baptism / totalSacraments) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-800">Confirmations (Confirmatio)</span>
                                    <span className="text-sky-800 font-mono font-bold">
                                        {sacramentCounts.confirmation.toLocaleString()} (
                                        {Math.round((sacramentCounts.confirmation / totalSacraments) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-sky-500 h-2.5 rounded-full"
                                        style={{ width: `${(sacramentCounts.confirmation / totalSacraments) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-800">Holy Matrimony (Matrimonium)</span>
                                    <span className="text-rose-800 font-mono font-bold">
                                        {sacramentCounts.marriage.toLocaleString()} (
                                        {Math.round((sacramentCounts.marriage / totalSacraments) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-rose-500 h-2.5 rounded-full"
                                        style={{ width: `${(sacramentCounts.marriage / totalSacraments) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-800">Defunctis / Deaths</span>
                                    <span className="text-purple-800 font-mono font-bold">
                                        {sacramentCounts.death.toLocaleString()} (
                                        {Math.round((sacramentCounts.death / totalSacraments) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-purple-500 h-2.5 rounded-full"
                                        style={{ width: `${(sacramentCounts.death / totalSacraments) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Certificate Request Pipeline */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-600" />
                                Certificate Orders & Claims Pipeline
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">
                                {requestStats.total.toLocaleString()} Total Orders
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                                <span className="text-xs text-amber-900 font-medium block mb-1">In-Flight Processing</span>
                                <div className="text-2xl font-serif font-bold text-amber-800">
                                    {requestStats.open.toLocaleString()}
                                </div>
                                <span className="text-[11px] text-amber-700/80">Awaiting pick-up or verification</span>
                            </div>

                            <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-4">
                                <span className="text-xs text-sky-900 font-medium block mb-1">Pending Initial Review</span>
                                <div className="text-2xl font-serif font-bold text-sky-800">
                                    {requestStats.pending.toLocaleString()}
                                </div>
                                <span className="text-[11px] text-sky-700/80">Unmatched / Freshly filed</span>
                            </div>

                            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                                <span className="text-xs text-emerald-900 font-medium block mb-1">Officially Released</span>
                                <div className="text-2xl font-serif font-bold text-emerald-800">
                                    {requestStats.issued.toLocaleString()}
                                </div>
                                <span className="text-[11px] text-emerald-700/80">With Dry Seal & Crypto Token</span>
                            </div>

                            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4">
                                <span className="text-xs text-rose-900 font-medium block mb-1">Rejected / Cancelled</span>
                                <div className="text-2xl font-serif font-bold text-rose-800">
                                    {requestStats.rejected.toLocaleString()}
                                </div>
                                <span className="text-[11px] text-rose-700/80">Privacy or entry mismatch</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Third Row: Vicariates Breakdown & Top Parishes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vicariates Table */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-amber-600" />
                                Vicariate Jurisdictions Overview
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">{vicariatesData.length} Vicariates</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-4">Vicariate</th>
                                        <th className="py-2.5 px-4 text-center">Parishes</th>
                                        <th className="py-2.5 px-4 text-right">Inscribed Entries</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {vicariatesData.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-4 font-semibold text-slate-900">{v.name}</td>
                                            <td className="py-2.5 px-4 text-center text-slate-600 font-mono">
                                                {v.parishes_count}
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-amber-800 font-mono font-bold">
                                                {v.records_count.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Parishes by Sacramental Inscriptions */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                Top Parishes by Registry Volume
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">Archdiocesan Curia Rank</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-4">Parish Church</th>
                                        <th className="py-2.5 px-4">Municipality</th>
                                        <th className="py-2.5 px-4 text-right">Canonical Entries</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {topParishes.map((parish) => (
                                        <tr key={parish.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-4 font-semibold text-slate-900">{parish.name}</td>
                                            <td className="py-2.5 px-4 text-slate-500">{parish.city_municipality || '—'}</td>
                                            <td className="py-2.5 px-4 text-right text-amber-800 font-mono font-bold">
                                                {parish.sacramental_records_count.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
