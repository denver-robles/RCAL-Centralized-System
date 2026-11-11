import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { SacramentalRecord, Clergy } from '@/types';
import {
    X,
    BookOpen,
    Save,
    Calendar,
    User,
    Users,
    Printer,
    AlertCircle,
    Sparkles,
    Flame,
} from 'lucide-react';

interface Props {
    record: SacramentalRecord | null;
    clergy: Clergy[];
    isOpen: boolean;
    onClose: () => void;
}

export default function ChurchLedgerBookModal({ record, clergy, isOpen, onClose }: Props) {
    if (!isOpen || !record) return null;

    const isBaptism = record.sacrament_type === 'baptism';
    const isConfirmation = record.sacrament_type === 'confirmation';
    const bookData = (record.book_data as Record<string, any>) || {};

    // Form state
    const [bookNumber, setBookNumber] = useState<number>(record.book_number || 1);
    const [pageNumber, setPageNumber] = useState<number>(record.page_number || 1);
    const [entryNumber, setEntryNumber] = useState<number>(record.entry_number || 1);

    // Person fields
    const [firstName, setFirstName] = useState<string>(record.person?.first_name || '');
    const [middleName, setMiddleName] = useState<string>(record.person?.middle_name || '');
    const [lastName, setLastName] = useState<string>(record.person?.last_name || '');
    const [dateOfBirth, setDateOfBirth] = useState<string>(record.person?.date_of_birth || '');
    const [placeOfBirth, setPlaceOfBirth] = useState<string>(
        record.person?.place_of_birth || bookData.nativitatis_locus || record.place_of_event || ''
    );
    const [fatherName, setFatherName] = useState<string>(record.person?.father_name || '');
    const [motherName, setMotherName] = useState<string>(record.person?.mother_name || '');

    // Canonical & Book fields
    const [eventDate, setEventDate] = useState<string>(record.event_date || '');
    const [legitimacy, setLegitimacy] = useState<string>(
        bookData.nativitatis_legitimitas || record.legitimacy || 'LEG.'
    );
    const [godparents, setGodparents] = useState<string>(
        record.godparents || bookData.patrinorum_nomina_et_cognomina || bookData.patrinorum || ''
    );
    const [clergyId, setClergyId] = useState<string>(
        record.performed_by_clergy_id ? String(record.performed_by_clergy_id) : ''
    );
    const [ministerName, setMinisterName] = useState<string>(
        bookData.nomen_ministri || record.performed_by_clergy?.titled_name || ''
    );
    const [notes, setNotes] = useState<string>(record.register_notes || bookData.observanda || '');

    // Extra Book columns
    const [parentsOrigin, setParentsOrigin] = useState<string>(bookData.parentum_originis_locus || '');
    const [parentsResidence, setParentsResidence] = useState<string>(bookData.parentum_habitationis_locus || '');
    const [godparentsResidence, setGodparentsResidence] = useState<string>(bookData.patrinorum_habitationis_locus || '');
    const [stipendPesos, setStipendPesos] = useState<string>(bookData.stipendium_pesos ?? '0');
    const [stipendCts, setStipendCts] = useState<string>(bookData.stipendium_cts ?? '00');

    // Confirmation specific
    const [age, setAge] = useState<string>(bookData.aetas || '');
    const [parishOfBaptism, setParishOfBaptism] = useState<string>(bookData.parochia || '');
    const [provinceOfBaptism, setProvinceOfBaptism] = useState<string>(bookData.provincia || '');
    const [placeOfBaptism, setPlaceOfBaptism] = useState<string>(bookData.locus_baptismi || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-calculate suggested page when line number changes (5 entries per physical page)
    const handleEntryChange = (val: number) => {
        setEntryNumber(val);
        if (val > 0) {
            setPageNumber(Math.ceil(val / 5));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

        // Construct updated book_data JSON
        let updatedBookData: Record<string, any> = {
            no: entryNumber,
            stipendium_pesos: stipendPesos,
            stipendium_cts: stipendCts,
            nomen_ministri: ministerName,
            observanda: notes,
        };

        if (isBaptism) {
            updatedBookData = {
                ...updatedBookData,
                baptismi_annus: eventDate ? eventDate.split('-')[0] : '',
                baptismi_mensis_et_dies: eventDate,
                baptizatorum_nomina_et_cognomina: fullName,
                nativitatis_annus: dateOfBirth ? dateOfBirth.split('-')[0] : '',
                nativitatis_mensis_et_dies: dateOfBirth,
                nativitatis_legitimitas: legitimacy,
                nativitatis_locus: placeOfBirth,
                parentum_nomina_et_cognomina: [fatherName, motherName].filter(Boolean).join(' / '),
                parentum_originis_locus: parentsOrigin,
                parentum_habitationis_locus: parentsResidence,
                patrinorum_nomina_et_cognomina: godparents,
                patrinorum_habitationis_locus: godparentsResidence,
            };
        } else {
            updatedBookData = {
                ...updatedBookData,
                annus: eventDate ? eventDate.split('-')[0] : '',
                mensis_et_dies: eventDate,
                confirmatorum: fullName,
                aetas: age,
                parochia: parishOfBaptism,
                provincia: provinceOfBaptism,
                locus_baptismi: placeOfBaptism,
                parentum: [fatherName, motherName].filter(Boolean).join(' / '),
                patrinorum: godparents,
            };
        }

        router.post(
            `/records/${record.id}/book`,
            {
                book_number: bookNumber,
                page_number: pageNumber,
                entry_number: entryNumber,
                first_name: firstName,
                middle_name: middleName,
                last_name: lastName,
                date_of_birth: dateOfBirth || null,
                place_of_birth: placeOfBirth || null,
                father_name: fatherName || null,
                mother_name: motherName || null,
                event_date: eventDate || null,
                legitimacy,
                godparents,
                place_of_event: placeOfBirth || null,
                performed_by_clergy_id: clergyId ? Number(clergyId) : null,
                register_notes: notes,
                book_data: updatedBookData,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const firstError = Object.values(errors)[0] as string;
                    setErrorMessage(firstError || 'An error occurred while recording into the book.');
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
                {/* ── Modal Header: Consistent System Styling ── */}
                <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                            {isBaptism ? <Sparkles className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded text-2xs font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    St. Joseph the Worker Parish
                                </span>
                                <span className="text-slate-400 text-xs font-medium">
                                    {isBaptism ? 'Book of Baptisms' : 'Book of Confirmations'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                                Record to Physical Church Ledger / Edit Citation
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Modal Body / Form ── */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-50/50">
                    {errorMessage && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <strong className="font-bold">Cannot Save Entry:</strong> {errorMessage}
                            </div>
                        </div>
                    )}

                    {/* ── SECTION 1: PHYSICAL CHURCH BOOK CITATION ── */}
                    <div className="bg-white rounded-2xl border-2 border-amber-500/30 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                                <BookOpen className="w-5 h-5 text-amber-600" />
                                <span>Physical Ledger Coordinates (Canon 535 Citation)</span>
                            </div>
                            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                                Book {bookNumber} • Page {pageNumber} • Line {entryNumber}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Specify the <strong>Book No.</strong>, <strong>Page Number</strong>, and <strong>Line No.</strong> where this canonical entry is physically written in the church register.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    Book No. (Volume) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={bookNumber}
                                    onChange={(e) => setBookNumber(parseInt(e.target.value) || 1)}
                                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                                <span className="text-2xs text-slate-500 mt-1 block">Parish ledger volume number</span>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    Page Number (Folio) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={pageNumber}
                                    onChange={(e) => setPageNumber(parseInt(e.target.value) || 1)}
                                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                                <span className="text-2xs text-slate-500 mt-1 block">Folio page in ledger</span>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    Line / Entry No. (Row) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={entryNumber}
                                    onChange={(e) => handleEntryChange(parseInt(e.target.value) || 1)}
                                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                                <span className="text-2xs text-slate-500 mt-1 block">Entry row index (1–5 per page)</span>
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 2: SUBJECT PERSON & CANONICAL DETAILS ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
                            <User className="w-5 h-5 text-slate-600" />
                            <span>
                                {isBaptism ? 'Baptizatorum (Subject Person)' : 'Confirmatorum (Confirmand Person)'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                                <input
                                    type="text"
                                    value={middleName}
                                    onChange={(e) => setMiddleName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Place of Birth (Locus)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Lipa City, Batangas"
                                    value={placeOfBirth}
                                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    {isBaptism ? 'Legitimacy (Legitimitas)' : 'Age (Aetas)'}
                                </label>
                                {isBaptism ? (
                                    <select
                                        value={legitimacy}
                                        onChange={(e) => setLegitimacy(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    >
                                        <option value="LEG.">LEG. (Legitimate)</option>
                                        <option value="NAT.">NAT. (Natural / Illegitimate)</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="e.g. 14"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 3: PARENTS & GODPARENTS / SPONSORS ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
                            <Users className="w-5 h-5 text-slate-600" />
                            <span>Parentum et Patrinorum (Parents &amp; Sponsors)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                                <input
                                    type="text"
                                    value={fatherName}
                                    onChange={(e) => setFatherName(e.target.value)}
                                    placeholder="Father's full name"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Maiden Name</label>
                                <input
                                    type="text"
                                    value={motherName}
                                    onChange={(e) => setMotherName(e.target.value)}
                                    placeholder="Mother's full maiden name"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Parents' Residence / Address (Habitationis Locus)
                                </label>
                                <input
                                    type="text"
                                    value={parentsResidence}
                                    onChange={(e) => setParentsResidence(e.target.value)}
                                    placeholder="e.g. Inosluban, Lipa City, Batangas"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Parents' Place of Origin (Originis Locus)
                                </label>
                                <input
                                    type="text"
                                    value={parentsOrigin}
                                    onChange={(e) => setParentsOrigin(e.target.value)}
                                    placeholder="e.g. Lipa City, Batangas"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Godparents / Sponsors (Patrinorum) *
                            </label>
                            <input
                                type="text"
                                value={godparents}
                                onChange={(e) => setGodparents(e.target.value)}
                                placeholder="e.g. Red Jenn Lee T. Gasoc and Rosemarie D. Villena"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                            />
                        </div>

                        {isBaptism && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Godparents' Address (Patrinorum Habitationis Locus)
                                </label>
                                <input
                                    type="text"
                                    value={godparentsResidence}
                                    onChange={(e) => setGodparentsResidence(e.target.value)}
                                    placeholder="Godparents' home address"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>
                        )}

                        {isConfirmation && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Parish of Baptism (Parochia)
                                    </label>
                                    <input
                                        type="text"
                                        value={parishOfBaptism}
                                        onChange={(e) => setParishOfBaptism(e.target.value)}
                                        placeholder="Church of baptism"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Province of Baptism (Provincia)
                                    </label>
                                    <input
                                        type="text"
                                        value={provinceOfBaptism}
                                        onChange={(e) => setProvinceOfBaptism(e.target.value)}
                                        placeholder="Province"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Place of Baptism (Locus Baptismi)
                                    </label>
                                    <input
                                        type="text"
                                        value={placeOfBaptism}
                                        onChange={(e) => setPlaceOfBaptism(e.target.value)}
                                        placeholder="City / Municipality"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── SECTION 4: SACRAMENT DATE, OFFICIATING CLERGY & STIPEND ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
                            <Calendar className="w-5 h-5 text-slate-600" />
                            <span>Date, Officiating Minister &amp; Stipend</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Date of Sacrament *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Select Officiating Clergy
                                </label>
                                <select
                                    value={clergyId}
                                    onChange={(e) => {
                                        setClergyId(e.target.value);
                                        const found = clergy.find((c) => String(c.id) === e.target.value);
                                        if (found) {
                                            setMinisterName(`${found.title || 'Rev. Fr.'} ${found.first_name} ${found.last_name}`);
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                >
                                    <option value="">— Select from Active Clergy —</option>
                                    {clergy.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title || 'Fr.'} {c.first_name} {c.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Minister Name (Nomen Ministri)
                                </label>
                                <input
                                    type="text"
                                    value={ministerName}
                                    onChange={(e) => setMinisterName(e.target.value)}
                                    placeholder="e.g. Rev. Fr. Aren Bejasa, OSJ"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">₱ Pesos</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={stipendPesos}
                                        onChange={(e) => setStipendPesos(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Cts</label>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        value={stipendCts}
                                        onChange={(e) => setStipendCts(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Observanda (Canonical Observations / Marginal Notes)
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Marginal canonical notes or rectifications..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* ── Modal Footer Actions ── */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <a
                            href={`/certificate-templates/preview?sacrament_type=${record.sacrament_type}&record_id=${record.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Preview / Print Certificate</span>
                        </a>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-sm text-sm cursor-pointer"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isSubmitting ? 'Saving...' : 'Save & Inscribe in Book'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
