import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: string;
    citation?: string;
}

interface FaqAccordionProps {
    items: FaqItem[];
    className?: string;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items, className = '' }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {items.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-amber-400/60"
                    >
                        <button
                            type="button"
                            onClick={() => toggle(idx)}
                            className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            aria-expanded={isOpen}
                        >
                            <span className="font-medium text-slate-900 text-sm sm:text-base pr-2">
                                {item.question}
                            </span>
                            <ChevronDown
                                className={`w-5 h-5 text-amber-600 shrink-0 transition-transform duration-300 ease-in-out ${
                                    isOpen ? 'rotate-180 text-amber-500' : ''
                                }`}
                            />
                        </button>

                        <div
                            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                            style={{
                                gridTemplateRows: isOpen ? '1fr' : '0fr',
                            }}
                        >
                            <div className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                                    <p>{item.answer}</p>
                                    {item.citation && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                            <span>Canonical Handle:</span>
                                            <span className="font-semibold">{item.citation}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FaqAccordion;
