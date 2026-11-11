import React, { useMemo, useState } from 'react';
import { Clergy } from '@/types';
import { User, Search, Sparkles, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

interface ClergySelectorProps {
    clergy: Clergy[];
    selectedClergyId: string | number | null;
    onSelectClergyId: (id: string) => void;
    guestPriestName?: string;
    onChangeGuestPriestName?: (name: string) => void;
    label?: string;
    subtitle?: string;
    showManualEntry?: boolean;
    error?: string;
    guestError?: string;
}

export default function ClergySelector({
    clergy = [],
    selectedClergyId,
    onSelectClergyId,
    guestPriestName = '',
    onChangeGuestPriestName,
    label = 'Paring Magmimisa (Presiding Clergy)',
    subtitle = 'Piliin ang nais na pari o maglagay ng visiting priest para sa serbisyo',
    showManualEntry = true,
    error,
    guestError,
}: ClergySelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const getClergyCategoryKey = (c: Clergy): string => {
        const cat = (c.category || '').toLowerCase();
        const title = (c.title || '').toLowerCase();
        const suffix = (c.suffix || '').toLowerCase();

        if (cat.includes('bishop') || title === 'archbishop' || title === 'bishop') return 'bishops';
        if (cat.includes('monsignor') || title === 'monsignor') return 'monsignors';
        if (cat.includes('religious') || suffix.includes('osj') || suffix.includes('sdb') || suffix.includes('ofm')) return 'religious';
        return 'priests';
    };

    // Filtered list for real-time search
    const filteredClergy = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return clergy.filter(c => {
            const fullName = (c.full_name || '').toLowerCase();
            const titledName = (c.titled_name || '').toLowerCase();
            const lastName = (c.last_name || '').toLowerCase();
            const category = (c.category || '').toLowerCase();
            return fullName.includes(q) || titledName.includes(q) || lastName.includes(q) || category.includes(q);
        });
    }, [clergy, searchQuery]);

    // Group all clergy for optgroup
    const groupedClergy = useMemo(() => {
        const groups: Record<string, Clergy[]> = {
            'Bishops (Most Reverend)': [],
            'Monsignors (Reverend Monsignor)': [],
            'Religious Order Priests': [],
            'Priests (Reverend Father)': [],
        };

        clergy.forEach(c => {
            const catKey = getClergyCategoryKey(c);
            if (catKey === 'bishops') groups['Bishops (Most Reverend)'].push(c);
            else if (catKey === 'monsignors') groups['Monsignors (Reverend Monsignor)'].push(c);
            else if (catKey === 'religious') groups['Religious Order Priests'].push(c);
            else groups['Priests (Reverend Father)'].push(c);
        });

        return groups;
    }, [clergy]);

    const isOtherSelected = selectedClergyId === 'other';
    const selectedClergyObj = useMemo(() => {
        if (!selectedClergyId || selectedClergyId === 'other') return null;
        return clergy.find(c => c.id.toString() === selectedClergyId.toString()) || null;
    }, [clergy, selectedClergyId]);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                    <h3 className="font-serif text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        {label}
                    </h3>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
                {selectedClergyId && (
                    <button
                        type="button"
                        onClick={() => {
                            onSelectClergyId('');
                            onChangeGuestPriestName?.('');
                        }}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg transition-colors"
                    >
                        <X className="w-3 h-3" /> Tanggalin ang Pagpili (Clear)
                    </button>
                )}
            </div>

            {/* Currently Selected Indicator Badge */}
            {selectedClergyObj && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-950">
                    <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">Napiling Pari / Officiating Clergy:</span>
                            <span className="font-bold text-slate-900">{selectedClergyObj.titled_name}</span>
                            <span className="text-slate-500 text-[11px] ml-1.5">({selectedClergyObj.category || 'Clergy'})</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectClergyId('')}
                        className="text-xs text-slate-400 hover:text-slate-700 p-1"
                        title="Remove selection"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Real-time Name Search Input */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                    Mabilisang Paghahanap ng Pari / Real-time Clergy Search
                </label>
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Mag-type ng pangalan ng pari (hal. Garcera, Mandanas, Rosal, Dimaculangan)..."
                        className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-8 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Real-time Search Quick Click Suggestions */}
            {searchQuery.trim() !== '' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Mga Mungkahing Pari / Quick Click Suggestions ({filteredClergy.length}):
                        </span>
                        <span className="text-[10px] text-amber-700">I-click ang pangalan upang piliin</span>
                    </div>

                    {filteredClergy.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {filteredClergy.map(c => {
                                const isSelected = selectedClergyId?.toString() === c.id.toString();
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectClergyId(c.id.toString());
                                            setSearchQuery('');
                                        }}
                                        className={`text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-2xs'
                                                : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-100/50'
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <span className="block truncate font-bold text-slate-900">{c.titled_name}</span>
                                            <span className={`text-[10px] block truncate ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                                                {c.category || 'Clergy'}
                                            </span>
                                        </div>
                                        {isSelected ? (
                                            <Check className="w-4 h-4 shrink-0 text-white" />
                                        ) : (
                                            <span className="text-[10px] font-semibold text-amber-700 shrink-0 opacity-0 group-hover:opacity-100">
                                                Piliin
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-600 py-2.5 text-center bg-white rounded-lg border border-slate-200">
                            Walang nahanap na opisyal na pari sa pangalang &ldquo;{searchQuery}&rdquo;.
                            {showManualEntry && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectClergyId('other');
                                        onChangeGuestPriestName?.(searchQuery);
                                        setSearchQuery('');
                                    }}
                                    className="block mx-auto mt-1.5 text-amber-700 font-bold hover:underline"
                                >
                                    Gamitin bilang Manual Entry para sa Visiting Priest &rarr;
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Dropdown Selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                    O Pumili sa Buong Talaan ng Arkidiyosesis (Full Directory Dropdown)
                </label>
                <select
                    value={selectedClergyId ? selectedClergyId.toString() : ''}
                    onChange={e => {
                        const val = e.target.value;
                        onSelectClergyId(val);
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-amber-500 font-medium ${
                        error ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                    }`}
                >
                    <option value="">-- Walang Partikular na Pinipili (Itatalaga ng Parokya / No Preference) --</option>
                    
                    {/* Render Grouped Optgroups */}
                    {Object.entries(groupedClergy).map(([groupTitle, list]) => {
                        if (list.length === 0) return null;
                        return (
                            <optgroup key={groupTitle} label={groupTitle}>
                                {list.map(c => (
                                    <option key={c.id} value={c.id.toString()}>
                                        {c.titled_name}
                                    </option>
                                ))}
                            </optgroup>
                        );
                    })}

                    {showManualEntry && (
                        <optgroup label="Iba Pang Pari / Manual Entry">
                            <option value="other">-- Iba Pang Pari / Visiting Priest (Maglagay ng Pangalan) --</option>
                        </optgroup>
                    )}
                </select>
                {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
            </div>

            {/* Manual Entry Field when "other" is chosen */}
            {isOtherSelected && (
                <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-4 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <User className="w-4 h-4 text-amber-600" />
                        <span>Manual Entry: Pangalan ng Nais na Pari (Visiting / Guest Priest)</span>
                    </div>
                    <div>
                        <input
                            type="text"
                            value={guestPriestName}
                            onChange={e => onChangeGuestPriestName?.(e.target.value)}
                            required={isOtherSelected}
                            placeholder="Hal. Rev. Fr. Juan Dela Cruz, SDB o Most Rev. Teodoro Bacani"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                        />
                        <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                            Maaaring magpalista ng paring hindi pa kasama sa listahan (hal. kamag-anak, kakilalang pari, o visiting priest mula sa ibang diyosesis o religious order). Kapag kinumpirma ng tanggapan ng parokya ang iskedyul, opisyal na ring maidadagdag ang paring ito sa talaan.
                        </p>
                    </div>
                    {guestError && <p className="text-xs text-rose-500 mt-1 font-semibold">{guestError}</p>}
                </div>
            )}

            {/* Canonical Reminder / Disclaimer */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                    <span className="font-bold block">Mahalagang Paalala ukol sa Piniling Pari:</span>
                    <span>
                        Ang pagpili ng pari ay isang <em>kahilingan (preference)</em> lamang. Ito ay <strong>sasailalim pa sa kumpirmasyon (subject for confirmation)</strong> batay sa opisyal na iskedyul, availability, at mga tungkulin ng pari sa parokya o arkidiyosesis.
                    </span>
                </div>
            </div>
        </div>
    );
}
