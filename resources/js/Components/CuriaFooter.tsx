import React from 'react';
import { Church, Shield, Phone, Mail, Clock, MapPin, BookOpen, Lock, CheckCircle2 } from 'lucide-react';

export const CuriaFooter: React.FC = () => {
    return (
        <footer className="border-t border-slate-800 bg-[#070b14] text-slate-400 text-xs selection:bg-amber-400 selection:text-slate-950">
            {/* Top 3-Column Institutional Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                    {/* Column 1: Archdiocesan Curia Chancery */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.png"
                                alt="Archdiocese of Lipa Seal"
                                className="w-10 h-10 object-contain rounded-full border border-amber-400/40 shadow-xs"
                            />
                            <div>
                                <h3 className="text-white font-serif font-bold text-sm tracking-wide uppercase">
                                    Archdiocese of Lipa
                                </h3>
                                <p className="text-amber-400 text-[11px] font-semibold tracking-wider uppercase">
                                    Curia Chancery & Archives
                                </p>
                            </div>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed">
                            The administrative seat and canonical registry center for the Roman Catholic Archdiocese of Lipa, overseeing 64 parishes across Batangas.
                        </p>

                        <div className="space-y-2 text-slate-300 pt-1">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span className="leading-snug">
                                    Archbishop’s Residence, St. Sebastian Cathedral Compound, C.M. Recto Ave., Lipa City, 4217 Batangas
                                </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="font-mono text-slate-200">
                                    (043) 756-2572 • (043) 756-2573
                                </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                                <a
                                    href="mailto:chancery@archdioceselipa.ph"
                                    className="text-amber-400 hover:text-amber-300 hover:underline"
                                >
                                    chancery@archdioceselipa.ph
                                </a>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>Mon–Fri: 8:00 AM – 12:00 PM, 1:30 PM – 5:00 PM</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Canonical Registries & Vicariates */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                            <h3 className="text-white font-serif font-bold text-sm tracking-wider uppercase">
                                Canonical Registries & Vicariates
                            </h3>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed">
                            Organized in accordance with Code of Canon Law Can. 535 for baptismal, confirmation, marriage, and death registers across the archdiocese:
                        </p>

                        <ul className="space-y-1.5 text-slate-300 text-[11px]">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate I:</strong> St. Francis Xavier (Nasugbu, Lian, Calatagan)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate II:</strong> St. John the Baptist (Calaca, Balayan, Tuy)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate III:</strong> Immaculate Conception (Bauang, Mabini, Tingloy)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate IV:</strong> St. Joseph the Patriarch (San Jose, Ibaan)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate V:</strong> San Sebastian (Lipa City & Mataasnakahoy)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate VI:</strong> Most Holy Rosary (Rosario, San Juan, Taysan)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span><strong>Vicariate VII:</strong> St. Thomas Aquinas (Sto. Tomas, Tanauan, Malvar)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Data Privacy & Canonical Governance */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <h3 className="text-white font-serif font-bold text-sm tracking-wider uppercase">
                                Data Privacy & Compliance
                            </h3>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed">
                            The RCAL PIMS platform is strictly compliant with statutory privacy mandates and canonical record preservation:
                        </p>

                        <div className="space-y-2.5 text-xs">
                            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                                <div className="flex items-center gap-2 text-white font-semibold">
                                    <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span>Republic Act No. 10173</span>
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    Data Privacy Act of 2012 compliance. All sacramental queries and certificate releases are immutable and audit-logged.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Code of Canon Law Can. 535 §2</span>
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    Original sacramental entries are permanent; ecclesiastical updates are recorded exclusively as append-only marginal annotations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Institutional Bar */}
            <div className="border-t border-slate-800/80 bg-[#05080f] py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <div>
                        <p className="text-slate-300 text-xs font-semibold">
                            © {new Date().getFullYear()} Roman Catholic Archdiocese of Lipa (RCAL). All Rights Reserved.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Centralized Parish Information Management System (PIMS) • Archdiocese of Lipa Chancery
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-amber-400 font-serif italic">
                        <span className="font-bold text-amber-400">†</span>
                        <span>"Ut unum sint" — "That they may all be one" (John 17:21) • Servire in Caritate</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default CuriaFooter;
