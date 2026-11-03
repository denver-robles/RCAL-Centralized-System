import React from 'react';
import { Phone, Mail, Clock, MapPin, ShieldCheck, Lock } from 'lucide-react';

export const CuriaFooter: React.FC = () => {
    return (
        <footer className="border-t border-slate-800 bg-[#070b14] text-slate-300 text-sm selection:bg-amber-400 selection:text-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {/* Brand & Chancery Identity */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.png"
                                alt="Archdiocese of Lipa Seal"
                                className="w-10 h-10 object-contain rounded-full border border-amber-400/40 shadow-xs"
                            />
                            <div>
                                <h3 className="text-white font-serif font-bold text-base tracking-wide uppercase">
                                    Archdiocese of Lipa
                                </h3>
                                <p className="text-amber-400 text-xs font-semibold tracking-wide uppercase">
                                    Curia Chancery & Archives
                                </p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Centralized canonical registry and parish records management system serving 64 parishes across Batangas.
                        </p>
                    </div>

                    {/* Chancery Contact Info */}
                    <div className="space-y-2.5 text-sm">
                        <h4 className="text-white font-serif font-semibold text-sm tracking-wide uppercase text-amber-300 mb-2">
                            Chancery Office
                        </h4>
                        <div className="flex items-start gap-2.5 text-slate-300">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>St. Sebastian Cathedral Compound, C.M. Recto Ave., Lipa City, 4217 Batangas</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-mono text-slate-200">(043) 756-2572 • (043) 756-2573</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                            <a
                                href="mailto:chancery@archdioceselipa.ph"
                                className="text-amber-400 hover:text-amber-300 hover:underline"
                            >
                                chancery@archdioceselipa.ph
                            </a>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Mon–Fri: 8:00 AM – 12:00 PM, 1:30 PM – 5:00 PM</span>
                        </div>
                    </div>

                    {/* Governance & Privacy Compliance */}
                    <div className="space-y-3">
                        <h4 className="text-white font-serif font-semibold text-sm tracking-wide uppercase text-amber-300 mb-2">
                            Governance & Compliance
                        </h4>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-white font-medium text-xs">
                                <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>Republic Act No. 10173 (DPA 2012)</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                End-to-end cryptographic audit trails and privacy-protected document requests.
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                            <div className="flex items-center gap-2 text-amber-300 font-medium text-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Canon 535 §2 Record Immutability</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Permanent sacramental registers with verified marginal annotations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Institutional Bar */}
            <div className="border-t border-slate-800/80 bg-[#05080f] py-4 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p className="text-slate-400 text-xs">
                        © {new Date().getFullYear()} Roman Catholic Archdiocese of Lipa (RCAL). All Rights Reserved.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-serif italic">
                        <span className="font-bold text-amber-400">†</span>
                        <span>"Ut unum sint" — "That they may all be one" (John 17:21)</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default CuriaFooter;
