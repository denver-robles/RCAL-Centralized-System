import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { FaqAccordion } from '@/Components/FaqAccordion';
import {
    Church,
    BookOpen,
    FileCheck,
    Calendar,
    Shield,
    Users,
    CheckCircle,
    ArrowRight,
    Search,
    Clock,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MapPin,
    Building2,
    Lock,
    ExternalLink,
} from 'lucide-react';

interface Stats {
    parishes: number;
    vicariates: number;
    municipalities: number;
    priests: number;
    clergy: number;
    records: number;
    persons: number;
}

interface IndexProps {
    stats?: Stats;
}

interface TrackResult {
    tracking_code: string;
    status: string;
    sacrament_type: string;
    name_on_record: string;
    parish_name: string;
    submitted_at: string;
    issued_at?: string | null;
}

export default function Index({ stats }: IndexProps) {
    const safeStats = stats || {
        parishes: 64,
        vicariates: 7,
        municipalities: 34,
        priests: 120,
        clergy: 120,
        records: 50000,
        persons: 48000,
    };

    const [trackingCode, setTrackingCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<TrackResult | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [selectedGuideline, setSelectedGuideline] = useState<'baptism' | 'confirmation' | 'marriage' | 'death'>('baptism');
    const [stepperStep, setStepperStep] = useState(1);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = trackingCode.trim();
        if (!code) return;

        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            const res = await fetch(`/track?code=${encodeURIComponent(code)}`);
            const data = await res.json();
            if (res.ok) {
                setSearchResult(data);
            } else {
                setSearchError(data.error || 'No document request found for the specified tracking code.');
            }
        } catch {
            setSearchError('Unable to connect to the Archdiocesan server. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const faqItems = [
        {
            question: 'What is the canonical basis for record immutability?',
            answer: 'According to Code of Canon Law Can. 535 §1 and §2, entries inscribed in the parochial registers cannot be overwritten. Any subsequent ecclesiastical act (e.g. marriage, ordination, solemn profession) or formal correction is inscribed strictly as an append-only marginal annotation referencing the official decree.',
            citation: 'Code of Canon Law, Can. 535 §2',
        },
        {
            question: 'How does the system comply with the Data Privacy Act (RA 10173)?',
            answer: 'All sacramental inquiries and certificate releases are cryptographically recorded in tamper-evident access and audit logs capturing user identity, IP address, timestamp, and legal basis. Parishioners must grant explicit consent and present verifiable proof of identity before certified copies are released.',
            citation: 'Republic Act No. 10173 (DPA of 2012)',
        },
        {
            question: 'Can parish clerks transcribe or modify registers of other parishes?',
            answer: 'No. Multi-tenant parish scoping strictly isolates each parish clerk to registers belonging to their assigned parish. Only Chancery Administrators and the Curia Chancellor possess province-wide oversight across the 7 Vicariates.',
            citation: 'RCAL Archdiocesan Curia Policy 2026-A',
        },
        {
            question: 'Why are Mass Intentions excluded from the scheduling module?',
            answer: 'Mass Intentions are strictly excluded by RCAL project guidelines to ensure the system focuses purely on canonical register management, certified copy issuance, and sacramental appointment scheduling.',
            citation: 'RCAL PIMS System Specification §4.1',
        },
        {
            question: 'How do third-party institutions verify the authenticity of an RCAL certificate?',
            answer: 'Each certificate is issued with a unique archdiocesan registry number and cryptographic verification token. Recipients can scan the printed QR code or enter the token into the public verification portal to inspect its validity in real time.',
            citation: 'RCAL Document Security Norms',
        },
    ];

    return (
        <AppLayout>
            <Head title="Parish Information Management System (PIMS) — Archdiocese of Lipa" />

            {/* Cathedral Hero Section with Full-Bleed Artwork Backdrop */}
            <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28 bg-[#070b14] border-b border-slate-800 selection:bg-amber-400 selection:text-slate-950">
                {/* Church Background Artwork */}
                <img
                    src="/images/church.png"
                    alt="Cathedral Background"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-25 filter blur-[0.5px]"
                />
                {/* Liturgical Marian Navy Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d]/90 via-[#0a0f1d]/85 to-[#070b14]" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Chancery Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm backdrop-blur-md hover:-translate-y-0.5 transition-all duration-200">
                            <Church className="w-4 h-4 text-amber-400" />
                            <span>Roman Catholic Archdiocese of Lipa • Chancery Curia • Est. 1810</span>
                        </div>

                        {/* Newsreader Serif Headline */}
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
                            <span>Faithful Records.</span>{' '}
                            <span className="text-amber-400">Canonical Integrity.</span>{' '}
                            <span className="block mt-1 sm:mt-2 text-slate-100">Connected Service.</span>
                        </h1>

                        <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            A modernized canonical records management platform serving 64 parishes across Batangas with Code of Canon Law Can. 535 immutability, tamper-evident certificate issuance, and RA 10173 data privacy governance.
                        </p>

                        {/* CTA Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                            <Link
                                href="/portal/requests/create"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm tracking-wide uppercase transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-amber-400/20"
                            >
                                <FileText className="w-4 h-4 text-slate-950" />
                                <span>Request Church Certificate</span>
                                <ArrowRight className="w-4 h-4 text-slate-950 ml-0.5" />
                            </Link>

                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 font-semibold text-sm border border-slate-700 hover:border-slate-500 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                            >
                                <Church className="w-4 h-4 text-amber-400" />
                                <span>Sign In to Portal</span>
                            </Link>

                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-sm border border-amber-500/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <span>+ Register as Parishioner</span>
                            </Link>
                        </div>
                    </div>

                    {/* Interactive Tracking Quick-Lookup Widget */}
                    <div className="mt-12 max-w-2xl mx-auto">
                        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-slate-900 text-sm sm:text-base">
                                            Track Document Request Status
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Enter the tracking code provided upon certificate claim submission
                                        </p>
                                    </div>
                                </div>
                                <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-medium">
                                    Instant Verification
                                </span>
                            </div>

                            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2.5">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={trackingCode}
                                        onChange={(e) => setTrackingCode(e.target.value)}
                                        placeholder="e.g. RCAL-REQ-7F928A1C"
                                        className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition shadow-2xs"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearching || !trackingCode.trim()}
                                    className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 shadow-xs flex items-center justify-center gap-2"
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                            <span>Tracking...</span>
                                        </>
                                    ) : (
                                        <span>Check Status</span>
                                    )}
                                </button>
                            </form>

                            {/* Tracking Result View */}
                            {searchResult && (
                                <div className="mt-5 p-4 rounded-xl bg-amber-50/60 border border-amber-200 animate-in fade-in duration-200 space-y-3">
                                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                                        <span className="text-xs font-mono font-bold text-amber-900">
                                            {searchResult.tracking_code}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            {searchResult.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Sacrament</span>
                                            <span className="font-semibold text-slate-900 capitalize">{searchResult.sacrament_type}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Name on Record</span>
                                            <span className="font-semibold text-slate-900">{searchResult.name_on_record}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Holding Parish</span>
                                            <span className="font-semibold text-slate-900 truncate block">{searchResult.parish_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Submitted At</span>
                                            <span className="font-semibold text-slate-700">
                                                {new Date(searchResult.submitted_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tracking Error View */}
                            {searchError && (
                                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>{searchError}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics Banner with Liturgical Accent Cards */}
            <section className="py-12 bg-white border-b border-slate-200 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 text-center">
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                            <span className="block text-2xl sm:text-4xl font-bold font-serif text-amber-600">
                                {safeStats.parishes || 64}
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-700 mt-1 block">
                                Parishes
                            </span>
                        </div>

                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                            <span className="block text-2xl sm:text-4xl font-bold font-serif text-amber-600">
                                {safeStats.vicariates || 7}
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-700 mt-1 block">
                                Vicariates
                            </span>
                        </div>

                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                            <span className="block text-2xl sm:text-4xl font-bold font-serif text-amber-600">
                                {safeStats.clergy || 120}+
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-700 mt-1 block">
                                Active Clergy
                            </span>
                        </div>

                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                            <span className="block text-2xl sm:text-4xl font-bold font-serif text-amber-600">
                                {safeStats.records ? safeStats.records.toLocaleString() : '50,000+'}
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-700 mt-1 block">
                                Inscribed Records
                            </span>
                        </div>

                        <div className="col-span-2 md:col-span-1 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                            <span className="block text-2xl sm:text-4xl font-bold font-serif text-amber-600">
                                {safeStats.municipalities || 34}
                            </span>
                            <span className="text-xs uppercase font-semibold text-slate-700 mt-1 block">
                                Municipalities
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Five-Step Certificate Release Pipeline Stepper */}
            <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-600 font-semibold">
                        Certificates Workflow Simulator
                    </span>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                        Five-Step Document Release Pipeline
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        See how public document requests transition deterministically into tamper-evident certified copies.
                    </p>
                </div>

                <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-md">
                    {/* Stepper Progress Indicator */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
                        {[
                            { num: 1, label: '1. Claim' },
                            { num: 2, label: '2. Verify' },
                            { num: 3, label: '3. Approve' },
                            { num: 4, label: '4. Inscribe' },
                            { num: 5, label: '5. Release' },
                        ].map((s) => (
                            <button
                                key={s.num}
                                type="button"
                                onClick={() => setStepperStep(s.num)}
                                className={`text-center py-2.5 px-2 rounded-xl border transition-all text-xs font-bold ${
                                    stepperStep === s.num
                                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                                        : stepperStep > s.num
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Step Content Preview */}
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                        {stepperStep === 1 && (
                            <div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Step 1: Public Claim Submission</h3>
                                <p className="text-slate-600">
                                    The parishioner files a claim specifying the holding parish, year of event, and subject name with RA 10173 data privacy consent and government ID verification.
                                </p>
                                <div className="mt-3 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                    Status: <span className="text-sky-600 font-bold">submitted</span> • Tracking Code: <span className="text-slate-900 font-semibold">RCAL-REQ-7F928A1C</span>
                                </div>
                            </div>
                        )}
                        {stepperStep === 2 && (
                            <div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Step 2: Parish Register Search & Matching</h3>
                                <p className="text-slate-600">
                                    Parish office clerks inspect the physical books or scanned folios, matching the claim to Volume, Page, and Entry number in the parochial register.
                                </p>
                                <div className="mt-3 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                    Status: <span className="text-amber-700 font-bold">verified</span> • Canonical Citation: <span className="text-slate-900 font-semibold">Book 4, Page 12, Entry 8</span>
                                </div>
                            </div>
                        )}
                        {stepperStep === 3 && (
                            <div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Step 3: Chancery / Parish Priest Approval</h3>
                                <p className="text-slate-600">
                                    Authorized clergy or parish staff authorize the generation of the certified copy, ensuring no canonical impediments exist under Canon 535 §2.
                                </p>
                                <div className="mt-3 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                    Status: <span className="text-amber-700 font-bold">approved</span> • Approved by: <span className="text-slate-900 font-semibold">Rev. Fr. Armando Rosales</span>
                                </div>
                            </div>
                        )}
                        {stepperStep === 4 && (
                            <div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Step 4: Formal Certificate Inscription</h3>
                                <p className="text-slate-600">
                                    The document is rendered with the Archdiocesan seal, marginal annotations (Can. 535 §2), and dry seal registration markers.
                                </p>
                                <div className="mt-3 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                    Status: <span className="text-sky-600 font-bold">processing</span> ➔ <span className="text-indigo-600 font-bold">ready</span>
                                </div>
                            </div>
                        )}
                        {stepperStep === 5 && (
                            <div>
                                <h3 className="font-bold text-emerald-700 text-base mb-1">Step 5: Release & Cryptographic Verification</h3>
                                <p className="text-slate-600">
                                    The certified copy is stamped with a unique series number (`RCAL-2026-XXXX`) and verification token verifying provenance for civil and ecclesiastical authorities.
                                </p>
                                <div className="mt-3 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                    Status: <span className="text-emerald-700 font-bold">issued / completed</span> • Certificate No: <span className="text-slate-900 font-semibold">RCAL-2026-0042</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Parish Guidelines Tabs */}
            <section id="guidelines" className="py-16 bg-slate-100/70 border-t border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-mono uppercase tracking-widest text-amber-600 font-semibold">
                            Ecclesiastical Norms
                        </span>
                        <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                            Sacramental Register Guidelines
                        </h2>
                    </div>

                    <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
                        {(['baptism', 'confirmation', 'marriage', 'death'] as const).map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setSelectedGuideline(g)}
                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize ${
                                    selectedGuideline === g
                                        ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>

                    <div className="max-w-3xl mx-auto p-7 rounded-2xl bg-white border border-slate-200 text-sm leading-relaxed text-slate-700 shadow-sm">
                        {selectedGuideline === 'baptism' && (
                            <div className="space-y-3">
                                <h3 className="font-serif font-bold text-amber-700 text-base">Baptismal Register Guidelines (Can. 877)</h3>
                                <p>
                                    The parish priest must carefully and without delay record in the baptismal register the names of the baptized, the minister, the parents, the godparents, and the place and date of the baptism, noting also the date and place of birth.
                                </p>
                                <p className="text-xs text-slate-500">
                                    *Note: Marginal annotations for subsequent marriage, religious profession, or holy orders are strictly recorded on this folio.
                                </p>
                            </div>
                        )}
                        {selectedGuideline === 'confirmation' && (
                            <div className="space-y-3">
                                <h3 className="font-serif font-bold text-amber-700 text-base">Confirmation Register Guidelines (Can. 895)</h3>
                                <p>
                                    The names of the confirmed, the minister, the parents, the sponsor, and the place and date of the conferral are inscribed in the confirmation book of the parish where the confirmation occurred.
                                </p>
                            </div>
                        )}
                        {selectedGuideline === 'marriage' && (
                            <div className="space-y-3">
                                <h3 className="font-serif font-bold text-amber-700 text-base">Marriage Register Guidelines (Can. 1121)</h3>
                                <p>
                                    After a marriage is celebrated, the pastor of the place of celebration or whoever acts in his place is to record without delay the names of the spouses, the minister, the witnesses, and the place and date of marriage.
                                </p>
                            </div>
                        )}
                        {selectedGuideline === 'death' && (
                            <div className="space-y-3">
                                <h3 className="font-serif font-bold text-amber-700 text-base">Death & Burial Register Guidelines (Can. 1182)</h3>
                                <p>
                                    When a burial has taken place, an inscription is to be made in the register of deaths according to the norm of liturgical books.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Canonical Helpdesk & FAQ */}
            <section id="helpdesk" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-600 font-semibold">
                        Canonical Helpdesk
                    </span>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                        Frequently Asked Questions
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Questions on register verification, diocesan jurisdiction, and certified copy policies.
                    </p>
                </div>

                <FaqAccordion items={faqItems} />
            </section>
        </AppLayout>
    );
}
