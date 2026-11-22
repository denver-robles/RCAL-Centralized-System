import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChartOfAccount, AccountType } from '@/types';
import { Search, ChevronDown, Check, X, Tag } from 'lucide-react';

interface Props {
    accounts: ChartOfAccount[];
    value: number | '';
    onChange: (account: ChartOfAccount | null) => void;
    placeholder?: string;
    filterTypes?: AccountType[];
    preferredTypes?: AccountType[];
    className?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
}

export default function SearchableAccountSelect({
    accounts = [],
    value,
    onChange,
    placeholder = '-- Search or select account --',
    filterTypes,
    className = '',
    disabled = false,
    id,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Selected account object
    const selectedAccount = useMemo(
        () => accounts.find(a => a.id === value) || null,
        [accounts, value]
    );

    // Filter accounts by allowed types first
    const candidateAccounts = useMemo(() => {
        if (!filterTypes || filterTypes.length === 0) return accounts;
        return accounts.filter(a => filterTypes.includes(a.type));
    }, [accounts, filterTypes]);

    // Available categories in the candidate list
    const availableTypes = useMemo(() => {
        const types = new Set<string>();
        candidateAccounts.forEach(a => types.add(a.type));
        return Array.from(types);
    }, [candidateAccounts]);

    // Filtered by search query and type pill
    const filteredAccounts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return candidateAccounts.filter(acc => {
            if (activeTypeFilter !== 'all' && acc.type !== activeTypeFilter) {
                return false;
            }

            if (!q) return true;

            const codeMatch = acc.code.toLowerCase().includes(q);
            const titleMatch = acc.title.toLowerCase().includes(q);
            const typeMatch = acc.type.toLowerCase().includes(q);

            return codeMatch || titleMatch || typeMatch;
        });
    }, [candidateAccounts, searchQuery, activeTypeFilter]);

    // Limit to 30 visible items to prevent DOM sluggishness with 200+ accounts
    const visibleAccounts = useMemo(() => {
        return filteredAccounts.slice(0, 30);
    }, [filteredAccounts]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

    const handleSelect = (account: ChartOfAccount) => {
        onChange(account);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const formatCurrency = (val?: number | string | null) => {
        if (val === undefined || val === null || val === '') return null;
        const num = Number(val);
        if (isNaN(num) || num <= 0) return null;
        return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'revenue':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'expense':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'asset':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'liability':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'equity':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* The Clickable Trigger Input */}
            <div
                id={id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!disabled) setIsOpen(true);
                    }
                }}
                className={`w-full flex items-center justify-between text-left text-xs sm:text-sm rounded-xl border transition-all py-2 px-3 bg-white ${
                    disabled
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isOpen
                        ? 'border-amber-500 ring-2 ring-amber-500/20 cursor-pointer shadow-xs'
                        : 'border-slate-300 hover:border-slate-400 cursor-pointer'
                }`}
            >
                <div className="flex-1 min-w-0 pr-1">
                    {selectedAccount ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs shrink-0">
                                {selectedAccount.code}
                            </span>
                            <span className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                                {selectedAccount.title}
                            </span>
                            {selectedAccount.default_amount && (
                                <span className="font-mono text-2xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                    {formatCurrency(selectedAccount.default_amount)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs sm:text-sm truncate block">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                    {selectedAccount && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Clear selected account"
                            className="p-1 hover:text-slate-600 rounded-md transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
                    />
                </div>
            </div>

            {/* The Dropdown Menu with Live Search Filter */}
            {isOpen && (
                <div className="absolute z-60 left-0 mt-1.5 w-full sm:w-[380px] max-w-[95vw] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Field Header */}
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-1.5">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search by code or title (e.g. 4201, Baptism)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full text-xs sm:text-sm pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Category filter pills if multiple types exist */}
                        {availableTypes.length > 1 && (
                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-3xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTypeFilter('all')}
                                    className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                                        activeTypeFilter === 'all'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    All ({candidateAccounts.length})
                                </button>
                                {availableTypes.map(t => {
                                    const count = candidateAccounts.filter(a => a.type === t).length;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setActiveTypeFilter(t)}
                                            className={`px-2 py-0.5 rounded font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                                activeTypeFilter === t
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {t} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Results List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {visibleAccounts.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-500">
                                <Tag className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                                <p className="font-semibold text-slate-700">No matching accounts found</p>
                                <p className="text-3xs text-slate-400 mt-0.5">
                                    Try searching with a code like 4201 or keyword like "Mass"
                                </p>
                            </div>
                        ) : (
                            visibleAccounts.map(acc => {
                                const isSelected = acc.id === value;
                                const defaultPrice = formatCurrency(acc.default_amount);

                                return (
                                    <div
                                        key={acc.id}
                                        onClick={() => handleSelect(acc)}
                                        className={`p-2.5 text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-amber-50 text-slate-900 font-semibold'
                                                : 'hover:bg-slate-50 text-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs shrink-0">
                                                {acc.code}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-xs sm:text-sm">{acc.title}</p>
                                                <span
                                                    className={`inline-block text-3xs font-semibold px-1 py-0.2 rounded border uppercase mt-0.5 ${getTypeBadgeClass(
                                                        acc.type
                                                    )}`}
                                                >
                                                    {acc.type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {defaultPrice && (
                                                <span className="font-mono text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    {defaultPrice}
                                                </span>
                                            )}
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer count */}
                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-3xs text-slate-500 flex justify-between items-center">
                        <span>
                            {filteredAccounts.length > 30
                                ? `Showing top 30 of ${filteredAccounts.length} matches`
                                : `${filteredAccounts.length} accounts`}
                        </span>
                        <span>Archdiocese of Lipa</span>
                    </div>
                </div>
            )}
        </div>
    );
}
