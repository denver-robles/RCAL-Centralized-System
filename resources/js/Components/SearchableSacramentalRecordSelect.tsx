import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SacramentalRecord } from '@/types';
import { Search, ChevronDown, Check, X, BookOpen, Calendar, User, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Props {
    records: SacramentalRecord[];
    value: number | string | null;
    onChange: (recordId: string) => void;
    sacramentType: 'baptism' | 'confirmation';
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function SearchableSacramentalRecordSelect({
    records = [],
    value,
    onChange,
    sacramentType,
    placeholder = '— Search or select a record to auto-populate —',
    className = '',
    disabled = false,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [remoteRecords, setRemoteRecords] = useState<SacramentalRecord[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Merge initial records with any remotely fetched records, keyed by ID
    const allRecordsMap = useMemo(() => {
        const map = new Map<number, SacramentalRecord>();
        records.forEach((r) => map.set(r.id, r));
        remoteRecords.forEach((r) => map.set(r.id, r));
        return map;
    }, [records, remoteRecords]);

    const allRecordsList = useMemo(() => Array.from(allRecordsMap.values()), [allRecordsMap]);

    // Current selected record object
    const selectedRecord = useMemo(() => {
        if (!value) return null;
        const numId = Number(value);
        return allRecordsMap.get(numId) || records.find((r) => r.id === numId) || null;
    }, [allRecordsMap, records, value]);

    // Local client-side filtered results
    const filteredRecords = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return allRecordsList;

        return allRecordsList.filter((r) => {
            const name = r.person?.full_name?.toLowerCase() || '';
            const citation = r.citation?.toLowerCase() || '';
            const book = String(r.book_number || '');
            const page = String(r.page_number || '');
            const line = String(r.line_number || '');
            const parents = (r.person?.father_name || '') + ' ' + (r.person?.mother_name || '');

            return (
                name.includes(q) ||
                citation.includes(q) ||
                book.includes(q) ||
                page.includes(q) ||
                line.includes(q) ||
                parents.toLowerCase().includes(q)
            );
        });
    }, [allRecordsList, searchQuery]);

    // Async server search when query is typed (debounced 300ms)
    useEffect(() => {
        const q = searchQuery.trim();
        if (!q || q.length < 2) return;

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await axios.get('/certificate-templates/search-records', {
                    params: {
                        sacrament_type: sacramentType,
                        q,
                    },
                });
                if (response.data && Array.isArray(response.data.records)) {
                    setRemoteRecords(response.data.records);
                }
            } catch (err) {
                console.error('Failed to search records:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, sacramentType]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        } else if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSelect = (rec: SacramentalRecord | null) => {
        onChange(rec ? String(rec.id) : '');
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* The Clickable Trigger Input */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!disabled) setIsOpen(!isOpen);
                    }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 border rounded-xl text-sm transition-all cursor-pointer ${
                    disabled
                        ? 'opacity-60 bg-slate-100 cursor-not-allowed border-slate-200'
                        : isOpen
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
            >
                <div className="flex items-center gap-2.5 truncate mr-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    {selectedRecord ? (
                        <div className="truncate text-left">
                            <span className="font-bold text-slate-900">
                                {selectedRecord.person?.full_name || `Record #${selectedRecord.id}`}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 font-mono">
                                ({selectedRecord.citation || `Book ${selectedRecord.book_number}, Page ${selectedRecord.page_number}`})
                            </span>
                        </div>
                    ) : (
                        <span className="text-slate-400 truncate">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {selectedRecord && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition"
                            title="Clear auto-population (use sample data)"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isOpen ? 'transform rotate-180' : ''
                        }`}
                    />
                </div>
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-[340px] max-w-[500px]">
                    {/* Search Input Box */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by recipient name, citation, book/page..."
                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                            {isSearching ? (
                                <Loader2 className="absolute right-2.5 w-4 h-4 text-amber-500 animate-spin" />
                            ) : searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {/* Option: Sample Data / Reset */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelect(null)}
                            className={`p-3 text-left hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition ${
                                !selectedRecord ? 'bg-amber-50/60 font-bold text-amber-900' : 'text-slate-600'
                            }`}
                        >
                            <div>
                                <span className="font-semibold text-slate-700">Use Sample Template Data</span>
                                <p className="text-2xs text-slate-400 mt-0.5">Reset fields to standard RCAL preview placeholders</p>
                            </div>
                            {!selectedRecord && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </div>

                        {filteredRecords.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                {isSearching ? 'Searching records...' : `No ${sacramentType} records match "${searchQuery}"`}
                            </div>
                        ) : (
                            filteredRecords.map((r) => {
                                const isSelected = selectedRecord?.id === r.id;
                                const father = r.person?.father_name;
                                const mother = r.person?.mother_name;
                                const parents = father && mother ? `${father} & ${mother}` : father || mother || '';

                                return (
                                    <div
                                        key={r.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelect(r)}
                                        className={`p-3 text-left hover:bg-amber-50/40 cursor-pointer flex items-center justify-between gap-3 text-xs transition ${
                                            isSelected ? 'bg-amber-50/80' : ''
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 truncate">
                                                    {r.person?.full_name || `Record #${r.id}`}
                                                </span>
                                                <span className="shrink-0 px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                    {r.citation || `Book ${r.book_number}, P.${r.page_number}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-2xs text-slate-500 mt-1">
                                                {r.event_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        {r.event_date}
                                                    </span>
                                                )}
                                                {parents && (
                                                    <span className="flex items-center gap-1 truncate max-w-[200px]" title={parents}>
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        {parents}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <Check className="w-4 h-4 text-amber-600 shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom Status bar */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-2xs text-slate-400 flex items-center justify-between">
                        <span>Showing {filteredRecords.length} records</span>
                        <span className="italic">Type to search database</span>
                    </div>
                </div>
            )}
        </div>
    );
}
